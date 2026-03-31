"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createDecimaClient, type DecimaProduct, type DecimaPromotion } from "@/lib/decima/client";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";

export interface DecimaSettingsState {
    message: string;
    success?: boolean;
    errors?: {
        apiKey?: string;
    };
}

// Get current workspace Decima config
async function getWorkspaceDecimaConfig() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
            ownedWorkspaces: {
                select: {
                    id: true,
                    decimaEnabled: true,
                    decimaApiKey: true,
                },
            },
            memberships: {
                include: {
                    workspace: {
                        select: {
                            id: true,
                            decimaEnabled: true,
                            decimaApiKey: true,
                        },
                    },
                },
            },
        },
    });

    if (!user) return null;
    const workspace = user.ownedWorkspaces[0] || user.memberships[0]?.workspace;
    return workspace || null;
}

/**
 * Guardar configuración de Decima
 */
export async function saveDecimaSettings(
    prevState: DecimaSettingsState,
    formData: FormData
): Promise<DecimaSettingsState> {
    const session = await auth();
    if (!session?.user?.id) {
        return { message: "No autenticado", success: false };
    }

    const enabled = formData.get("enabled") === "true";
    const apiKey = formData.get("apiKey") as string;

    if (enabled && !apiKey?.trim()) {
        return {
            message: "API Key es requerida",
            success: false,
            errors: { apiKey: "API Key es requerida" },
        };
    }

    // Test connection if enabled
    if (enabled && apiKey?.trim()) {
        const client = createDecimaClient({ apiKey: apiKey.trim() });
        const testResult = await client.testConnection();

        if (!testResult.success) {
            return {
                message: `Error de conexión: ${testResult.error}`,
                success: false,
                errors: { apiKey: "No se pudo conectar con la API de Décima" },
            };
        }
    }

    const config = await getWorkspaceDecimaConfig();
    if (!config) {
        return { message: "Workspace no encontrado", success: false };
    }

    await prisma.workspace.update({
        where: { id: config.id },
        data: {
            decimaEnabled: enabled,
            decimaApiKey: enabled ? apiKey.trim() : null,
        },
    });

    revalidatePath("/app/settings");

    return {
        message: enabled
            ? "Integración con Décima Portal configurada exitosamente"
            : "Integración con Décima Portal deshabilitada",
        success: true,
    };
}

/**
 * Obtener productos de Décima
 */
export async function getDecimaProducts(): Promise<{
    success: boolean;
    products?: DecimaProduct[];
    error?: string;
}> {
    const config = await getWorkspaceDecimaConfig();
    if (!config?.decimaEnabled || !config?.decimaApiKey) {
        return { success: false, error: "Integración con Décima no configurada" };
    }

    const client = createDecimaClient({ apiKey: config.decimaApiKey });
    const result = await client.getProducts();

    if (!result.success) {
        return { success: false, error: result.error };
    }

    return { success: true, products: result.data || [] };
}

/**
 * Obtener promociones activas de Décima
 */
export async function getDecimaPromotions(): Promise<{
    success: boolean;
    promotions?: DecimaPromotion[];
    error?: string;
}> {
    const config = await getWorkspaceDecimaConfig();
    if (!config?.decimaEnabled || !config?.decimaApiKey) {
        return { success: false, error: "Integración con Décima no configurada" };
    }

    const client = createDecimaClient({ apiKey: config.decimaApiKey });
    const result = await client.getPromotions();

    if (!result.success) {
        return { success: false, error: result.error };
    }

    return { success: true, promotions: result.data || [] };
}

/**
 * Enviar orden de compra a Décima
 */
export async function sendOrderToDecima(purchaseOrderId: string): Promise<{
    success: boolean;
    error?: string;
}> {
    const config = await getWorkspaceDecimaConfig();
    if (!config?.decimaEnabled || !config?.decimaApiKey) {
        return { success: false, error: "Integración con Décima no configurada" };
    }

    const order = await prisma.purchaseOrder.findUnique({
        where: { id: purchaseOrderId },
        include: { items: true },
    });

    if (!order) {
        return { success: false, error: "Orden no encontrada" };
    }

    const client = createDecimaClient({ apiKey: config.decimaApiKey });
    const result = await client.createOrder({
        period: order.period,
        intent: "SUBMITTED",
        items: order.items.map((item) => ({
            productCode: item.productCode,
            quantity: item.quantity,
        })),
        externalReference: order.externalReference || `OC-${order.orderNumber}`,
        promoCode: order.promoCode || undefined,
        notes: order.notes || undefined,
    });

    if (!result.success) {
        return { success: false, error: result.error };
    }

    // Actualizar la orden local con el ID de Décima
    await prisma.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: {
            status: "ENVIADA",
            decimaOrderId: result.data?.id,
            decimaStatus: result.data?.status,
            decimaLastSync: new Date(),
        },
    });

    revalidatePath("/app/purchases");
    revalidatePath(`/app/purchases/${purchaseOrderId}`);

    return { success: true };
}

/**
 * Sincronizar estado de una orden desde Décima.
 * Cuando la orden pasa a confirmada/aprobada y no tiene factura,
 * intenta descargar el PDF de factura y guardarlo en Vercel Blob.
 */
export async function syncOrderFromDecima(purchaseOrderId: string): Promise<{
    success: boolean;
    error?: string;
    status?: string;
    invoiceUrl?: string;
}> {
    const config = await getWorkspaceDecimaConfig();
    if (!config?.decimaEnabled || !config?.decimaApiKey) {
        return { success: false, error: "Integración con Décima no configurada" };
    }

    const order = await prisma.purchaseOrder.findUnique({
        where: { id: purchaseOrderId },
    });

    if (!order?.decimaOrderId) {
        return { success: false, error: "Orden no tiene ID de Décima" };
    }

    const client = createDecimaClient({ apiKey: config.decimaApiKey });
    const result = await client.getOrder(order.decimaOrderId);

    if (!result.success) {
        return { success: false, error: result.error };
    }

    const decimaStatus = result.data?.status || order.decimaStatus;

    let localStatus = order.status;
    if (decimaStatus) {
        const statusLower = decimaStatus.toLowerCase();
        if (statusLower.includes("confirm") || statusLower.includes("approved")) {
            localStatus = "CONFIRMADA";
        } else if (statusLower.includes("cancel") || statusLower.includes("rejected")) {
            localStatus = "CANCELADA";
        } else if (statusLower.includes("deliver") || statusLower.includes("complet")) {
            localStatus = "RECIBIDA";
        }
    }

    let invoiceUrl = order.invoiceUrl;

    // Descargar factura si la orden fue confirmada/aprobada/recibida y aún no tenemos la factura
    if (!invoiceUrl && ["CONFIRMADA", "RECIBIDA"].includes(localStatus)) {
        const invoiceResult = await client.getOrderInvoice(order.decimaOrderId);
        if (invoiceResult.success && invoiceResult.data) {
            const blobPath = `invoices/decima/${order.workspaceId}/OC-${String(order.orderNumber).padStart(4, "0")}_${order.period}.pdf`;
            const blob = await put(blobPath, invoiceResult.data, {
                access: "public",
                contentType: "application/pdf",
            });
            invoiceUrl = blob.url;
        }
    }

    await prisma.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: {
            decimaStatus,
            decimaLastSync: new Date(),
            status: localStatus,
            invoiceUrl,
        },
    });

    revalidatePath("/app/purchases");
    revalidatePath(`/app/purchases/${purchaseOrderId}`);

    return { success: true, status: decimaStatus || undefined, invoiceUrl: invoiceUrl || undefined };
}
