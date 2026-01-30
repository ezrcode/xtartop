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

        // Fetch items WITH prices from ADMCloud (combines Items + ItemPrices endpoints)
        const response = await client.getItemsWithPrices();

        console.log("[ADMCloud Items] Response success:", response.success);
        console.log("[ADMCloud Items] Response error:", response.error);
        console.log("[ADMCloud Items] Data length:", response.data?.length);

        if (!response.success) {
            console.error("ADMCloud API error:", response.error);
            return NextResponse.json({ 
                error: response.error || "Error al obtener artículos de ADMCloud",
                items: [],
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

        console.log("[ADMCloud Items] Mapped items count:", items.length);
        console.log("[ADMCloud Items] Items with price > 0:", items.filter(i => i.price > 0).length);

        return NextResponse.json({ 
            items: items.filter(item => item.id),
        });
    } catch (error) {
        console.error("Error fetching ADMCloud items:", error);
        return NextResponse.json({ 
            error: "Error interno del servidor",
            items: [],
        }, { status: 500 });
    }
}
