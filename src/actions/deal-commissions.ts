"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
    CommissionRole,
    CommissionValueType,
    DealCommissionStatus,
    DealStatus,
    Prisma,
    QuoteStatus,
} from "@prisma/client";
import { z } from "zod";
import { getCurrentWorkspace } from "./workspace";

const CommissionEntrySchema = z.object({
    userId: z.string().min(1, "Debe seleccionar una persona."),
    role: z.nativeEnum(CommissionRole),
    type: z.nativeEnum(CommissionValueType),
    percentage: z.number().nullable().optional(),
    fixedAmount: z.number().nullable().optional(),
    calculatedAmount: z.number().min(0, "El monto a pagar debe ser mayor o igual a cero."),
}).superRefine((entry, ctx) => {
    if (entry.type === "PERCENTAGE") {
        if (entry.percentage == null || Number.isNaN(entry.percentage)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["percentage"],
                message: "Debes indicar el porcentaje.",
            });
        } else if (entry.percentage < 0 || entry.percentage > 100) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["percentage"],
                message: "El porcentaje debe estar entre 0 y 100.",
            });
        }
    }

    if (entry.type === "FIXED_AMOUNT") {
        if (entry.fixedAmount == null || Number.isNaN(entry.fixedAmount)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["fixedAmount"],
                message: "Debes indicar el monto fijo.",
            });
        } else if (entry.fixedAmount < 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["fixedAmount"],
                message: "El monto fijo debe ser mayor o igual a cero.",
            });
        }
    }
});

const DealCommissionPayloadSchema = z.object({
    dealId: z.string().min(1),
    notes: z.string().optional(),
    entries: z.array(CommissionEntrySchema),
});

type PrismaTx = Prisma.TransactionClient;

export async function syncApprovedQuoteArtifacts(
    tx: PrismaTx,
    params: {
        dealId: string;
        approvedQuoteId: string;
        totalBase: number;
        commissionableBase: number;
        marginRate: number;
        userId: string;
    }
) {
    await tx.deal.update({
        where: { id: params.dealId },
        data: {
            value: params.totalBase,
            status: DealStatus.FORMALIZACION,
        },
    });

    const existingCommission = await tx.dealCommission.findFirst({
        where: {
            approvedQuoteId: params.approvedQuoteId,
        },
        select: {
            id: true,
            notes: true,
        },
    });

    if (existingCommission) {
        await tx.dealCommission.update({
            where: { id: existingCommission.id },
            data: {
                status: DealCommissionStatus.ACTIVE,
                marginRate: params.marginRate,
                commissionableBase: params.commissionableBase,
                updatedById: params.userId,
            },
        });
        return;
    }

    await tx.dealCommission.create({
        data: {
            dealId: params.dealId,
            approvedQuoteId: params.approvedQuoteId,
            marginRate: params.marginRate,
            commissionableBase: params.commissionableBase,
            createdById: params.userId,
            updatedById: params.userId,
            status: DealCommissionStatus.ACTIVE,
        },
    });
}

export async function rejectApprovedQuoteArtifacts(
    tx: PrismaTx,
    params: {
        dealId: string;
        approvedQuoteId: string;
        userId: string;
    }
) {
    await tx.deal.update({
        where: { id: params.dealId },
        data: {
            status: DealStatus.CIERRE_PERDIDO,
        },
    });

    await tx.dealCommission.updateMany({
        where: {
            approvedQuoteId: params.approvedQuoteId,
            status: DealCommissionStatus.ACTIVE,
        },
        data: {
            status: DealCommissionStatus.CANCELLED,
            updatedById: params.userId,
        },
    });
}

