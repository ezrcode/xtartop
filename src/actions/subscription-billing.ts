"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentWorkspace } from "./workspace";
import { BillingType, CountType, CalculatedBase } from "@prisma/client";

// Get or create subscription billing for a company
export async function getSubscriptionBilling(companyId: string) {
    const session = await auth();
    if (!session?.user?.email) return null;

    const workspace = await getCurrentWorkspace();
    if (!workspace) return null;

    // Verify company belongs to workspace
    const company = await prisma.company.findFirst({
        where: {
            id: companyId,
            workspaceId: workspace.id,
        },
        include: {
            projects: {
                where: { status: "ACTIVE" },
            },
            clientUsers: {
                where: { status: "ACTIVE" },
            },
        },
    });

    if (!company) return null;

    // Get or create subscription billing
    let billing = await prisma.subscriptionBilling.findUnique({
        where: { companyId },
        include: {
            items: {
                orderBy: { createdAt: "asc" },
            },
        },
    });

    if (!billing) {
        billing = await prisma.subscriptionBilling.create({
            data: {
                companyId,
                billingType: "STANDARD",
                autoBillingEnabled: false,
                billingDay: 1,
            },
            include: {
                items: true,
            },
        });
    }

    // Calculate quantities for each item
    const itemsWithQuantities = billing.items.map((item) => {
        let quantity = item.manualQuantity || 0;
        
        if (item.countType === "ACTIVE_PROJECTS") {
            quantity = company.projects.length;
        } else if (item.countType === "ACTIVE_USERS") {
            quantity = company.clientUsers.length;
        } else if (item.countType === "CALCULATED") {
            // Fórmula: (usuarios o proyectos) - valor base
            const base = item.calculatedBase === "USERS" 
                ? company.clientUsers.length 
                : company.projects.length;
            const subtract = item.calculatedSubtract || 0;
            quantity = Math.max(0, base - subtract); // No permitir negativos
        }

        return {
            ...item,
            calculatedQuantity: quantity,
            subtotal: Number(item.price) * quantity,
        };
    });

    const total = itemsWithQuantities.reduce((sum, item) => sum + item.subtotal, 0);

    return {
        ...billing,
        items: itemsWithQuantities,
        total,
        activeProjects: company.projects.length,
        activeUsers: company.clientUsers.length,
    };
}

// Update billing type, billing day, and auto billing enabled
export async function updateBillingSettings(
    companyId: string,
    billingType: BillingType,
    billingDay: number,
    autoBillingEnabled?: boolean
) {
    const session = await auth();
    if (!session?.user?.email) {
        throw new Error("No autorizado");
    }

    const workspace = await getCurrentWorkspace();
    if (!workspace) {
        throw new Error("Workspace no encontrado");
    }

    // Verify company belongs to workspace
    const company = await prisma.company.findFirst({
        where: {
            id: companyId,
            workspaceId: workspace.id,
        },
    });

    if (!company) {
        throw new Error("Empresa no encontrada");
    }

    // Validate billingDay (1-31)
    const validBillingDay = Math.min(Math.max(1, billingDay), 31);

    // Prepare update data
    const updateData: {
        billingType: BillingType;
        billingDay: number;
        autoBillingEnabled?: boolean;
    } = {
        billingType,
        billingDay: validBillingDay,
    };

    if (autoBillingEnabled !== undefined) {
        updateData.autoBillingEnabled = autoBillingEnabled;
    }

    // Update or create billing settings
    await prisma.subscriptionBilling.upsert({
        where: { companyId },
        update: updateData,
        create: {
            companyId,
            billingType,
            billingDay: validBillingDay,
            autoBillingEnabled: autoBillingEnabled ?? false,
        },
    });

    revalidatePath(`/app/companies/${companyId}`);
    return { success: true };
}

// Toggle auto billing enabled
export async function toggleAutoBilling(companyId: string, enabled: boolean) {
    const session = await auth();
    if (!session?.user?.email) {
        throw new Error("No autorizado");
    }

    const workspace = await getCurrentWorkspace();
    if (!workspace) {
        throw new Error("Workspace no encontrado");
    }

    // Verify company belongs to workspace
    const company = await prisma.company.findFirst({
        where: {
            id: companyId,
            workspaceId: workspace.id,
        },
    });

    if (!company) {
        throw new Error("Empresa no encontrada");
    }

    // Update auto billing setting
    await prisma.subscriptionBilling.update({
        where: { companyId },
        data: {
            autoBillingEnabled: enabled,
        },
    });

    revalidatePath(`/app/companies/${companyId}`);
    return { success: true };
}

