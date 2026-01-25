"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { sendEmail } from "@/lib/email/sender";

export async function sendClientInvitation(companyId: string, contactId: string) {
    const session = await auth();
    if (!session?.user?.email) {
        return { error: "No autorizado" };
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user || user.userType !== "INTERNAL") {
        return { error: "No autorizado" };
    }

    // Get company and contact
    const company = await prisma.company.findUnique({
        where: { id: companyId },
    });

    const contact = await prisma.contact.findUnique({
        where: { id: contactId },
    });

    if (!company || !contact) {
        return { error: "Empresa o contacto no encontrado" };
    }

    if (contact.companyId !== companyId) {
        return { error: "El contacto no pertenece a esta empresa" };
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.clientInvitation.findFirst({
        where: {
            companyId,
            contactId,
            status: "PENDING",
            expiresAt: { gt: new Date() },
        },
    });

    if (existingInvitation) {
        return { error: "Ya existe una invitación pendiente para este contacto" };
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invitation
    const invitation = await prisma.clientInvitation.create({
        data: {
            companyId,
            contactId,
            token,
            expiresAt,
        },
    });

    // Send email if user has email configured
    if (user.emailConfigured && user.emailPassword) {
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const invitationLink = `${baseUrl}/portal/onboarding/${token}`;

        try {
            await sendEmail({
                user: {
                    emailFromAddress: user.emailFromAddress!,
                    emailFromName: user.emailFromName || user.name || "NEARBY",
                    emailPassword: user.emailPassword,
                },
                to: contact.email,
                subject: `Invitación al Portal de Clientes - ${company.name}`,
                body: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #2d3e50;">¡Hola ${contact.fullName}!</h2>
                        <p>Has sido invitado a acceder al Portal de Clientes de NEARBY para completar los datos de <strong>${company.name}</strong>.</p>
                        <p>Por favor, haz clic en el siguiente enlace para crear tu cuenta y aceptar los Términos y Condiciones:</p>
                        <p style="margin: 30px 0;">
                            <a href="${invitationLink}" 
                               style="background-color: #fc5a34; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                Acceder al Portal
                            </a>
                        </p>
                        <p style="color: #666; font-size: 14px;">Este enlace expira en 7 días.</p>
                        <p style="color: #666; font-size: 14px;">Si no esperabas este email, puedes ignorarlo.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="color: #999; font-size: 12px;">NEARBY CRM</p>
                    </div>
                `,
            });
        } catch (emailError) {
            console.error("Error sending invitation email:", emailError);
            // Don't fail the invitation creation, just log the error
        }
    }

    revalidatePath(`/app/companies/${companyId}`);

    return { success: true, token: invitation.token };
}

export async function getInvitationByToken(token: string) {
    const invitation = await prisma.clientInvitation.findUnique({
        where: { token },
        include: {
            company: true,
            contact: true,
        },
    });

    if (!invitation) {
        return null;
    }

    // Check expiry
    if (new Date() > invitation.expiresAt && invitation.status === "PENDING") {
        await prisma.clientInvitation.update({
            where: { id: invitation.id },
            data: { status: "EXPIRED" },
        });
        return { ...invitation, status: "EXPIRED" as const };
    }

    return invitation;
}

export async function revokeInvitation(invitationId: string) {
    const session = await auth();
    if (!session?.user?.email) {
        return { error: "No autorizado" };
    }

    await prisma.clientInvitation.update({
        where: { id: invitationId },
        data: { status: "REVOKED" },
    });

    return { success: true };
}
