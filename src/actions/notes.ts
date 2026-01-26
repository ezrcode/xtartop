"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "./workspace";

export async function createNote(companyId: string, content: string) {
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
        const activity = await prisma.activity.create({
            data: {
                type: "NOTE",
                companyId,
                workspaceId: workspace.id,
                createdById: user.id,
                emailSubject: content.length > 100 ? content.substring(0, 100) + "..." : content,
                emailBody: content,
            },
            include: {
                createdBy: {
                    select: { name: true, email: true, photoUrl: true },
                },
            },
        });

        return { success: true, activity };
    } catch (error) {
        console.error("Error creating note:", error);
        return { error: "Error al crear la nota" };
    }
}
