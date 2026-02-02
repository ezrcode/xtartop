import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/actions/workspace";
import { createAdmCloudClient } from "@/lib/admcloud/client";

interface PriceListInfo {
    id: string;
    name: string;
}

export async function GET() {
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
                priceLists: [],
                message: "ADMCloud no está configurado en este workspace",
            });
        }

        if (!workspaceData.admCloudUsername || !workspaceData.admCloudPassword) {
            return NextResponse.json({
                priceLists: [],
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

        // Get price lists from PriceList endpoint
        const priceListResponse = await client.getPriceLists();

        if (!priceListResponse.success) {
            return NextResponse.json({ 
                error: priceListResponse.error || "Error al obtener listas de precios de ADMCloud",
                priceLists: [],
            }, { status: 500 });
        }

        // Extract unique price lists from the response
        // PriceList endpoint returns items with PriceLevelID and PriceLevelName
        const priceListsMap = new Map<string, PriceListInfo>();
        
        for (const item of (priceListResponse.data || [])) {
            const record = item as Record<string, unknown>;
            const id = (record.PriceLevelID || "") as string;
            const name = (record.PriceLevelName || "") as string;
            
            if (id && name && !priceListsMap.has(id)) {
                priceListsMap.set(id, { id, name });
            }
        }

        const priceLists = Array.from(priceListsMap.values());
        
        // Sort alphabetically by name
        priceLists.sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json({ priceLists });
    } catch (error) {
        console.error("Error fetching ADMCloud price lists:", error);
        return NextResponse.json({ 
            error: "Error interno del servidor",
            priceLists: [],
        }, { status: 500 });
    }
}
