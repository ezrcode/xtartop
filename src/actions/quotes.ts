"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "./workspace";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { QuoteStatus, Currency, TaxType, PaymentFrequency } from "@prisma/client";

const QuoteItemSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "El nombre es requerido"),
    price: z.coerce.number().min(0, "El precio debe ser mayor o igual a 0"),
    quantity: z.coerce.number().min(0.01, "La cantidad debe ser mayor a 0"),
    frequency: z.nativeEnum(PaymentFrequency),
});

const QuoteSchema = z.object({
    date: z.coerce.date(),
    validity: z.string().min(1, "La validez es requerida"),
    status: z.nativeEnum(QuoteStatus),
    proposalDescription: z.string().optional(),
    paymentConditions: z.string().optional(),
    currency: z.nativeEnum(Currency),
    deliveryTime: z.string().optional(),
    taxType: z.nativeEnum(TaxType),
    items: z.array(QuoteItemSchema).min(1, "Debe agregar al menos un item"),
});

export type QuoteState = {
    errors?: {
        date?: string[];
        validity?: string[];
        status?: string[];
        proposalDescription?: string[];
        paymentConditions?: string[];
        currency?: string[];
        deliveryTime?: string[];
        taxType?: string[];
        items?: string[];
    };
    message?: string;
};

export async function getQuotesByDeal(dealId: string) {
    const session = await auth();
    if (!session?.user?.email) {
        console.log('getQuotesByDeal: No session');
        return [];
    }

    const workspace = await getCurrentWorkspace();
    if (!workspace) {
        console.log('getQuotesByDeal: No workspace');
        return [];
    }

    console.log('getQuotesByDeal: Fetching quotes for deal', dealId, 'in workspace', workspace.id);

    const quotes = await prisma.quote.findMany({
        where: {
            dealId,
            deal: {
                workspaceId: workspace.id,
            },
        },
        include: {
            company: { select: { name: true } },
            contact: { select: { fullName: true } },
            createdBy: { select: { name: true, email: true } },
            items: true,
        },
        orderBy: {
            number: "asc",
        },
    });

    console.log('getQuotesByDeal: Found', quotes.length, 'quotes');
    return quotes;
}

export async function getQuote(id: string) {
    const session = await auth();
    if (!session?.user?.email) return null;

    const workspace = await getCurrentWorkspace();
    if (!workspace) return null;

    return await prisma.quote.findFirst({
        where: {
            id,
            deal: {
                workspaceId: workspace.id,
            },
        },
        include: {
            company: { select: { id: true, name: true } },
            contact: { select: { id: true, fullName: true } },
            deal: { select: { id: true, name: true } },
            items: true,
        },
    });
}

export async function createQuoteAction(
    dealId: string,
    prevState: QuoteState | undefined,
    formData: FormData
): Promise<QuoteState> {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) redirect("/login");

    const workspace = await getCurrentWorkspace();
    if (!workspace) redirect("/login");

    // Verify deal belongs to workspace
    const deal = await prisma.deal.findFirst({
        where: {
            id: dealId,
            workspaceId: workspace.id,
        },
        select: {
            id: true,
            companyId: true,
            contactId: true,
        },
    });

    if (!deal) {
        return { message: "Negocio no encontrado." };
    }

    // Parse items from formData
    const itemsJson = formData.get("items");
    let items: any[] = [];
    
    if (itemsJson) {
        try {
            items = JSON.parse(itemsJson as string);
            console.log('Parsed items:', items);
        } catch (error) {
            console.error('Error parsing items:', error);
            return { message: "Error al procesar los items." };
        }
    }

    const rawData = {
        date: formData.get("date"),
        validity: formData.get("validity"),
        status: formData.get("status") || "BORRADOR",
        proposalDescription: formData.get("proposalDescription") || undefined,
        paymentConditions: formData.get("paymentConditions") || undefined,
        currency: formData.get("currency"),
        deliveryTime: formData.get("deliveryTime") || undefined,
        taxType: formData.get("taxType"),
        items,
    };

    console.log('Raw data for validation:', rawData);

    const validatedFields = QuoteSchema.safeParse(rawData);

    if (!validatedFields.success) {
        console.error('Validation errors:', validatedFields.error.flatten());
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Campos inválidos. Por favor revise el formulario.",
        };
    }

    console.log('Validated fields:', validatedFields.data);

    // Calculate totals
    let totalOneTime = 0;
    let totalMonthly = 0;

    validatedFields.data.items.forEach((item) => {
        const netPrice = item.price * item.quantity;
        if (item.frequency === "PAGO_UNICO") {
            totalOneTime += netPrice;
        } else {
            totalMonthly += netPrice;
        }
    });

    try {
        // Get next quote number for this deal
        const lastQuote = await prisma.quote.findFirst({
            where: { dealId },
            orderBy: { number: "desc" },
            select: { number: true },
        });

        const nextNumber = (lastQuote?.number || 0) + 1;

        const quote = await prisma.quote.create({
            data: {
                number: nextNumber,
                date: validatedFields.data.date,
                validity: validatedFields.data.validity,
                status: validatedFields.data.status,
                proposalDescription: validatedFields.data.proposalDescription,
                paymentConditions: validatedFields.data.paymentConditions,
                currency: validatedFields.data.currency,
                deliveryTime: validatedFields.data.deliveryTime,
                taxType: validatedFields.data.taxType,
                totalOneTime,
                totalMonthly,
                dealId: deal.id,
                companyId: deal.companyId,
                contactId: deal.contactId,
                createdById: user.id,
                items: {
                    create: validatedFields.data.items.map((item) => ({
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        frequency: item.frequency,
                        netPrice: item.price * item.quantity,
                    })),
                },
            },
        });

        console.log('Quote created successfully:', quote.id);
        revalidatePath(`/app/deals/${dealId}`);
        return { message: "Cotización creada exitosamente." };
    } catch (error) {
        console.error("Database Error:", error);
        return { message: "Error al crear la cotización." };
    }
}

