"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentWorkspace } from "./workspace";
import { sendEmailWithGmail } from "@/lib/email/sender";

interface BillingConfigData {
    enabled: boolean;
    emailsCC: string | null;
    emailsBCC: string | null;
    emailSubject: string | null;
    emailBody: string | null;
    fromUserId: string | null;
}

type WorkspaceUserEmailConfig = {
    emailConfigured: boolean;
    emailFromAddress: string | null;
    emailFromName: string | null;
    emailPassword: string | null;
};

async function ensureAdminAccess() {
    const session = await auth();
    if (!session?.user?.email) {
        return { error: "No autorizado" as const };
    }

    const workspace = await getCurrentWorkspace();
    if (!workspace) {
        return { error: "Workspace no encontrado" as const };
    }

    const member = await prisma.workspaceMember.findFirst({
        where: {
            workspaceId: workspace.id,
            user: { email: session.user.email },
        },
        select: { role: true },
    });

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });

    const isOwner = workspace.ownerId === user?.id;
    const isAdmin = member?.role === "ADMIN" || member?.role === "OWNER";

    if (!isOwner && !isAdmin) {
        return { error: "No tienes permisos para modificar esta configuración" as const };
    }

    return { session, workspace, user };
}

export async function updateBillingConfig(data: BillingConfigData) {
    const access = await ensureAdminAccess();
    if ("error" in access) {
        return { error: access.error };
    }
    const { workspace } = access;

    try {
        if (data.fromUserId) {
            const belongsToWorkspace = await prisma.workspaceMember.findFirst({
                where: {
                    workspaceId: workspace.id,
                    userId: data.fromUserId,
                },
                select: { id: true },
            });
            const isOwnerUser = workspace.ownerId === data.fromUserId;

            if (!belongsToWorkspace && !isOwnerUser) {
                return { error: "El usuario remitente no pertenece a este workspace" };
            }
        }

        await prisma.workspace.update({
            where: { id: workspace.id },
            data: {
                billingEnabled: data.enabled,
                billingEmailsCC: data.emailsCC,
                billingEmailsBCC: data.emailsBCC,
                billingEmailSubject: data.emailSubject,
                billingEmailBody: data.emailBody,
                billingFromUserId: data.fromUserId,
            },
        });

        revalidatePath("/app/settings");
        return { success: true };
    } catch (error) {
        console.error("Error updating billing config:", error);
        return { error: "Error al guardar la configuración" };
    }
}

export async function getBillingConfig() {
    const session = await auth();
    if (!session?.user?.email) return null;

    const workspace = await getCurrentWorkspace();
    if (!workspace) return null;

    const workspaceData = await prisma.workspace.findUnique({
        where: { id: workspace.id },
        select: {
            billingEnabled: true,
            billingEmailsCC: true,
            billingEmailsBCC: true,
            billingEmailSubject: true,
            billingEmailBody: true,
            billingFromUserId: true,
        },
    });

    return workspaceData;
}

export async function getWorkspaceUsersWithEmail() {
    const session = await auth();
    if (!session?.user?.email) return [];

    const workspace = await getCurrentWorkspace();
    if (!workspace) return [];

    // Get owner
    const owner = await prisma.user.findUnique({
        where: { id: workspace.ownerId },
        select: {
            id: true,
            name: true,
            email: true,
            emailConfigured: true,
        },
    });

    // Get members
    const members = await prisma.workspaceMember.findMany({
        where: { workspaceId: workspace.id },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    emailConfigured: true,
                },
            },
        },
    });

    const users = members.map(m => m.user);
    if (owner && !users.find(u => u.id === owner.id)) {
        users.unshift(owner);
    }

    return users;
}

export async function getCurrentBillingSenderEmailConfig(): Promise<WorkspaceUserEmailConfig | null> {
    const access = await ensureAdminAccess();
    if ("error" in access) return null;
    const { workspace } = access;

    if (!workspace.billingFromUserId) return null;

    const senderUser = await prisma.user.findUnique({
        where: { id: workspace.billingFromUserId },
        select: {
            emailConfigured: true,
            emailFromAddress: true,
            emailFromName: true,
            emailPassword: true,
        },
    });

    if (!senderUser) return null;

    return senderUser;
}

