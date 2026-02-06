"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface BusinessLineState {
    message: string;
    errors?: {
        name?: string;
    };
}

// Get all business lines for the current workspace
export async function getBusinessLines() {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
            memberships: {
                include: { workspace: true },
                take: 1,
            },
            ownedWorkspaces: { take: 1 },
        },
    });

    const workspace = user?.ownedWorkspaces[0] || user?.memberships[0]?.workspace;
    if (!workspace) {
        return [];
    }

    return prisma.businessLine.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { name: "asc" },
    });
}

// Get active business lines only (for dropdowns)
export async function getActiveBusinessLines() {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
            memberships: {
                include: { workspace: true },
                take: 1,
            },
            ownedWorkspaces: { take: 1 },
        },
    });

    const workspace = user?.ownedWorkspaces[0] || user?.memberships[0]?.workspace;
    if (!workspace) {
        return [];
    }

    return prisma.businessLine.findMany({
        where: { 
            workspaceId: workspace.id,
            isActive: true,
        },
        orderBy: { name: "asc" },
    });
}

// Create a new business line
export async function createBusinessLine(
    prevState: BusinessLineState,
    formData: FormData
): Promise<BusinessLineState> {
    const session = await auth();
    if (!session?.user?.id) {
        return { message: "No autorizado" };
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
            memberships: {
                include: { workspace: true },
                take: 1,
            },
            ownedWorkspaces: { take: 1 },
        },
    });

    const workspace = user?.ownedWorkspaces[0] || user?.memberships[0]?.workspace;
    if (!workspace) {
        return { message: "No se encontró el workspace" };
    }

    const name = formData.get("name") as string;
    const description = formData.get("description") as string | null;

    if (!name || name.trim() === "") {
        return {
            message: "Error de validación",
            errors: { name: "El nombre es requerido" },
        };
    }

    try {
        await prisma.businessLine.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                isActive: true,
                workspaceId: workspace.id,
            },
        });

        revalidatePath("/app/settings");
        return { message: "Línea de negocio creada exitosamente" };
    } catch (error) {
        console.error("Error creating business line:", error);
        return { message: "Error al crear la línea de negocio" };
    }
}

// Update a business line
export async function updateBusinessLine(
    id: string,
    prevState: BusinessLineState,
    formData: FormData
): Promise<BusinessLineState> {
    const session = await auth();
    if (!session?.user?.id) {
        return { message: "No autorizado" };
    }

    const name = formData.get("name") as string;
    const description = formData.get("description") as string | null;
    const isActive = formData.get("isActive") === "true";

    if (!name || name.trim() === "") {
        return {
            message: "Error de validación",
            errors: { name: "El nombre es requerido" },
        };
    }

    try {
        await prisma.businessLine.update({
            where: { id },
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                isActive,
            },
        });

        revalidatePath("/app/settings");
        return { message: "Línea de negocio actualizada exitosamente" };
    } catch (error) {
        console.error("Error updating business line:", error);
        return { message: "Error al actualizar la línea de negocio" };
    }
}

// Delete a business line
export async function deleteBusinessLine(id: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "No autorizado" };
    }

    try {
        // Check if there are deals using this business line
        const dealsCount = await prisma.deal.count({
            where: { businessLineId: id },
        });

        if (dealsCount > 0) {
            return { 
                success: false, 
                error: `No se puede eliminar: hay ${dealsCount} negocio(s) usando esta línea de negocio` 
            };
        }

        await prisma.businessLine.delete({
            where: { id },
        });

        revalidatePath("/app/settings");
        return { success: true };
    } catch (error) {
        console.error("Error deleting business line:", error);
        return { success: false, error: "Error al eliminar la línea de negocio" };
    }
}

// Toggle business line active status
export async function toggleBusinessLineActive(id: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "No autorizado" };
    }

    try {
        const businessLine = await prisma.businessLine.findUnique({
            where: { id },
        });

        if (!businessLine) {
            return { success: false, error: "Línea de negocio no encontrada" };
        }

        await prisma.businessLine.update({
            where: { id },
            data: { isActive: !businessLine.isActive },
        });

        revalidatePath("/app/settings");
        return { success: true };
    } catch (error) {
        console.error("Error toggling business line:", error);
        return { success: false, error: "Error al cambiar el estado" };
    }
}
