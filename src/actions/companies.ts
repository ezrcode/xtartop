"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CompanyStatus, CompanyOrigin } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const CompanySchema = z.object({
    name: z.string().min(1, "Company name is required"),
    taxId: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().url("Invalid URL").optional().or(z.literal("")),
    instagramUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
    linkedinUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
    primaryContactId: z.string().nullish(),
    origin: z.enum([
        "PROSPECCION_MANUAL",
        "REFERIDO_CLIENTE",
        "REFERIDO_ALIADO",
        "INBOUND_MARKETING",
        "OUTBOUND_MARKETING",
        "EVENTO_PRESENCIAL"
    ]).nullable().optional(),
    status: z.enum([
        "PROSPECTO",
        "POTENCIAL",
        "CLIENTE",
        "DESCARTADA",
        "INACTIVA"
    ]),
});

export type CompanyState = {
    errors?: {
        name?: string[];
        taxId?: string[];
        country?: string[];
        city?: string[];
        phone?: string[];
        website?: string[];
        instagramUrl?: string[];
        linkedinUrl?: string[];
        primaryContactId?: string[];
        origin?: string[];
        status?: string[];
    };
    message?: string;
};

export async function getCompanies() {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    return await prisma.company.findMany({
        include: {
            primaryContact: true,
            _count: {
                select: { contacts: true }
            }
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}

export async function getCompany(id: string) {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    return await prisma.company.findUnique({
        where: { id },
        include: {
            primaryContact: true,
            contacts: true,
        },
    });
}

export async function getContacts() {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    return await prisma.contact.findMany({
        orderBy: { fullName: "asc" }
    });
}

export async function createCompanyAction(prevState: CompanyState | undefined, formData: FormData): Promise<CompanyState> {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) redirect("/login");

    const rawData = {
        name: formData.get("name"),
        taxId: formData.get("taxId"),
        country: formData.get("country"),
        city: formData.get("city"),
        phone: formData.get("phone"),
        website: formData.get("website"),
        instagramUrl: formData.get("instagramUrl"),
        linkedinUrl: formData.get("linkedinUrl"),
        primaryContactId: formData.get("primaryContactId") === "null" ? null : formData.get("primaryContactId") || null,
        origin: formData.get("origin") === "null" ? null : formData.get("origin") || null,
        status: formData.get("status"),
    };

    const validatedFields = CompanySchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Missing Fields. Failed to Create Company.",
        };
    }

    let company;
    try {
        company = await prisma.company.create({
            data: {
                ...validatedFields.data,
                createdById: user.id,
            },
        });
    } catch (error) {
        console.error("Database Error:", error);
        return { message: "Database Error: Failed to Create Company." };
    }

    revalidatePath("/app/companies");

    const action = formData.get("action");
    if (action === "saveAndClose") {
        redirect("/app/companies");
    } else {
        redirect(`/app/companies/${company.id}`);
    }
}

export async function updateCompanyAction(id: string, prevState: CompanyState | undefined, formData: FormData): Promise<CompanyState> {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    const rawData = {
        name: formData.get("name"),
        taxId: formData.get("taxId"),
        country: formData.get("country"),
        city: formData.get("city"),
        phone: formData.get("phone"),
        website: formData.get("website"),
        instagramUrl: formData.get("instagramUrl"),
        linkedinUrl: formData.get("linkedinUrl"),
        primaryContactId: formData.get("primaryContactId") === "null" ? null : formData.get("primaryContactId") || null,
        origin: formData.get("origin") === "null" ? null : formData.get("origin") || null,
        status: formData.get("status"),
    };

    const validatedFields = CompanySchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Missing Fields. Failed to Update Company.",
        };
    }

    try {
        await prisma.company.update({
            where: { id },
            data: validatedFields.data,
        });
    } catch (error) {
        console.error("Database Error:", error);
        return { message: "Database Error: Failed to Update Company." };
    }

    revalidatePath("/app/companies");
    revalidatePath(`/app/companies/${id}`);

    const action = formData.get("action");

    if (action === "saveAndClose") {
        redirect("/app/companies");
    }

    return { message: "Company updated successfully." };
}

export async function deleteCompany(id: string) {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    try {
        await prisma.company.delete({
            where: { id },
        });
        revalidatePath("/app/companies");
    } catch (error) {
        console.error("Database Error:", error);
        throw new Error("Failed to delete company.");
    }

    redirect("/app/companies");
}

