"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { randomBytes } from "crypto";
import { sendEmailWithGmail } from "@/lib/email/sender";
import bcrypt from "bcryptjs";

// Helper to get current workspace
export async function getCurrentWorkspace() {
    const session = await auth();
    if (!session?.user?.email) return null;

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: {
            ownedWorkspaces: {
                include: {
                    subscription: true,
                    _count: {
                        select: { members: true }
                    }
                }
            },
        },
    });

    if (!user) return null;

    // For now, we only support single workspace, so return the first (and only) workspace
    return user.ownedWorkspaces[0] || null;
}

// Helper to get user's role in their workspace
export async function getUserWorkspaceRole() {
    const session = await auth();
    if (!session?.user?.email) return null;

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: {
            ownedWorkspaces: {
                select: { id: true }
            },
            memberships: {
                select: {
                    role: true,
                    workspaceId: true,
                }
            }
        },
    });

    if (!user) return null;

    // If user owns a workspace, they are OWNER
    if (user.ownedWorkspaces.length > 0) {
        return { role: 'OWNER' as const, workspaceId: user.ownedWorkspaces[0].id };
    }

    // Otherwise, check if they are a member of a workspace
    if (user.memberships.length > 0) {
        const membership = user.memberships[0]; // For now, single workspace
        return { role: membership.role, workspaceId: membership.workspaceId };
    }

    return null;
}

export async function getWorkspaceWithMembers() {
    const session = await auth();
    if (!session?.user?.email) return null;

    const workspace = await getCurrentWorkspace();
    if (!workspace) return null;

    return await prisma.workspace.findUnique({
        where: { id: workspace.id },
        include: {
            owner: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    photoUrl: true,
                }
            },
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            photoUrl: true,
                        }
                    }
                },
                orderBy: {
                    joinedAt: 'desc'
                }
            },
            invitations: {
                where: {
                    status: 'PENDING',
                    expiresAt: {
                        gt: new Date()
                    }
                },
                include: {
                    inviter: {
                        select: {
                            name: true,
                            email: true,
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            },
            subscription: true,
            _count: {
                select: {
                    contacts: true,
                    companies: true,
                    deals: true,
                }
            }
        },
    });
}

const WorkspaceSchema = z.object({
    name: z.string().min(1, "Workspace name is required"),
    legalName: z.string().optional(),
    rnc: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    logoUrl: z.string().optional(),
});

export type WorkspaceState = {
    errors?: {
        name?: string[];
    };
    message?: string;
};

export async function updateWorkspace(prevState: WorkspaceState | undefined, formData: FormData): Promise<WorkspaceState> {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    const workspace = await getCurrentWorkspace();
    if (!workspace) {
        return { message: "Workspace not found." };
    }

    const rawData = {
        name: formData.get("name"),
        legalName: formData.get("legalName") || undefined,
        rnc: formData.get("rnc") || undefined,
        address: formData.get("address") || undefined,
        phone: formData.get("phone") || undefined,
        logoUrl: formData.get("logoUrl") || undefined,
    };

    const validatedFields = WorkspaceSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Invalid workspace data.",
        };
    }

    try {
        await prisma.workspace.update({
            where: { id: workspace.id },
            data: {
                name: validatedFields.data.name,
                legalName: validatedFields.data.legalName,
                rnc: validatedFields.data.rnc,
                address: validatedFields.data.address,
                phone: validatedFields.data.phone,
                logoUrl: validatedFields.data.logoUrl,
            },
        });

        revalidatePath("/app/settings");
        return { message: "Workspace updated successfully." };
    } catch (error) {
        console.error("Database Error:", error);
        return { message: "Database Error: Failed to update workspace." };
    }
}

// Invitation actions
const InvitationSchema = z.object({
    email: z.string().email("Invalid email address"),
    role: z.enum(["MEMBER", "ADMIN", "VIEWER"]),
});

export type InvitationState = {
    errors?: {
        email?: string[];
        role?: string[];
    };
    message?: string;
};

