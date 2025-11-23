"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { randomBytes } from "crypto";

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

        revalidatePath("/app/settings");
        return { message: `Invitation sent successfully to ${validatedFields.data.email}` };
    } catch (error) {
        console.error("Database Error:", error);
        return { message: "Database Error: Failed to send invitation." };
    }
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

