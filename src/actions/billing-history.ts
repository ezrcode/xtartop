"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "./workspace";

export interface BillingHistoryItem {
    id: string;
    proformaNumber: string | null;
    admCloudDocId: string | null;
    billingMonth: number;
    billingYear: number;
    status: "PENDING" | "SENT" | "FAILED" | "CANCELLED";
    generatedAt: Date;
    sentAt: Date | null;
    pdfUrl: string | null;
    totalAmount: number;
    currency: string;
    errorMessage: string | null;
    recipients: string[];
}

export async function getBillingHistory(companyId: string): Promise<BillingHistoryItem[]> {
    const session = await auth();
    if (!session?.user?.email) return [];

    const workspace = await getCurrentWorkspace();
    if (!workspace) return [];

    // Verify company belongs to workspace
    const company = await prisma.company.findFirst({
        where: {
            id: companyId,
            workspaceId: workspace.id,
        },
    });

    if (!company) return [];

    const history = await prisma.billingHistory.findMany({
        where: {
            companyId,
            workspaceId: workspace.id,
        },
        orderBy: {
            generatedAt: "desc",
        },
        select: {
            id: true,
            proformaNumber: true,
            admCloudDocId: true,
            billingMonth: true,
            billingYear: true,
            status: true,
            generatedAt: true,
            sentAt: true,
            pdfUrl: true,
            totalAmount: true,
            currency: true,
            errorMessage: true,
            recipients: true,
        },
    });

    return history.map((item) => ({
        ...item,
        totalAmount: Number(item.totalAmount),
        recipients: item.recipients ? JSON.parse(item.recipients) : [],
    }));
}
