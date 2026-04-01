"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DealStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentWorkspace } from "./workspace";

const DealSchema = z.object({
    name: z.string().min(1, "Deal name is required"),
    description: z.string().optional(),
    value: z.string().transform((val) => parseFloat(val) || 0),
    companyId: z.string().nullish(),
    contactId: z.string().nullish(),
    businessLineId: z.string().nullish(),
    type: z.enum(["CLIENTE_NUEVO", "UPSELLING"]).nullable().optional(),
    recurrence: z.enum(["ONETIME_PROJECT", "SUSCRIPCION"]),
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
        description?: string[];
        value?: string[];
        companyId?: string[];
        contactId?: string[];
        businessLineId?: string[];
        type?: string[];
        recurrence?: string[];
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
            businessLine: true,
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

const QuickCompanySchema = z.object({
    name: z.string().trim().min(1, "El nombre de la empresa es obligatorio"),
});

export async function createCompanyFromDeal(name: string) {
    const session = await auth();
    if (!session?.user?.email) {
        return { success: false, message: "No autorizado." };
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
        return { success: false, message: "Usuario no encontrado." };
    }

    const workspace = await getCurrentWorkspace();
    if (!workspace) {
        return { success: false, message: "Workspace no encontrado." };
    }

    const validated = QuickCompanySchema.safeParse({ name });
    if (!validated.success) {
        return { success: false, message: validated.error.issues[0]?.message || "Datos inválidos." };
    }

    try {
        const company = await prisma.company.create({
            data: {
                name: validated.data.name,
                workspaceId: workspace.id,
                createdById: user.id,
                status: "ACTIVO",
                type: "PROSPECTO",
            },
            select: {
                id: true,
                name: true,
                status: true,
                type: true,
                workspaceId: true,
                createdById: true,
                createdAt: true,
                updatedAt: true,
                logoUrl: true,
                taxId: true,
                legalName: true,
                fiscalAddress: true,
                initialProjects: true,
                initialUsers: true,
                quoteId: true,
                quoteFileUrl: true,
                country: true,
                city: true,
                phone: true,
                website: true,
                instagramUrl: true,
                linkedinUrl: true,
                primaryContactId: true,
                origin: true,
                termsAccepted: true,
                termsAcceptedAt: true,
                termsAcceptedById: true,
                termsAcceptedByName: true,
                termsVersion: true,
                admCloudRelationshipId: true,
                admCloudLastSync: true,
                clickUpClientName: true,
            },
        });

        revalidatePath("/app/deals");
        revalidatePath("/app/companies");
        return { success: true, company };
    } catch (error) {
        console.error("Database Error:", error);
        return { success: false, message: "No se pudo crear la empresa." };
    }
}

const QuickContactSchema = z.object({
    fullName: z.string().trim().min(1, "El nombre del contacto es obligatorio"),
    email: z.string().trim().email("Correo inválido"),
    companyId: z.string().nullable().optional(),
});

export async function createContactFromDeal(input: { fullName: string; email: string; companyId?: string | null }) {
    const session = await auth();
    if (!session?.user?.email) {
        return { success: false, message: "No autorizado." };
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
        return { success: false, message: "Usuario no encontrado." };
    }

    const workspace = await getCurrentWorkspace();
    if (!workspace) {
        return { success: false, message: "Workspace no encontrado." };
    }

    const validated = QuickContactSchema.safeParse(input);
    if (!validated.success) {
        return { success: false, message: validated.error.issues[0]?.message || "Datos inválidos." };
    }

    if (validated.data.companyId) {
        const companyExists = await prisma.company.findFirst({
            where: {
                id: validated.data.companyId,
                workspaceId: workspace.id,
            },
            select: { id: true },
        });

        if (!companyExists) {
            return { success: false, message: "La empresa seleccionada no es válida." };
        }
    }

    try {
        const contact = await prisma.contact.create({
            data: {
                fullName: validated.data.fullName,
                email: validated.data.email,
                companyId: validated.data.companyId || null,
                status: "PROSPECTO",
                workspaceId: workspace.id,
                createdById: user.id,
            },
            select: {
                id: true,
                fullName: true,
                photoUrl: true,
                title: true,
                email: true,
                mobile: true,
                instagramUrl: true,
                linkedinUrl: true,
                status: true,
                receivesInvoices: true,
                workspaceId: true,
                companyId: true,
                createdById: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        revalidatePath("/app/deals");
        revalidatePath("/app/contacts");
        return { success: true, contact };
    } catch (error) {
        console.error("Database Error:", error);
        return { success: false, message: "No se pudo crear el contacto." };
    }
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
        description: formData.get("description") || undefined,
        value: formData.get("value") || "0",
        companyId: formData.get("companyId") === "null" ? null : formData.get("companyId") || null,
        contactId: formData.get("contactId") === "null" ? null : formData.get("contactId") || null,
        businessLineId: formData.get("businessLineId") === "null" ? null : formData.get("businessLineId") || null,
        type: formData.get("type") === "null" ? null : formData.get("type") || null,
        recurrence: formData.get("recurrence") || "ONETIME_PROJECT",
        status: formData.get("status"),
    };

    const validatedFields = DealSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Faltan campos obligatorios para crear el negocio. Revisa los datos e inténtalo de nuevo.",
        };
    }

    let deal;
    try {
        const { businessLineId, ...dealData } = validatedFields.data;
        deal = await prisma.deal.create({
            data: {
                ...dealData,
                businessLineId: businessLineId || null,
                workspaceId: workspace.id,
                createdById: user.id,
            },
        });
    } catch (error) {
        console.error("Database Error:", error);
        return { message: "Ocurrió un error al crear el negocio. Inténtalo nuevamente." };
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

    const workspace = await getCurrentWorkspace();
    if (!workspace) redirect("/login");

    const existingDeal = await prisma.deal.findFirst({
        where: {
            id,
            workspaceId: workspace.id,
        },
        select: {
            name: true,
            description: true,
            value: true,
            companyId: true,
            contactId: true,
            businessLineId: true,
            type: true,
            recurrence: true,
            status: true,
        },
    });

    if (!existingDeal) {
        return { message: "No se encontró el negocio que intentas actualizar." };
    }

    const nameValue = formData.get("name");
    const descriptionValue = formData.get("description");
    const valueValue = formData.get("value");
    const companyIdValue = formData.get("companyId");
    const contactIdValue = formData.get("contactId");
    const businessLineIdValue = formData.get("businessLineId");
    const typeValue = formData.get("type");
    const recurrenceValue = formData.get("recurrence");
    const statusValue = formData.get("status");

    const rawData = {
        // Allow partial submits (e.g. from tabbed UI) by falling back to current persisted values.
        name: typeof nameValue === "string" ? nameValue : existingDeal.name,
        description: typeof descriptionValue === "string" ? descriptionValue : (existingDeal.description ?? undefined),
        value: typeof valueValue === "string" ? valueValue : String(existingDeal.value ?? 0),
        companyId: companyIdValue === null
            ? existingDeal.companyId
            : companyIdValue === "null"
                ? null
                : companyIdValue || null,
        contactId: contactIdValue === null
            ? existingDeal.contactId
            : contactIdValue === "null"
                ? null
                : contactIdValue || null,
        businessLineId: businessLineIdValue === null
            ? existingDeal.businessLineId
            : businessLineIdValue === "null"
                ? null
                : businessLineIdValue || null,
        type: typeValue === null
            ? existingDeal.type
            : typeValue === "null"
                ? null
                : typeValue || null,
        recurrence: recurrenceValue === null
            ? existingDeal.recurrence
            : recurrenceValue || "ONETIME_PROJECT",
        status: typeof statusValue === "string" ? statusValue : existingDeal.status,
    };

    const validatedFields = DealSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Faltan campos obligatorios para actualizar el negocio. Revisa los datos e inténtalo de nuevo.",
        };
    }

    try {
        const { businessLineId, ...dealData } = validatedFields.data;
        await prisma.deal.update({
            where: { id },
            data: {
                ...dealData,
                businessLineId: businessLineId || null,
            },
        });
    } catch (error) {
        console.error("Database Error:", error);
        return { message: "Ocurrió un error al actualizar el negocio. Inténtalo nuevamente." };
    }

    revalidatePath("/app/deals");
    revalidatePath(`/app/deals/${id}`);

    const action = formData.get("action");

    if (action === "saveAndClose") {
        redirect("/app/deals");
    }

    return { message: "Negocio actualizado correctamente." };
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
