"use server";

import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

export async function createEmailTransporter(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            emailConfigured: true,
            emailFromAddress: true,
            emailFromName: true,
            emailPassword: true,
        },
    });

    if (!user || !user.emailConfigured || !user.emailFromAddress || !user.emailPassword) {
        throw new Error("Email not configured for this user");
    }

    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: user.emailFromAddress,
            pass: user.emailPassword,
        },
    });
}

export async function sendEmailWithGmail({
    userId,
    to,
    subject,
    body,
    attachments,
}: {
    userId: string;
    to: string;
    subject: string;
    body: string;
    attachments?: { filename: string; path: string }[];
}) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                emailFromAddress: true,
                emailFromName: true,
            },
        });

        const transporter = await createEmailTransporter(userId);

        const mailOptions = {
            from: `"${user?.emailFromName || "CRM"}" <${user?.emailFromAddress}>`,
            to,
            subject,
            html: body,
            attachments,
        };

        const info = await transporter.sendMail(mailOptions);
        
        return {
            success: true,
            messageId: info.messageId,
            error: null,
        };
    } catch (error: any) {
        console.error("Email sending error:", error);
        return {
            success: false,
            messageId: null,
            error: error.message || "Failed to send email",
        };
    }
}
