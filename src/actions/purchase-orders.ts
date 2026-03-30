"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentWorkspace } from "./workspace";

const PurchaseOrderItemSchema = z.object({
    productCode: z.string().min(1, "Código de producto es requerido"),
    productName: z.string().optional(),
    quantity: z.number().int().min(1, "Cantidad mínima es 1"),
});

const PurchaseOrderSchema = z.object({
    period: z.string().regex(/^\d{4}-\d{2}$/, "Formato de periodo inválido (YYYY-MM)"),
    supplierId: z.string().min(1, "Proveedor es requerido"),
    notes: z.string().optional(),
    externalReference: z.string().optional(),
    promoCode: z.string().optional(),
    items: z.array(PurchaseOrderItemSchema).min(1, "Debe incluir al menos un item"),
});

export type PurchaseOrderState = {
    errors?: {
        period?: string[];
        supplierId?: string[];
        notes?: string[];
        items?: string[];
    };
    message?: string;
};

/**
 * Obtener todas las órdenes de compra del workspace
 */
export async function getPurchaseOrders() {
    const session = await auth();
    if (!session?.user?.email) return [];

    const workspace = await getCurrentWorkspace();
    if (!workspace) return [];

    return await prisma.purchaseOrder.findMany({
        where: { workspaceId: workspace.id },
        include: {
            supplier: {
                select: { id: true, name: true, logoUrl: true },
            },
            createdBy: {
                select: { id: true, name: true },
            },
            _count: {
                select: { items: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });
}

/**
 * Obtener una orden de compra por ID
 */
export async function getPurchaseOrder(id: string) {
    const session = await auth();
    if (!session?.user?.email) return null;

    const workspace = await getCurrentWorkspace();
    if (!workspace) return null;

    return await prisma.purchaseOrder.findUnique({
        where: { id, workspaceId: workspace.id },
        include: {
            supplier: {
                select: { id: true, name: true, logoUrl: true },
            },
            createdBy: {
                select: { id: true, name: true },
            },
            items: {
                orderBy: { createdAt: "asc" },
            },
        },
    });
}

/**
 * Obtener proveedores (empresas con status PROVEEDOR)
 */
export async function getSuppliers() {
    const session = await auth();
    if (!session?.user?.email) return [];

    const workspace = await getCurrentWorkspace();
    if (!workspace) return [];

    return await prisma.company.findMany({
        where: {
            workspaceId: workspace.id,
            status: "PROVEEDOR",
        },
        select: { id: true, name: true, logoUrl: true },
        orderBy: { name: "asc" },
    });
}

/**
 * Verificar si Décima está habilitado en el workspace
 */
export async function isDecimaEnabled(): Promise<boolean> {
    const workspace = await getCurrentWorkspace();
    if (!workspace) return false;

    const ws = await prisma.workspace.findUnique({
        where: { id: workspace.id },
        select: { decimaEnabled: true },
    });

    return ws?.decimaEnabled || false;
}

/**
 * Crear orden de compra
 */
export async function createPurchaseOrder(
    prevState: PurchaseOrderState | undefined,
    formData: FormData
): Promise<PurchaseOrderState> {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) redirect("/login");

    const workspace = await getCurrentWorkspace();
    if (!workspace) redirect("/login");

    // Parse items from FormData
    const itemsJson = formData.get("items") as string;
    let items: { productCode: string; productName?: string; quantity: number }[] = [];
    try {
        items = JSON.parse(itemsJson || "[]");
    } catch {
        return { message: "Error al procesar los items", errors: { items: ["Formato inválido"] } };
    }

    const rawData = {
        period: formData.get("period") as string,
        supplierId: formData.get("supplierId") as string,
        notes: (formData.get("notes") as string) || undefined,
        externalReference: (formData.get("externalReference") as string) || undefined,
        promoCode: (formData.get("promoCode") as string) || undefined,
        items,
    };

    const validatedFields = PurchaseOrderSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors as PurchaseOrderState["errors"],
            message: "Campos inválidos. No se pudo crear la orden.",
        };
    }

    // Generate order number
    const lastOrder = await prisma.purchaseOrder.findFirst({
        where: { workspaceId: workspace.id },
        orderBy: { orderNumber: "desc" },
        select: { orderNumber: true },
    });
    const orderNumber = (lastOrder?.orderNumber || 0) + 1;

    let order;
    try {
        order = await prisma.purchaseOrder.create({
            data: {
                orderNumber,
                period: validatedFields.data.period,
                supplierId: validatedFields.data.supplierId,
                notes: validatedFields.data.notes,
                externalReference: validatedFields.data.externalReference,
                promoCode: validatedFields.data.promoCode,
                workspaceId: workspace.id,
                createdById: user.id,
                items: {
                    create: validatedFields.data.items.map((item) => ({
                        productCode: item.productCode,
                        productName: item.productName || null,
                        quantity: item.quantity,
                    })),
                },
            },
        });
    } catch (error) {
        console.error("Database Error:", error);
        return { message: "Error de base de datos al crear la orden." };
    }

    revalidatePath("/app/purchases");
    redirect(`/app/purchases/${order.id}`);
}

/**
 * Actualizar orden de compra
 */
export async function updatePurchaseOrder(
    id: string,
    prevState: PurchaseOrderState | undefined,
    formData: FormData
): Promise<PurchaseOrderState> {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    // Parse items
    const itemsJson = formData.get("items") as string;
    let items: { productCode: string; productName?: string; quantity: number }[] = [];
    try {
        items = JSON.parse(itemsJson || "[]");
    } catch {
        return { message: "Error al procesar los items", errors: { items: ["Formato inválido"] } };
    }

    const rawData = {
        period: formData.get("period") as string,
        supplierId: formData.get("supplierId") as string,
        notes: (formData.get("notes") as string) || undefined,
        externalReference: (formData.get("externalReference") as string) || undefined,
        promoCode: (formData.get("promoCode") as string) || undefined,
        items,
    };

    const validatedFields = PurchaseOrderSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors as PurchaseOrderState["errors"],
            message: "Campos inválidos.",
        };
    }

    try {
        await prisma.$transaction(async (tx) => {
            // Delete existing items and recreate
            await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });

            await tx.purchaseOrder.update({
                where: { id },
                data: {
                    period: validatedFields.data.period,
                    supplierId: validatedFields.data.supplierId,
                    notes: validatedFields.data.notes,
                    externalReference: validatedFields.data.externalReference,
                    promoCode: validatedFields.data.promoCode,
                    items: {
                        create: validatedFields.data.items.map((item) => ({
                            productCode: item.productCode,
                            productName: item.productName || null,
                            quantity: item.quantity,
                        })),
                    },
                },
            });
        });
    } catch (error) {
        console.error("Database Error:", error);
        return { message: "Error de base de datos al actualizar la orden." };
    }

    revalidatePath("/app/purchases");
    revalidatePath(`/app/purchases/${id}`);

    const action = formData.get("action");
    if (action === "saveAndClose") {
        redirect("/app/purchases");
    }

    return { message: "Orden actualizada exitosamente." };
}

/**
 * Eliminar orden de compra
 */
export async function deletePurchaseOrder(id: string) {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    try {
        await prisma.purchaseOrder.delete({ where: { id } });
        revalidatePath("/app/purchases");
    } catch (error) {
        console.error("Database Error:", error);
        throw new Error("Failed to delete purchase order.");
    }

    redirect("/app/purchases");
}