export type AcceptInvitationState = {
    errors?: {
        password?: string[];
        confirmPassword?: string[];
    };
    message?: string;
    success?: boolean;
};

export async function sendInvitation(prevState: InvitationState | undefined, formData: FormData): Promise<InvitationState> {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    const workspace = await getWorkspaceWithMembers();
    if (!workspace) {
        return { message: "Workspace not found." };
    }

    // Check member limit (owner + members)
    const currentMemberCount = workspace.members.length + 1; // +1 for owner
    if (currentMemberCount >= 5) {
        return { message: "Member limit reached. You can only have up to 5 members on the FREE plan." };
    }

    const rawData = {
        email: formData.get("email"),
        role: formData.get("role"),
    };

    const validatedFields = InvitationSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Invalid invitation data.",
        };
    }

    // Check if user already exists in workspace
    const existingMember = workspace.members.find(m => m.user.email === validatedFields.data.email);
    if (existingMember) {
        return { message: "This user is already a member of this workspace." };
    }

    // Check if there's a pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
        where: {
            workspaceId: workspace.id,
            email: validatedFields.data.email,
            status: 'PENDING',
            expiresAt: {
                gt: new Date()
            }
        }
    });

    if (existingInvitation) {
        return { message: "An invitation has already been sent to this email." };
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email }
    });

    if (!user) {
        return { message: "User not found." };
    }

    try {
        // Generate token
        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        await prisma.invitation.create({
            data: {
                workspaceId: workspace.id,
                email: validatedFields.data.email,
                role: validatedFields.data.role,
                token,
                invitedBy: user.id,
                expiresAt,
            },
        });

        // Enviar correo si el usuario tiene email configurado
        let emailNotice = "";
        if (user.emailConfigured && user.emailFromAddress && user.emailPassword) {
            const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
            const invitationLink = `${baseUrl}/invitations/${token}`;
            const emailResult = await sendEmailWithGmail({
                userId: user.id,
                to: validatedFields.data.email,
                subject: "Invitación a NEARBY (equipo interno)",
                body: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #2d3e50;">¡Hola!</h2>
                        <p>Has sido invitado a unirte al equipo interno de NEARBY.</p>
                        <p>Haz clic en el siguiente enlace para crear tu contraseña y aceptar la invitación:</p>
                        <p style="margin: 30px 0;">
                            <a href="${invitationLink}" 
                               style="background-color: #fc5a34; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                Aceptar invitación
                            </a>
                        </p>
                        <p style="color: #666; font-size: 14px;">Este enlace expira en 7 días.</p>
                        <p style="color: #666; font-size: 14px;">Si no esperabas este email, puedes ignorarlo.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="color: #999; font-size: 12px;">NEARBY</p>
                    </div>
                `,
            });
            if (!emailResult.success) {
                emailNotice = " (la invitación se creó, pero el correo no pudo enviarse)";
            }
        } else {
            emailNotice = " (la invitación se creó, pero el correo no está configurado)";
        }

        revalidatePath("/app/settings");
        return { message: `Invitación enviada a ${validatedFields.data.email}${emailNotice}` };
    } catch (error) {
        console.error("Database Error:", error);
        return { message: "Database Error: Failed to send invitation." };
    }
}

const AcceptInvitationSchema = z.object({
    token: z.string().min(1, "Token inválido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirmPassword: z.string().min(6, "Confirma tu contraseña"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
});

export async function acceptInternalInvitation(
    prevState: AcceptInvitationState | undefined,
    formData: FormData
): Promise<AcceptInvitationState> {
    const validatedFields = AcceptInvitationSchema.safeParse({
        token: formData.get("token"),
        password: formData.get("password"),
        confirmPassword: formData.get("confirmPassword"),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Datos inválidos. Revisa los campos.",
            success: false,
        };
    }

    const { token, password } = validatedFields.data;

    const invitation = await prisma.invitation.findUnique({
        where: { token },
    });

    if (!invitation) {
        return { message: "Invitación no encontrada.", success: false };
    }

    if (invitation.status !== "PENDING") {
        return { message: "Esta invitación ya fue utilizada o revocada.", success: false };
    }

    if (invitation.expiresAt < new Date()) {
        await prisma.invitation.update({
            where: { id: invitation.id },
            data: { status: "EXPIRED" },
        });
        return { message: "Esta invitación ha expirado.", success: false };
    }

    const existingUser = await prisma.user.findUnique({
        where: { email: invitation.email },
    });
    if (existingUser) {
        return { message: "Este usuario ya existe. Inicia sesión.", success: false };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const defaultName = invitation.email.split("@")[0] || "Usuario";

    await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                name: defaultName,
                email: invitation.email,
                passwordHash: hashedPassword,
                userType: "INTERNAL",
            },
        });

        await tx.workspaceMember.create({
            data: {
                workspaceId: invitation.workspaceId,
                userId: user.id,
                role: invitation.role,
            },
        });

        await tx.invitation.update({
            where: { id: invitation.id },
            data: { status: "ACCEPTED" },
        });
    });

    revalidatePath("/app/settings");
    redirect("/login");
}

export async function revokeInvitation(invitationId: string) {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    try {
        await prisma.invitation.update({
            where: { id: invitationId },
            data: { status: 'REVOKED' },
        });

        revalidatePath("/app/settings");
        return { success: true, message: "Invitation revoked successfully." };
    } catch (error) {
        console.error("Database Error:", error);
        return { success: false, message: "Failed to revoke invitation." };
    }
}

export async function removeMember(memberId: string) {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    try {
        await prisma.workspaceMember.delete({
            where: { id: memberId },
        });

        revalidatePath("/app/settings");
        return { success: true, message: "Member removed successfully." };
    } catch (error) {
        console.error("Database Error:", error);
        return { success: false, message: "Failed to remove member." };
    }
}

export async function acceptInvitation(token: string) {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    const invitation = await prisma.invitation.findUnique({
        where: { token },
        include: { workspace: true }
    });

    if (!invitation) {
        return { success: false, message: "Invitation not found." };
    }

    if (invitation.status !== 'PENDING') {
        return { success: false, message: "This invitation is no longer valid." };
    }

    if (invitation.expiresAt < new Date()) {
        await prisma.invitation.update({
            where: { id: invitation.id },
            data: { status: 'EXPIRED' }
        });
        return { success: false, message: "This invitation has expired." };
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email }
    });

    if (!user) {
        return { success: false, message: "User not found." };
    }

    try {
        // Create workspace member
        await prisma.workspaceMember.create({
            data: {
                workspaceId: invitation.workspaceId,
                userId: user.id,
                role: invitation.role,
            },
        });

        // Mark invitation as accepted
        await prisma.invitation.update({
            where: { id: invitation.id },
            data: { status: 'ACCEPTED' }
        });

        revalidatePath("/app");
        return { success: true, message: "You have successfully joined the workspace!" };
    } catch (error) {
        console.error("Database Error:", error);
        return { success: false, message: "Failed to accept invitation." };
    }
}

export async function updateContractTemplate(content: string, version: string) {
    const session = await auth();
    if (!session?.user?.email) {
        return { error: "No autorizado" };
    }

    const workspace = await getCurrentWorkspace();
    if (!workspace) {
        return { error: "Workspace no encontrado" };
    }

    try {
        await prisma.workspace.update({
            where: { id: workspace.id },
            data: {
                contractTemplate: content,
                contractVersion: version,
            },
        });

        revalidatePath("/app/settings");
        return { success: true };
    } catch (error) {
        console.error("Database Error:", error);
        return { error: "Error al guardar el contrato" };
    }
}

export async function getContractTemplate() {
    const session = await auth();
    if (!session?.user?.email) return null;

    const workspace = await getCurrentWorkspace();
    if (!workspace) return null;

    return {
        template: workspace.contractTemplate,
        version: workspace.contractVersion,
    };
}

