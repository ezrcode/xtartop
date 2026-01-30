import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/actions/workspace";
import { createAdmCloudClient } from "@/lib/admcloud/client";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const workspace = await getCurrentWorkspace();
        if (!workspace) {
            return NextResponse.json({ error: "Workspace no encontrado" }, { status: 404 });
        }

        // Get ADMCloud settings from workspace
        const workspaceData = await prisma.workspace.findUnique({
            where: { id: workspace.id },
            select: {
                admCloudEnabled: true,
                admCloudAppId: true,
                admCloudUsername: true,
                admCloudPassword: true,
                admCloudCompany: true,
                admCloudRole: true,
            },
        });

        if (!workspaceData?.admCloudEnabled || !workspaceData.admCloudAppId || !workspaceData.admCloudCompany) {
            return NextResponse.json({
                items: [],
                message: "ADMCloud no está configurado en este workspace",
            });
        }

        if (!workspaceData.admCloudUsername || !workspaceData.admCloudPassword) {
            return NextResponse.json({
                items: [],
                message: "Credenciales de ADMCloud no configuradas",
            });
        }

        // Create ADMCloud client with workspace config
        const client = createAdmCloudClient({
            appId: workspaceData.admCloudAppId,
            username: workspaceData.admCloudUsername,
            password: workspaceData.admCloudPassword,
            company: workspaceData.admCloudCompany,
            role: workspaceData.admCloudRole || "Administradores",
        });

        // Usar PriceList que ya tiene items con sus precios
        const priceListResponse = await client.getPriceLists();

        if (!priceListResponse.success) {
            return NextResponse.json({ 
                error: priceListResponse.error || "Error al obtener artículos de ADMCloud",
                items: [],
            }, { status: 500 });
        }

        // Transformar PriceList a formato de items
        // PriceList tiene: ItemID, ItemSKU, ItemName, Price
        const items = (priceListResponse.data || []).map((item: Record<string, unknown>) => {
            const id = (item.ItemID || item.ID || "") as string;
            const code = (item.ItemSKU || item.SKU || "") as string;
            const name = (item.ItemName || item.SalesDescription || item.Name || "") as string;
            const price = Number(item.Price) || 0;
            
            return { id, code, name, price };
        });

        // Filtrar duplicados (puede haber varios precios por item, tomamos el primero)
        const uniqueItems = new Map<string, { id: string; code: string; name: string; price: number }>();
        for (const item of items) {
            if (item.id && !uniqueItems.has(item.id)) {
                uniqueItems.set(item.id, item);
            }
        }

        return NextResponse.json({ 
            items: Array.from(uniqueItems.values()),
        });
    } catch (error) {
        console.error("Error fetching ADMCloud items:", error);
        return NextResponse.json({ 
            error: "Error interno del servidor",
            items: [],
        }, { status: 500 });
    }
}
