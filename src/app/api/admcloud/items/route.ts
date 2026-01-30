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

        // Fetch items from ADMCloud
        const response = await client.getItems();

        console.log("[ADMCloud Items] Response success:", response.success);
        console.log("[ADMCloud Items] Response error:", response.error);
        console.log("[ADMCloud Items] Data type:", typeof response.data, Array.isArray(response.data));
        console.log("[ADMCloud Items] Data length:", response.data?.length);

        if (!response.success) {
            console.error("ADMCloud API error:", response.error);
            return NextResponse.json({ 
                error: response.error || "Error al obtener artículos de ADMCloud",
                items: [],
            }, { status: 500 });
        }

        // Log the raw response for debugging - log ALL keys from first item
        if (response.data && response.data.length > 0) {
            const firstItem = response.data[0];
            console.log("[ADMCloud Items] First item keys:", Object.keys(firstItem));
            console.log("[ADMCloud Items] First item full:", JSON.stringify(firstItem, null, 2));
            
            // Log específico para campos de precio
            console.log("[ADMCloud Items] Price fields check:", {
                SalesPrice: firstItem.SalesPrice,
                Price: firstItem.Price,
                UnitPrice: firstItem.UnitPrice,
                price: firstItem.price,
                Cost: firstItem.Cost,
                Amount: firstItem.Amount,
                // Buscar cualquier campo que contenga "price" o "cost"
                allPriceFields: Object.entries(firstItem)
                    .filter(([key]) => key.toLowerCase().includes('price') || key.toLowerCase().includes('cost') || key.toLowerCase().includes('amount'))
                    .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
            });
        }

        // Transform the data to a simpler format
        // ADMCloud puede usar diferentes campos según la versión de la API
        const items = (response.data || []).map((item) => {
            const itemKeys = Object.keys(item);
            
            // Buscar ID en múltiples campos posibles
            const id = item.ID || item.ItemID || item.Id || item.id || "";
            // Buscar Code en múltiples campos posibles
            const code = item.Code || item.code || item.ItemCode || item.SKU || item.Sku || item.sku || item.ProductCode || "";
            const name = item.Name || item.name || item.Description || item.description || "";
            
            // Buscar precio en múltiples campos posibles (incluyendo variantes de capitalización)
            const rawItem = item as Record<string, unknown>;
            const price = 
                item.SalesPrice ?? 
                item.Price ?? 
                item.UnitPrice ?? 
                item.price ?? 
                rawItem["salesPrice"] ?? 
                rawItem["unitPrice"] ?? 
                rawItem["ListPrice"] ?? 
                rawItem["listPrice"] ?? 
                rawItem["BasePrice"] ?? 
                rawItem["basePrice"] ?? 
                0;
            
            return { id, code, name, price: Number(price) || 0 };
        });

        console.log("[ADMCloud Items] Mapped items count:", items.length);
        console.log("[ADMCloud Items] Items with ID:", items.filter(i => i.id).length);

        return NextResponse.json({ items: items.filter(item => item.id) });
    } catch (error) {
        console.error("Error fetching ADMCloud items:", error);
        return NextResponse.json({ 
            error: "Error interno del servidor",
            items: [],
        }, { status: 500 });
    }
}
