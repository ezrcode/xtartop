"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "./workspace";
import { sendEmailWithGmail } from "@/lib/email/sender";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { writeFile } from "fs/promises";
import path from "path";

const EmailConfigSchema = z.object({
    emailFromAddress: z.string().email("Invalid email address"),
    emailFromName: z.string().min(1, "Name is required"),
    emailPassword: z.string().min(1, "Password is required"),
});

export type EmailConfigState = {
    errors?: {
        emailFromAddress?: string[];
        emailFromName?: string[];
        emailPassword?: string[];
    };
    message?: string;
};

export async function getEmailConfig() {
    const session = await auth();
    if (!session?.user?.email) return null;

    return await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
            emailConfigured: true,
            emailFromAddress: true,
            emailFromName: true,
            emailPassword: true,
        },
    });
}

export async function updateEmailConfig(
    prevState: EmailConfigState | undefined,
    formData: FormData
): Promise<EmailConfigState> {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    const rawData = {
        emailFromAddress: formData.get("emailFromAddress"),
        emailFromName: formData.get("emailFromName"),
        emailPassword: formData.get("emailPassword"),
    };

    const validatedFields = EmailConfigSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Invalid email configuration.",
        };
    }

    try {
        await prisma.user.update({
            where: { email: session.user.email },
            data: {
                emailFromAddress: validatedFields.data.emailFromAddress,
                emailFromName: validatedFields.data.emailFromName,
                emailPassword: validatedFields.data.emailPassword,
                emailConfigured: true,
            },
        });

        revalidatePath("/app/profile");
        return { message: "Email configuration updated successfully." };
    } catch (error) {
        console.error("Database Error:", error);
        return { message: "Failed to update email configuration." };
    }
}

export async function testEmailConnection() {
    const session = await auth();
    if (!session?.user?.email) return { success: false, message: "Not authenticated" };

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) return { success: false, message: "User not found" };

    try {
        const result = await sendEmailWithGmail({
            userId: user.id,
            to: session.user.email,
            subject: "Test Email - Configuración exitosa",
            body: `<h2>¡Felicitaciones!</h2><p>Tu configuración de email está funcionando correctamente.</p><p>Ya puedes enviar emails desde NEARBY.</p>`,
        });

        if (result.success) {
            return { success: true, message: "Test email sent successfully. Check your inbox." };
        } else {
            return { success: false, message: result.error || "Failed to send test email" };
        }
    } catch (error: any) {
        return { success: false, message: error.message || "Failed to send test email" };
    }
}

// Actions para enviar emails desde actividades
const SendEmailSchema = z.object({
    to: z.string().email("Invalid email address"),
    subject: z.string().min(1, "Subject is required"),
    body: z.string().min(1, "Email body is required"),
});

export type SendEmailState = {
    errors?: {
        to?: string[];
        subject?: string[];
        body?: string[];
    };
    message?: string;
    success?: boolean;
};

export async function sendEmail(
    prevState: SendEmailState | undefined,
    formData: FormData
): Promise<SendEmailState> {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    const workspace = await getCurrentWorkspace();
    if (!workspace) {
        return { success: false, message: "Workspace not found." };
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        return { success: false, message: "User not found." };
    }

    const rawData = {
        to: formData.get("to"),
        subject: formData.get("subject"),
        body: formData.get("body"),
    };

    const validatedFields = SendEmailSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            success: false,
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Invalid email data.",
        };
    }

    // Get entity IDs
    const companyId = formData.get("companyId") as string | null;
    const contactId = formData.get("contactId") as string | null;
    const dealId = formData.get("dealId") as string | null;

    // Handle file attachments
    const files = formData.getAll("attachments") as File[];
    const attachmentPaths: string[] = [];
    const emailAttachments: { filename: string; path: string }[] = [];

    for (const file of files) {
        if (file.size > 0) {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const fileName = `${Date.now()}-${file.name}`;
            const filePath = path.join(process.cwd(), "public", "local", fileName);

            await writeFile(filePath, buffer);
            attachmentPaths.push(`/local/${fileName}`);
            emailAttachments.push({
                filename: file.name,
                path: filePath,
            });
        }
    }

    try {
        // Send email
        const result = await sendEmailWithGmail({
            userId: user.id,
            to: validatedFields.data.to,
            subject: validatedFields.data.subject,
            body: validatedFields.data.body,
            attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
        });

        // Log activity
        await prisma.activity.create({
            data: {
                type: "EMAIL",
                workspaceId: workspace.id,
                companyId: companyId || undefined,
                contactId: contactId || undefined,
                dealId: dealId || undefined,
                emailTo: validatedFields.data.to,
                emailSubject: validatedFields.data.subject,
                emailBody: validatedFields.data.body,
                emailStatus: result.success ? "SENT" : "FAILED",
                attachments: attachmentPaths.length > 0 ? JSON.stringify(attachmentPaths) : null,
                errorMsg: result.error,
                createdById: user.id,
            },
        });

        // Revalidate paths
        if (companyId) revalidatePath(`/app/companies/${companyId}`);
        if (contactId) revalidatePath(`/app/contacts/${contactId}`);
        if (dealId) revalidatePath(`/app/deals/${dealId}`);

        if (result.success) {
            return { success: true, message: "Email sent successfully!" };
        } else {
            return { success: false, message: result.error || "Failed to send email" };
        }
    } catch (error: any) {
        console.error("Send email error:", error);
        return { success: false, message: error.message || "Failed to send email" };
    }
}

export async function getActivities(entityType: "company" | "contact" | "deal", entityId: string) {
    const session = await auth();
    if (!session?.user?.email) return [];

    const workspace = await getCurrentWorkspace();
    if (!workspace) return [];

    const where: any = {
        workspaceId: workspace.id,
        // Include EMAIL and PROJECT activities
        type: { in: ["EMAIL", "PROJECT"] },
    };

    if (entityType === "company") where.companyId = entityId;
    if (entityType === "contact") where.contactId = entityId;
    if (entityType === "deal") where.dealId = entityId;

    return await prisma.activity.findMany({
        where,
        include: {
            createdBy: {
                select: {
                    name: true,
                    email: true,
                    photoUrl: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}
