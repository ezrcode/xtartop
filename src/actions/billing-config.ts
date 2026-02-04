"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentWorkspace } from "./workspace";

interface BillingConfigData {
    enabled: boolean;
    emailsCC: string | null;
    emailsBCC: string | null;
    emailSubject: string | null;
    emailBody: string | null;
    fromUserId: string | null;
}

export async function updateBillingConfig(data: BillingConfigData) {
    const session = await auth();
    if (!session?.user?.email) {
        return { error: "No autorizado" };
    }

    const workspace = await getCurrentWorkspace();
    if (!workspace) {
        return { error: "Workspace no encontrado" };
    }

    // Verify user has admin permissions
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
        return { error: "No tienes permisos para modificar esta configuración" };
    }

    try {
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
