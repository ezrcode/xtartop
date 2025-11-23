"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DealStatus, DealType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentWorkspace } from "./workspace";

const DealSchema = z.object({
    name: z.string().min(1, "Deal name is required"),
    value: z.string().transform((val) => parseFloat(val) || 0),
    mrr: z.string().optional().transform((val) => val ? parseFloat(val) : null),
    arr: z.string().optional().transform((val) => val ? parseFloat(val) : null),
    companyId: z.string().nullish(),
    contactId: z.string().nullish(),
    type: z.enum(["CLIENTE_NUEVO", "UPSELLING"]).nullable().optional(),
    status: z.enum([
        "PROSPECCION",
        "CALIFICACION",
        "NEGOCIACION",
        "FORMALIZACION",
        "CIERRE_GANADO",
        "CIERRE_PERDIDO",
        "NO_CALIFICADOS"
    ]),
});

export type DealState = {
    errors?: {
        name?: string[];
        value?: string[];
        mrr?: string[];
        arr?: string[];
        companyId?: string[];
        contactId?: string[];
        type?: string[];
        status?: string[];
    };
    message?: string;
};

export async function getDeals() {
    const session = await auth();
    if (!session?.user?.email) return [];

    const workspace = await getCurrentWorkspace();
    if (!workspace) return [];

    return await prisma.deal.findMany({
        where: {
            workspaceId: workspace.id,
        },
        include: {
            company: true,
            contact: true,
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    photoUrl: true,
                }
            }
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}

export async function getDeal(id: string) {
    const session = await auth();
    if (!session?.user?.email) return null;

    const workspace = await getCurrentWorkspace();
    if (!workspace) return null;

    return await prisma.deal.findUnique({
        where: {
            id,
            workspaceId: workspace.id,
        },
        include: {
            company: true,
            contact: true,
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    photoUrl: true,
                }
            }
        },
    });
}

export async function getCompanies() {
    const session = await auth();
    if (!session?.user?.email) return [];

    const workspace = await getCurrentWorkspace();
    if (!workspace) return [];

    return await prisma.company.findMany({
        where: {
            workspaceId: workspace.id,
        },
        orderBy: { name: "asc" }
    });
}

export async function getContacts() {
    const session = await auth();
    if (!session?.user?.email) return [];

    const workspace = await getCurrentWorkspace();
    if (!workspace) return [];

    return await prisma.contact.findMany({
        where: {
            workspaceId: workspace.id,
        },
        orderBy: { fullName: "asc" }
    });
}

export async function createDealAction(prevState: DealState | undefined, formData: FormData): Promise<DealState> {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) redirect("/login");

    const workspace = await getCurrentWorkspace();
    if (!workspace) redirect("/login");

    const rawData = {
        name: formData.get("name"),
        value: formData.get("value") || "0",
        mrr: formData.get("mrr") || "",
        arr: formData.get("arr") || "",
        companyId: formData.get("companyId") === "null" ? null : formData.get("companyId") || null,
        contactId: formData.get("contactId") === "null" ? null : formData.get("contactId") || null,
        type: formData.get("type") === "null" ? null : formData.get("type") || null,
        status: formData.get("status"),
    };

    const validatedFields = DealSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Missing Fields. Failed to Create Deal.",
        };
    }

    let deal;
    try {
        deal = await prisma.deal.create({
            data: {
                ...validatedFields.data,
                workspaceId: workspace.id,
                createdById: user.id,
            },
        });
    } catch (error) {
        console.error("Database Error:", error);
        return { message: "Database Error: Failed to Create Deal." };
    }

    revalidatePath("/app/deals");

    const action = formData.get("action");
    if (action === "saveAndClose") {
        redirect("/app/deals");
    } else {
        redirect(`/app/deals/${deal.id}`);
    }
}

export async function updateDealAction(id: string, prevState: DealState | undefined, formData: FormData): Promise<DealState> {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    const rawData = {
        name: formData.get("name"),
        value: formData.get("value") || "0",
        mrr: formData.get("mrr") || "",
        arr: formData.get("arr") || "",
        companyId: formData.get("companyId") === "null" ? null : formData.get("companyId") || null,
        contactId: formData.get("contactId") === "null" ? null : formData.get("contactId") || null,
        type: formData.get("type") === "null" ? null : formData.get("type") || null,
        status: formData.get("status"),
    };

    const validatedFields = DealSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Missing Fields. Failed to Update Deal.",
        };
    }

    try {
        await prisma.deal.update({
            where: { id },
            data: validatedFields.data,
        });
    } catch (error) {
        console.error("Database Error:", error);
        return { message: "Database Error: Failed to Update Deal." };
    }

    revalidatePath("/app/deals");
    revalidatePath(`/app/deals/${id}`);

    const action = formData.get("action");

    if (action === "saveAndClose") {
        redirect("/app/deals");
    }

    return { message: "Deal updated successfully." };
}

export async function deleteDeal(id: string) {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    try {
        await prisma.deal.delete({
            where: { id },
        });
        revalidatePath("/app/deals");
    } catch (error) {
        console.error("Database Error:", error);
        throw new Error("Failed to delete deal.");
    }

    redirect("/app/deals");
}

export async function updateDealStatus(id: string, status: DealStatus) {
    const session = await auth();
    if (!session?.user?.email) {
        throw new Error("Unauthorized");
    }

    try {
        await prisma.deal.update({
            where: { id },
            data: { status },
        });
        revalidatePath("/app/deals");
        return { success: true };
    } catch (error) {
        console.error("Database Error:", error);
        throw new Error("Failed to update deal status.");
    }
}