export async function getWorkspaceUserEmailConfig(userId: string): Promise<WorkspaceUserEmailConfig | null> {
    const access = await ensureAdminAccess();
    if ("error" in access) return null;
    const { workspace } = access;

    const belongsToWorkspace = await prisma.workspaceMember.findFirst({
        where: {
            workspaceId: workspace.id,
            userId,
        },
        select: { id: true },
    });
    const isOwner = workspace.ownerId === userId;

    if (!belongsToWorkspace && !isOwner) {
        return null;
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            emailConfigured: true,
            emailFromAddress: true,
            emailFromName: true,
            emailPassword: true,
        },
    });

    if (!user) return null;
    return user;
}

export async function updateWorkspaceUserEmailConfig(data: {
    userId: string;
    emailFromAddress: string;
    emailFromName: string;
    emailPassword: string;
}) {
    const access = await ensureAdminAccess();
    if ("error" in access) {
        return { error: access.error };
    }
    const { workspace } = access;

    const belongsToWorkspace = await prisma.workspaceMember.findFirst({
        where: {
            workspaceId: workspace.id,
            userId: data.userId,
        },
        select: { id: true },
    });
    const isOwner = workspace.ownerId === data.userId;

    if (!belongsToWorkspace && !isOwner) {
        return { error: "El usuario seleccionado no pertenece a este workspace" };
    }

    try {
        await prisma.user.update({
            where: { id: data.userId },
            data: {
                emailFromAddress: data.emailFromAddress,
                emailFromName: data.emailFromName,
                emailPassword: data.emailPassword,
                emailConfigured: true,
            },
        });

        revalidatePath("/app/settings");
        return { success: true };
    } catch (error) {
        console.error("Error updating sender email config:", error);
        return { error: "Error al guardar el correo remitente" };
    }
}

export async function testWorkspaceUserEmailConfig(userId: string) {
    const access = await ensureAdminAccess();
    if ("error" in access) {
        return { success: false, message: access.error };
    }
    const { session, workspace } = access;

    const belongsToWorkspace = await prisma.workspaceMember.findFirst({
        where: {
            workspaceId: workspace.id,
            userId,
        },
        select: { id: true },
    });
    const isOwner = workspace.ownerId === userId;

    if (!belongsToWorkspace && !isOwner) {
        return { success: false, message: "El usuario seleccionado no pertenece a este workspace" };
    }

    if (!session.user?.email) {
        return { success: false, message: "No autenticado" };
    }

    try {
        const result = await sendEmailWithGmail({
            userId,
            to: session.user.email,
            subject: "Prueba de correo - Facturación automática",
            body: "<p>Este es un correo de prueba para validar el remitente de facturación automática.</p>",
        });

        if (!result.success) {
            return { success: false, message: result.error || "No fue posible enviar el correo de prueba" };
        }

        return { success: true, message: "Correo de prueba enviado correctamente" };
    } catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : "No fue posible enviar el correo de prueba",
        };
    }
}

// Get contacts that receive invoices for a company
export async function getInvoiceRecipients(companyId: string) {
    const session = await auth();
    if (!session?.user?.email) return [];

    const workspace = await getCurrentWorkspace();
    if (!workspace) return [];

    const contacts = await prisma.contact.findMany({
        where: {
            companyId,
            workspaceId: workspace.id,
            receivesInvoices: true,
            email: { not: "" },
        },
        select: {
            id: true,
            fullName: true,
            email: true,
        },
    });

    return contacts;
}

// Get companies with billing due on a specific day
export async function getCompaniesDueForBilling(day: number) {
    const session = await auth();
    if (!session?.user?.email) return [];

    const workspace = await getCurrentWorkspace();
    if (!workspace) return [];

    const companies = await prisma.company.findMany({
        where: {
            workspaceId: workspace.id,
            status: "CLIENTE", // Only active clients
            subscriptionBilling: {
                billingDay: day,
            },
        },
        include: {
            subscriptionBilling: {
                include: {
                    items: true,
                },
            },
            contacts: {
                where: {
                    receivesInvoices: true,
                    email: { not: "" },
                },
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                },
            },
            projects: {
                where: { status: "ACTIVE" },
            },
            clientUsers: {
                where: { status: "ACTIVE" },
            },
        },
    });

    return companies;
}
