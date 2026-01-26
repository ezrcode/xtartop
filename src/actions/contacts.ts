"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ContactStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentWorkspace } from "./workspace";

const ContactSchema = z.object({
    fullName: z.string().min(1, "Full name is required"),
    email: z.string().email("Invalid email address"),
    title: z.string().optional(),
    companyId: z.string().optional().nullable(),
    mobile: z.string().optional(),
    instagramUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
    linkedinUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
    status: z.nativeEnum(ContactStatus),
});

export type ContactState = {
    errors?: {
        fullName?: string[];
        email?: string[];
        title?: string[];
        companyId?: string[];
        mobile?: string[];
        instagramUrl?: string[];
        linkedinUrl?: string[];
        status?: string[];
    };
    message?: string;
};

export async function getContacts() {
    const session = await auth();
    if (!session?.user?.email) return [];

    const workspace = await getCurrentWorkspace();
    if (!workspace) return [];

    return await prisma.contact.findMany({
        where: {
            workspaceId: workspace.id,
        },
        include: {
            company: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}

export async function getContact(id: string) {
    const session = await auth();
    if (!session?.user?.email) return null;

    const workspace = await getCurrentWorkspace();
    if (!workspace) return null;

    return await prisma.contact.findUnique({
        where: {
            id,
            workspaceId: workspace.id,
        },
        include: {
            company: true,
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

export async function createContact(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) redirect("/login");

    const workspace = await getCurrentWorkspace();
    if (!workspace) redirect("/login");

    const rawData = {
        fullName: formData.get("fullName"),
        email: formData.get("email"),
        title: formData.get("title"),
        companyId: formData.get("companyId") || null,
        mobile: formData.get("mobile"),
        instagramUrl: formData.get("instagramUrl"),
        linkedinUrl: formData.get("linkedinUrl"),
        status: formData.get("status"),
    };

    const validatedFields = ContactSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Missing Fields. Failed to Create Contact.",
        };
    }

    try {
        await prisma.contact.create({
            data: {
                ...validatedFields.data,
                workspaceId: workspace.id,
                createdById: user.id,
            },
        });
    } catch (error) {
        console.error("Database Error:", error);
        return { message: "Database Error: Failed to Create Contact." };
    }

    revalidatePath("/app/contacts");

    // Handle "Save & Close" vs "Save"
    const action = formData.get("action");
    if (action === "saveAndClose") {
        redirect("/app/contacts");
    }

    // If just "Save", we might want to redirect to edit page or stay?
    // For simplicity, let's redirect to list for now or handle it in UI?
    // The requirement says: "Guardar: Saves the contact data and stays on the same form route."
    // But we are in "create" mode. Staying on "create" form with filled data is weird.
    // Usually "Save" on create redirects to "Edit" of the new record.
    // But we can't easily do that without returning the ID and handling it in client.
    // Let's assume "Save" on create redirects to Edit.
    // We need the ID.
}

// Revised createContact to handle redirection to Edit
export async function createContactAction(prevState: ContactState | undefined, formData: FormData): Promise<ContactState> {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) redirect("/login");

    const workspace = await getCurrentWorkspace();
    if (!workspace) redirect("/login");

    const rawData = {
        fullName: formData.get("fullName"),
        email: formData.get("email"),
        title: formData.get("title"),
        companyId: formData.get("companyId") === "null" ? null : formData.get("companyId") || null,
        mobile: formData.get("mobile"),
        instagramUrl: formData.get("instagramUrl"),
        linkedinUrl: formData.get("linkedinUrl"),
        status: formData.get("status"),
    };

    const validatedFields = ContactSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Missing Fields. Failed to Create Contact.",
        };
    }

    let contact;
    try {
        contact = await prisma.contact.create({
            data: {
                ...validatedFields.data,
                createdById: user.id,
                workspaceId: workspace.id,
            },
        });
    } catch (error) {
        console.error("Database Error:", error);
        return { message: "Database Error: Failed to Create Contact." };
    }

    revalidatePath("/app/contacts");

    const action = formData.get("action");
    if (action === "saveAndClose") {
        redirect("/app/contacts");
    } else {
        redirect(`/app/contacts/${contact.id}`);
    }
}

export async function updateContactAction(id: string, prevState: ContactState | undefined, formData: FormData): Promise<ContactState> {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    const rawData = {
        fullName: formData.get("fullName"),
        email: formData.get("email"),
        title: formData.get("title"),
        companyId: formData.get("companyId") === "null" ? null : formData.get("companyId") || null,
        mobile: formData.get("mobile"),
        instagramUrl: formData.get("instagramUrl"),
        linkedinUrl: formData.get("linkedinUrl"),
        status: formData.get("status"),
    };

    const validatedFields = ContactSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Missing Fields. Failed to Update Contact.",
        };
    }

    try {
        await prisma.contact.update({
            where: { id },
            data: validatedFields.data,
        });
    } catch (error) {
        console.error("Database Error:", error);
        return { message: "Database Error: Failed to Update Contact." };
    }

    revalidatePath("/app/contacts");
    revalidatePath(`/app/contacts/${id}`);

    const action = formData.get("action");

    if (action === "saveAndClose") {
        redirect("/app/contacts");
    }

    return { message: "Contact updated successfully." };
}