export async function updateQuoteAction(
    quoteId: string,
    prevState: QuoteState | undefined,
    formData: FormData
): Promise<QuoteState> {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    const workspace = await getCurrentWorkspace();
    if (!workspace) redirect("/login");

    // Verify quote belongs to workspace
    const existingQuote = await prisma.quote.findFirst({
        where: {
            id: quoteId,
            deal: {
                workspaceId: workspace.id,
            },
        },
        select: {
            dealId: true,
        },
    });

    if (!existingQuote) {
        return { message: "Cotización no encontrada." };
    }

    // Parse items from formData
    const itemsJson = formData.get("items");
    let items: any[] = [];
    
    if (itemsJson) {
        try {
            items = JSON.parse(itemsJson as string);
        } catch (error) {
            return { message: "Error al procesar los items." };
        }
    }

    const rawData = {
        date: formData.get("date"),
        validity: formData.get("validity"),
        status: formData.get("status"),
        proposalDescription: formData.get("proposalDescription") || undefined,
        paymentConditions: formData.get("paymentConditions") || undefined,
        currency: formData.get("currency"),
        deliveryTime: formData.get("deliveryTime") || undefined,
        taxType: formData.get("taxType"),
        items,
    };

    const validatedFields = QuoteSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Campos inválidos. Por favor revise el formulario.",
        };
    }

    // Calculate totals
    let totalOneTime = 0;
    let totalMonthly = 0;

    validatedFields.data.items.forEach((item) => {
        const netPrice = item.price * item.quantity;
        if (item.frequency === "PAGO_UNICO") {
            totalOneTime += netPrice;
        } else {
            totalMonthly += netPrice;
        }
    });

    try {
        await prisma.quote.update({
            where: { id: quoteId },
            data: {
                date: validatedFields.data.date,
                validity: validatedFields.data.validity,
                status: validatedFields.data.status,
                proposalDescription: validatedFields.data.proposalDescription,
                paymentConditions: validatedFields.data.paymentConditions,
                currency: validatedFields.data.currency,
                deliveryTime: validatedFields.data.deliveryTime,
                taxType: validatedFields.data.taxType,
                totalOneTime,
                totalMonthly,
            },
        });

        // Delete existing items and create new ones
        await prisma.quoteItem.deleteMany({
            where: { quoteId },
        });

        await prisma.quoteItem.createMany({
            data: validatedFields.data.items.map((item) => ({
                quoteId,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                frequency: item.frequency,
                netPrice: item.price * item.quantity,
            })),
        });

        revalidatePath(`/app/deals/${existingQuote.dealId}`);
        return { message: "Cotización actualizada exitosamente." };
    } catch (error) {
        console.error("Database Error:", error);
        return { message: "Error al actualizar la cotización." };
    }
}

export async function deleteQuote(quoteId: string) {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    const workspace = await getCurrentWorkspace();
    if (!workspace) redirect("/login");

    try {
        const quote = await prisma.quote.findFirst({
            where: {
                id: quoteId,
                deal: {
                    workspaceId: workspace.id,
                },
            },
            select: {
                dealId: true,
            },
        });

        if (!quote) {
            return { message: "Cotización no encontrada." };
        }

        await prisma.quote.delete({
            where: { id: quoteId },
        });

        revalidatePath(`/app/deals/${quote.dealId}`);
        return { message: "Cotización eliminada exitosamente." };
    } catch (error) {
        console.error("Database Error:", error);
        return { message: "Error al eliminar la cotización." };
    }
}