// Add subscription item
export async function addSubscriptionItem(
    companyId: string,
    data: {
        admCloudItemId: string;
        code: string;
        description: string;
        price: number;
        countType: CountType;
        manualQuantity?: number;
        calculatedBase?: CalculatedBase;
        calculatedSubtract?: number;
    }
) {
    const session = await auth();
    if (!session?.user?.email) {
        throw new Error("No autorizado");
    }

    const workspace = await getCurrentWorkspace();
    if (!workspace) {
        throw new Error("Workspace no encontrado");
    }

    // Verify company belongs to workspace
    const company = await prisma.company.findFirst({
        where: {
            id: companyId,
            workspaceId: workspace.id,
        },
    });

    if (!company) {
        throw new Error("Empresa no encontrada");
    }

    // Get or create billing record
    let billing = await prisma.subscriptionBilling.findUnique({
        where: { companyId },
    });

    if (!billing) {
        billing = await prisma.subscriptionBilling.create({
            data: {
                companyId,
                billingType: "STANDARD",
                billingDay: 1,
            },
        });
    }

    // Create item
    await prisma.subscriptionItem.create({
        data: {
            subscriptionBillingId: billing.id,
            admCloudItemId: data.admCloudItemId,
            code: data.code,
            description: data.description,
            price: data.price,
            countType: data.countType,
            manualQuantity: data.countType === "MANUAL" ? (data.manualQuantity || 0) : null,
            calculatedBase: data.countType === "CALCULATED" ? data.calculatedBase : null,
            calculatedSubtract: data.countType === "CALCULATED" ? (data.calculatedSubtract || 0) : null,
        },
    });

    revalidatePath(`/app/companies/${companyId}`);
    return { success: true };
}

// Update subscription item
export async function updateSubscriptionItem(
    itemId: string,
    data: {
        admCloudItemId: string;
        code: string;
        description: string;
        price: number;
        countType: CountType;
        manualQuantity?: number;
        calculatedBase?: CalculatedBase;
        calculatedSubtract?: number;
    }
) {
    const session = await auth();
    if (!session?.user?.email) {
        throw new Error("No autorizado");
    }

    const workspace = await getCurrentWorkspace();
    if (!workspace) {
        throw new Error("Workspace no encontrado");
    }

    // Verify item belongs to a company in the workspace
    const item = await prisma.subscriptionItem.findUnique({
        where: { id: itemId },
        include: {
            subscriptionBilling: {
                include: {
                    company: true,
                },
            },
        },
    });

    if (!item || item.subscriptionBilling.company.workspaceId !== workspace.id) {
        throw new Error("Item no encontrado");
    }

    // Update item
    await prisma.subscriptionItem.update({
        where: { id: itemId },
        data: {
            admCloudItemId: data.admCloudItemId,
            code: data.code,
            description: data.description,
            price: data.price,
            countType: data.countType,
            manualQuantity: data.countType === "MANUAL" ? (data.manualQuantity || 0) : null,
            calculatedBase: data.countType === "CALCULATED" ? data.calculatedBase : null,
            calculatedSubtract: data.countType === "CALCULATED" ? (data.calculatedSubtract || 0) : null,
        },
    });

    revalidatePath(`/app/companies/${item.subscriptionBilling.companyId}`);
    return { success: true };
}

// Delete subscription item
export async function deleteSubscriptionItem(itemId: string) {
    const session = await auth();
    if (!session?.user?.email) {
        throw new Error("No autorizado");
    }

    const workspace = await getCurrentWorkspace();
    if (!workspace) {
        throw new Error("Workspace no encontrado");
    }

    // Verify item belongs to a company in the workspace
    const item = await prisma.subscriptionItem.findUnique({
        where: { id: itemId },
        include: {
            subscriptionBilling: {
                include: {
                    company: true,
                },
            },
        },
    });

    if (!item || item.subscriptionBilling.company.workspaceId !== workspace.id) {
        throw new Error("Item no encontrado");
    }

    const companyId = item.subscriptionBilling.companyId;

    // Delete item
    await prisma.subscriptionItem.delete({
        where: { id: itemId },
    });

    revalidatePath(`/app/companies/${companyId}`);
    return { success: true };
}
