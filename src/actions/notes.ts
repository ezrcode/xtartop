"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "./workspace";

interface CreateNoteParams {
    entityType: "company" | "contact" | "deal";
    entityId: string;
    content: string;
    attachmentsJson?: string;
}

export async function createNote(companyId: string, content: string, attachmentsJson?: string) {
    return createNoteGeneric({
        entityType: "company",
        entityId: companyId,
        content,
        attachmentsJson,
    });
}

export async function createNoteGeneric({ entityType, entityId, content, attachmentsJson }: CreateNoteParams) {
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
                companyId: entityType === "company" ? entityId : null,
                contactId: entityType === "contact" ? entityId : null,
                dealId: entityType === "deal" ? entityId : null,
                workspaceId: workspace.id,
                createdById: user.id,
                emailSubject: content.length > 100 ? content.substring(0, 100) + "..." : content,
                emailBody: content,
                attachments: attachmentsJson || null,
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
