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

        // Primero, obtener los precios directamente para debug
        const pricesResponse = await client.getItemPrices();
        const pricesDebug = {
            success: pricesResponse.success,
            error: pricesResponse.error,
            count: pricesResponse.data?.length || 0,
            sample: pricesResponse.data?.slice(0, 3) || [],
            keys: pricesResponse.data && pricesResponse.data.length > 0 ? Object.keys(pricesResponse.data[0]) : []
        };

        // Fetch items WITH prices from ADMCloud (combines Items + ItemPrices endpoints)
        const response = await client.getItemsWithPrices();

        if (!response.success) {
            return NextResponse.json({ 
                error: response.error || "Error al obtener artículos de ADMCloud",
                items: [],
                _debug: { pricesDebug }
            }, { status: 500 });
        }

        // Transform the data to a simpler format
        const items = (response.data || []).map((item) => {
            const id = item.ID || item.ItemID || item.Id || item.id || "";
            const code = item.Code || item.code || item.ItemCode || item.SKU || item.Sku || item.sku || item.ProductCode || "";
            const name = item.Name || item.name || item.Description || item.description || "";
            // SalesPrice ahora viene del método getItemsWithPrices() que combina Items + ItemPrices
            const price = item.SalesPrice ?? item.Price ?? item.UnitPrice ?? 0;
            
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
