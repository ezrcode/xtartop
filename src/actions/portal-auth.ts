"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

export async function portalLogin(
    prevState: { error: string | null },
    formData: FormData
) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "Por favor ingresa tu email y contraseña" };
    }

    // Verify user exists and is a CLIENT
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        return { error: "Credenciales inválidas" };
    }

    if (user.userType !== "CLIENT") {
        return { error: "Esta cuenta no tiene acceso al portal de clientes. Si eres parte del equipo NEARBY, ingresa en /login" };
    }

    try {
        await signIn("credentials", {
            email,
            password,
            redirectTo: "/portal",
        });
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return { error: "Credenciales inválidas" };
                default:
                    return { error: "Ocurrió un error. Intenta de nuevo." };
            }
        }
        throw error;
    }

    return { error: null };
}

export async function registerClientUser(
    token: string,
    name: string,
    password: string
) {
    // Find the invitation
    const invitation = await prisma.clientInvitation.findUnique({
        where: { token },
        include: {
            contact: true,
            company: true,
        },
    });

    if (!invitation) {
        return { error: "Invitación no encontrada" };
    }

    if (invitation.status !== "PENDING") {
        return { error: "Esta invitación ya fue utilizada o expiró" };
    }

    if (new Date() > invitation.expiresAt) {
        await prisma.clientInvitation.update({
            where: { id: invitation.id },
            data: { status: "EXPIRED" },
        });
        return { error: "Esta invitación ha expirado" };
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
        where: { email: invitation.contact.email },
    });

    if (existingUser) {
        // Link existing user to contact if not already
        if (!existingUser.contactId) {
            await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                    contactId: invitation.contactId,
                    userType: "CLIENT",
                },
            });
        }

        // Don't mark as ACCEPTED yet - wait for T&C acceptance
        return { success: true, userId: existingUser.id };
    }

    // Create new user
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            name,
            email: invitation.contact.email,
            passwordHash,
            userType: "CLIENT",
            contactId: invitation.contactId,
        },
    });

    // Don't mark as ACCEPTED yet - wait for T&C acceptance
    return { success: true, userId: user.id };
}

export async function updateCompanyData(
    companyId: string,
    data: {
        legalName: string;
        taxId: string;
        fiscalAddress: string;
    }
) {
    const company = await prisma.company.findUnique({
        where: { id: companyId },
    });

    if (!company) {
        return { error: "Empresa no encontrada" };
    }

    if (company.termsAccepted) {
        return { error: "No se pueden modificar los datos después de aceptar los términos" };
    }

    await prisma.company.update({
        where: { id: companyId },
        data: {
            legalName: data.legalName,
            taxId: data.taxId,
            fiscalAddress: data.fiscalAddress,
        },
    });

    return { success: true };
}

export async function acceptTermsAndConditions(
    companyId: string,
    contactId: string,
    contactName: string,
    token?: string
) {
    const company = await prisma.company.findUnique({
        where: { id: companyId },
    });

    if (!company) {
        return { error: "Empresa no encontrada" };
    }

    if (company.termsAccepted) {
        return { error: "Los términos ya fueron aceptados" };
    }

    // Validate required fields
    if (!company.legalName || !company.taxId || !company.fiscalAddress) {
        return { error: "Debe completar todos los datos de la empresa antes de aceptar" };
    }

    await prisma.company.update({
        where: { id: companyId },
        data: {
            termsAccepted: true,
            termsAcceptedAt: new Date(),
            termsAcceptedById: contactId,
            termsAcceptedByName: contactName,
            termsVersion: "v1.0 - 2026-01",
        },
    });

    // Mark invitation as accepted now that T&C are complete
    if (token) {
        await prisma.clientInvitation.updateMany({
            where: { 
                token,
                status: "PENDING",
            },
            data: { 
                status: "ACCEPTED", 
                usedAt: new Date() 
            },
        });
    }

    return { success: true };
}
