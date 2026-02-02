import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/actions/workspace";
import { createAdmCloudClient } from "@/lib/admcloud/client";

interface PriceOption {
    priceListId: string;
    priceListName: string;
    price: number;
    currency: string;
}

interface ItemWithPrices {
    id: string;
    code: string;
    name: string;
    prices: PriceOption[];
}

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
                admCloudDefaultPriceListId: true,
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

        // Filtrar solo servicios (ItemType = "S") y agrupar por artículo con todas sus listas de precios
        // PriceList tiene: ItemID, ItemSKU, ItemName, Price, ItemType, PriceLevelID, PriceLevelName, CurrencyID
        const itemsMap = new Map<string, ItemWithPrices>();
        
        for (const item of (priceListResponse.data || [])) {
            const record = item as Record<string, unknown>;
            
            // Solo servicios
            if (record.ItemType !== "S") continue;
            
            const id = (record.ItemID || record.ID || "") as string;
            if (!id) continue;
            
            const code = (record.ItemSKU || record.SKU || "") as string;
            const name = (record.ItemName || record.SalesDescription || record.Name || "") as string;
            const price = Number(record.Price) || 0;
            const priceListId = (record.PriceLevelID || "") as string;
            const priceListName = (record.PriceLevelName || "Precio Lista") as string;
            const currency = (record.CurrencyID || "USD") as string;
            
            const priceOption: PriceOption = {
                priceListId,
                priceListName,
                price,
                currency,
            };
            
            if (itemsMap.has(id)) {
                // Agregar precio a item existente (evitar duplicados de misma lista)
                const existing = itemsMap.get(id)!;
                const hasPriceList = existing.prices.some(p => p.priceListId === priceListId);
                if (!hasPriceList) {
                    existing.prices.push(priceOption);
                }
            } else {
                // Nuevo item
                itemsMap.set(id, {
                    id,
                    code,
                    name,
                    prices: [priceOption],
                });
            }
        }

        const items = Array.from(itemsMap.values());
        
        // Ordenar precios dentro de cada item (lista predeterminada primero si existe)
        const defaultPriceListId = workspaceData.admCloudDefaultPriceListId;
        if (defaultPriceListId) {
            for (const item of items) {
                item.prices.sort((a, b) => {
                    if (a.priceListId === defaultPriceListId) return -1;
                    if (b.priceListId === defaultPriceListId) return 1;
                    return 0;
                });
            }
        }

        return NextResponse.json({ 
            items,
            defaultPriceListId: defaultPriceListId || null,
        });
    } catch (error) {
        console.error("Error fetching ADMCloud items:", error);
        return NextResponse.json({ 
            error: "Error interno del servidor",
            items: [],
        }, { status: 500 });
    }
}
