"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "./workspace";

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
    });

    if (!user) {
        return { error: "Usuario no encontrado" };
    }

    const workspace = await getCurrentWorkspace();
    if (!workspace) {
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
        const activity = await prisma.activity.create({
            data: {
                type: "PROJECT",
                companyId,
                workspaceId: workspace.id,
                createdById: user.id,
                emailSubject: `Proyecto creado: ${name}`,
            },
            include: {
                createdBy: {
                    select: { name: true, email: true, photoUrl: true },
                },
            },
        });

        return { success: true, project, activity };
    } catch (error) {
        console.error("Error creating project:", error);
        return { error: "Error al crear el proyecto" };
    }
}

export async function updateProject(
    projectId: string,
    companyId: string,
    name: string
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
        const project = await prisma.project.update({
            where: { id: projectId },
            data: { name },
        });

        return { success: true, project };
    } catch (error) {
        console.error("Error updating project:", error);
        return { error: "Error al actualizar el proyecto" };
    }
}

export async function deleteProject(projectId: string, companyId: string) {
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
        const project = await prisma.project.findUnique({
            where: { id: projectId },
        });

        if (!project) {
            return { error: "Proyecto no encontrado" };
        }

        await prisma.project.delete({
            where: { id: projectId },
        });

        // Create activity record
        await prisma.activity.create({
            data: {
                type: "PROJECT",
                companyId,
                workspaceId: workspace.id,
                createdById: user.id,
                emailSubject: `Proyecto eliminado: ${project.name}`,
            },
        });

        return { success: true };
    } catch (error) {
        console.error("Error deleting project:", error);
        return { error: "Error al eliminar el proyecto" };
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
    });

    if (!user) {
        return { error: "Usuario no encontrado" };
    }

    const workspace = await getCurrentWorkspace();
    if (!workspace) {
        return { error: "Workspace no encontrado" };
    }

    try {
        const project = await prisma.project.update({
            where: { id: projectId },
            data: { status: newStatus },
        });

        // Create activity record
        const statusText = newStatus === "ACTIVE" ? "activado" : "inactivado";
        const activity = await prisma.activity.create({
            data: {
                type: "PROJECT",
                companyId,
                workspaceId: workspace.id,
                createdById: user.id,
                emailSubject: `Proyecto ${statusText}: ${project.name}`,
            },
            include: {
                createdBy: {
                    select: { name: true, email: true, photoUrl: true },
                },
            },
        });

        return { success: true, project, activity };
    } catch (error) {
        console.error("Error updating project:", error);
        return { error: "Error al actualizar el proyecto" };
    }
}