export async function deleteContact(id: string) {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    try {
        await prisma.contact.delete({
            where: { id },
        });
        revalidatePath("/app/contacts");
    } catch (error) {
        console.error("Database Error:", error);
        throw new Error("Failed to delete contact.");
    }

    redirect("/app/contacts");
}

// ============================================
// Company Contacts Actions (for modal CRUD)
// ============================================

export async function createCompanyContact(
    companyId: string,
    data: {
        fullName: string;
        email: string;
        title?: string;
        mobile?: string;
        instagramUrl?: string;
        linkedinUrl?: string;
    }
) {
    const session = await auth();
    if (!session?.user?.email) {
        return { error: "No autorizado" };
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
        return { error: "Usuario no encontrado" };
    }

    const workspace = await getCurrentWorkspace();
    if (!workspace) {
        return { error: "Workspace no encontrado" };
    }

    try {
        const contact = await prisma.contact.create({
            data: {
                fullName: data.fullName,
                email: data.email,
                title: data.title || null,
                mobile: data.mobile || null,
                instagramUrl: data.instagramUrl || null,
                linkedinUrl: data.linkedinUrl || null,
                companyId,
                workspaceId: workspace.id,
                createdById: user.id,
                status: ContactStatus.PROSPECTO,
            },
        });

        return { success: true, contact };
    } catch (error) {
        console.error("Error creating contact:", error);
        return { error: "Error al crear el contacto" };
    }
}

export async function updateCompanyContact(
    contactId: string,
    data: {
        fullName: string;
        email: string;
        title?: string;
        mobile?: string;
        instagramUrl?: string;
        linkedinUrl?: string;
        status?: ContactStatus;
    }
) {
    const session = await auth();
    if (!session?.user?.email) {
        return { error: "No autorizado" };
    }

    try {
        const contact = await prisma.contact.update({
            where: { id: contactId },
            data: {
                fullName: data.fullName,
                email: data.email,
                title: data.title || null,
                mobile: data.mobile || null,
                instagramUrl: data.instagramUrl || null,
                linkedinUrl: data.linkedinUrl || null,
                status: data.status,
            },
        });

        return { success: true, contact };
    } catch (error) {
        console.error("Error updating contact:", error);
        return { error: "Error al actualizar el contacto" };
    }
}

export async function deleteCompanyContact(contactId: string) {
    const session = await auth();
    if (!session?.user?.email) {
        return { error: "No autorizado" };
    }

    try {
        await prisma.contact.delete({
            where: { id: contactId },
        });

        return { success: true };
    } catch (error) {
        console.error("Error deleting contact:", error);
        return { error: "Error al eliminar el contacto" };
    }
}