export async function saveDealCommission(input: unknown) {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    const workspace = await getCurrentWorkspace();
    if (!workspace) redirect("/login");

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
    });
    if (!user) redirect("/login");

    const validated = DealCommissionPayloadSchema.safeParse(input);
    if (!validated.success) {
        return {
            success: false,
            message: validated.error.issues[0]?.message || "Datos inválidos para guardar las comisiones.",
        };
    }

    const deal = await prisma.deal.findFirst({
        where: {
            id: validated.data.dealId,
            workspaceId: workspace.id,
        },
        select: {
            id: true,
            quotes: {
                where: { status: QuoteStatus.APROBADA },
                orderBy: { updatedAt: "desc" },
                select: {
                    id: true,
                    totalOneTime: true,
                    totalMonthly: true,
                },
            },
        },
    });

    if (!deal) {
        return { success: false, message: "Negocio no encontrado." };
    }

    const approvedQuote = deal.quotes[0];
    if (!approvedQuote) {
        return { success: false, message: "Debes tener una cotización aprobada para registrar comisiones." };
    }

    const allowedUsers = await prisma.workspace.findUnique({
        where: { id: workspace.id },
        select: {
            ownerId: true,
            members: {
                select: { userId: true },
            },
        },
    });

    const allowedUserIds = new Set([
        allowedUsers?.ownerId,
        ...(allowedUsers?.members.map((member) => member.userId) || []),
    ].filter(Boolean) as string[]);

    for (const entry of validated.data.entries) {
        if (!allowedUserIds.has(entry.userId)) {
            return {
                success: false,
                message: "Una de las personas seleccionadas no pertenece al workspace.",
            };
        }
    }

    const totalDealBase = Number(approvedQuote.totalOneTime || 0) + Number(approvedQuote.totalMonthly || 0);
    const marginRate = Math.max(0, Math.min(100, Number(workspace.commissionMarginRate || 0)));
    const commissionableBase = Number(((totalDealBase * marginRate) / 100).toFixed(2));
    const normalizedEntries = validated.data.entries.map((entry) => {
        const percentage = entry.type === "PERCENTAGE" ? Number(entry.percentage || 0) : null;
        const fixedAmount = entry.type === "FIXED_AMOUNT" ? Number(entry.fixedAmount || 0) : null;
        const calculatedAmount = entry.type === "PERCENTAGE"
            ? Number(((totalDealBase * Number(entry.percentage || 0)) / 100).toFixed(2))
            : Number((fixedAmount || 0).toFixed(2));

        return {
            ...entry,
            percentage,
            fixedAmount,
            calculatedAmount,
        };
    });
    const totalCommitted = normalizedEntries.reduce((sum, entry) => sum + Number(entry.calculatedAmount || 0), 0);

    try {
        await prisma.$transaction(async (tx) => {
            let commission = await tx.dealCommission.findFirst({
                where: {
                    approvedQuoteId: approvedQuote.id,
                },
                select: { id: true, marginRate: true },
            });

            if (!commission) {
                commission = await tx.dealCommission.create({
                    data: {
                        dealId: validated.data.dealId,
                        approvedQuoteId: approvedQuote.id,
                        marginRate,
                        commissionableBase,
                        notes: validated.data.notes?.trim() || null,
                        status: DealCommissionStatus.ACTIVE,
                        createdById: user.id,
                        updatedById: user.id,
                    },
                    select: { id: true, marginRate: true },
                });
            } else {
                await tx.dealCommission.update({
                    where: { id: commission.id },
                    data: {
                        notes: validated.data.notes?.trim() || null,
                        marginRate,
                        commissionableBase,
                        status: DealCommissionStatus.ACTIVE,
                        updatedById: user.id,
                    },
                });
            }

            const commissionId = commission.id;

            await tx.dealCommissionEntry.deleteMany({
                where: { dealCommissionId: commissionId },
            });

            if (normalizedEntries.length > 0) {
                await tx.dealCommissionEntry.createMany({
                    data: normalizedEntries.map((entry) => ({
                        dealCommissionId: commissionId,
                        userId: entry.userId,
                        role: entry.role,
                        type: entry.type,
                        percentage: entry.type === "PERCENTAGE" ? entry.percentage : null,
                        fixedAmount: entry.type === "FIXED_AMOUNT" ? entry.fixedAmount : null,
                        calculatedAmount: entry.calculatedAmount,
                    })),
                });
            }
        });

        revalidatePath(`/app/deals/${validated.data.dealId}`);

        return {
            success: true,
            warning: totalCommitted > commissionableBase
                ? "La suma de comisiones supera el monto disponible para comisión."
                : null,
        };
    } catch (error) {
        console.error("Error saving deal commission:", error);
        return { success: false, message: "No se pudieron guardar las comisiones." };
    }
}
