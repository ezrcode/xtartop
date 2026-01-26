"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getProjects(companyId: string) {
    const session = await auth();
    if (!session?.user?.email) return [];

    const projects = await prisma.project.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
    });

    return projects;
}

export async function createProject(companyId: string, name: string) {
    const session = await auth();
    if (!session?.user?.email) {
        return { error: "No autorizado" };
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { memberships: true },
    });

    if (!user) {
        return { error: "Usuario no encontrado" };
    }

    const workspaceId = user.memberships[0]?.workspaceId;
    if (!workspaceId) {
        return { error: "Workspace no encontrado" };
    }

    try {
        const project = await prisma.project.create({
            data: {
                name,
                companyId,
                status: "ACTIVE",
            },
        });

        // Create activity record
        await prisma.activity.create({
            data: {
                type: "PROJECT",
                companyId,
                workspaceId,
                createdById: user.id,
                emailSubject: `Proyecto creado: ${name}`,
            },
        });

        revalidatePath(`/app/companies/${companyId}`);
        return { success: true, project };
    } catch (error) {
        console.error("Error creating project:", error);
        return { error: "Error al crear el proyecto" };
    }
}

export async function updateProjectStatus(
    projectId: string,
    companyId: string,
    newStatus: "ACTIVE" | "INACTIVE"
) {
    const session = await auth();
    if (!session?.user?.email) {
        return { error: "No autorizado" };
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { memberships: true },
    });

    if (!user) {
        return { error: "Usuario no encontrado" };
    }

    const workspaceId = user.memberships[0]?.workspaceId;
    if (!workspaceId) {
        return { error: "Workspace no encontrado" };
    }

    try {
        const project = await prisma.project.update({
            where: { id: projectId },
            data: { status: newStatus },
        });

        // Create activity record
        const statusText = newStatus === "ACTIVE" ? "activado" : "inactivado";
        await prisma.activity.create({
            data: {
                type: "PROJECT",
                companyId,
                workspaceId,
                createdById: user.id,
                emailSubject: `Proyecto ${statusText}: ${project.name}`,
            },
        });

        revalidatePath(`/app/companies/${companyId}`);
        return { success: true, project };
    } catch (error) {
        console.error("Error updating project:", error);
        return { error: "Error al actualizar el proyecto" };
    }
}
