"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "./workspace";

export async function getClientUsers(companyId: string) {
    const session = await auth();
    if (!session?.user?.email) return [];

    const clientUsers = await prisma.clientUser.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
    });

    return clientUsers;
}

export async function createClientUser(companyId: string, fullName: string, email: string) {
    const session = await auth();
    if (!session?.user?.email) {
        return { error: "No autorizado" };
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        return { error: "Usuario no encontrado" };
    }

    const workspace = await getCurrentWorkspace();
    if (!workspace) {
        return { error: "Workspace no encontrado" };
    }

    try {
        const clientUser = await prisma.clientUser.create({
            data: {
                fullName,
                email,
                companyId,
                status: "ACTIVE",
            },
        });

        // Create activity record
        const activity = await prisma.activity.create({
            data: {
                type: "CLIENT_USER",
                companyId,
                workspaceId: workspace.id,
                createdById: user.id,
                emailSubject: `Usuario creado: ${fullName}`,
            },
            include: {
                createdBy: {
                    select: { name: true, email: true, photoUrl: true },
                },
            },
        });

        return { success: true, clientUser, activity };
    } catch (error) {
        console.error("Error creating client user:", error);
        return { error: "Error al crear el usuario" };
    }
}

export async function updateClientUserStatus(
    clientUserId: string,
    companyId: string,
    newStatus: "ACTIVE" | "INACTIVE"
) {
    const session = await auth();
    if (!session?.user?.email) {
        return { error: "No autorizado" };
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        return { error: "Usuario no encontrado" };
    }

    const workspace = await getCurrentWorkspace();
    if (!workspace) {
        return { error: "Workspace no encontrado" };
    }

    try {
        const clientUser = await prisma.clientUser.update({
            where: { id: clientUserId },
            data: { status: newStatus },
        });

        // Create activity record
        const statusText = newStatus === "ACTIVE" ? "activado" : "inactivado";
        const activity = await prisma.activity.create({
            data: {
                type: "CLIENT_USER",
                companyId,
                workspaceId: workspace.id,
                createdById: user.id,
                emailSubject: `Usuario ${statusText}: ${clientUser.fullName}`,
            },
            include: {
                createdBy: {
                    select: { name: true, email: true, photoUrl: true },
                },
            },
        });

        return { success: true, clientUser, activity };
    } catch (error) {
        console.error("Error updating client user:", error);
        return { error: "Error al actualizar el usuario" };
    }
}
