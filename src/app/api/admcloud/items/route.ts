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

        // Fetch items from ADMCloud (ahora con expand=Prices para incluir precios)
        const response = await client.getItems();

        if (!response.success) {
            return NextResponse.json({ 
                error: response.error || "Error al obtener artículos de ADMCloud",
                items: [],
            }, { status: 500 });
        }

        // Debug: ver si el array Prices tiene datos
        const firstItemWithPrices = (response.data || []).find(item => 
            item.Prices && Array.isArray(item.Prices) && item.Prices.length > 0
        );
        const pricesDebug = {
            itemsWithPricesArray: (response.data || []).filter(item => 
                item.Prices && Array.isArray(item.Prices) && item.Prices.length > 0
            ).length,
            firstItemPrices: firstItemWithPrices?.Prices?.slice(0, 3) || [],
            firstItemPricesKeys: firstItemWithPrices?.Prices?.[0] ? Object.keys(firstItemWithPrices.Prices[0]) : [],
            // También revisar si hay otros campos de precio directamente en el item
            sampleItem: response.data?.[0] ? {
                PurchasePrice: response.data[0].PurchasePrice,
                Cost: response.data[0].Cost,
                Prices: response.data[0].Prices,
            } : null
        };

        // Transform the data to a simpler format
        const items = (response.data || []).map((item) => {
            const id = item.ID || item.ItemID || item.Id || item.id || "";
            const code = item.Code || item.code || item.ItemCode || item.SKU || item.Sku || item.sku || item.ProductCode || "";
            const name = item.Name || item.name || item.Description || item.description || "";
            
            // Buscar precio en el array Prices (si existe)
            let price = 0;
            if (item.Prices && Array.isArray(item.Prices) && item.Prices.length > 0) {
                // Tomar el primer precio disponible
                const priceRecord = item.Prices[0];
                price = priceRecord.Price ?? priceRecord.UnitPrice ?? priceRecord.SalesPrice ?? 0;
            }
            // Fallback a campos directos del item
            if (price === 0) {
                price = item.SalesPrice ?? item.Price ?? item.UnitPrice ?? 0;
            }
            
            return { id, code, name, price: Number(price) || 0 };
        });

        return NextResponse.json({ 
            items: items.filter(item => item.id),
            _debug: { 
                pricesDebug,
                itemsWithPrice: items.filter(i => i.price > 0).length,
                totalItems: items.length
            }
        });
    } catch (error) {
        console.error("Error fetching ADMCloud items:", error);
        return NextResponse.json({ 
            error: "Error interno del servidor",
            items: [],
        }, { status: 500 });
    }
}
