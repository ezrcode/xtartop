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

        if (!response.success) {
            console.error("ADMCloud API error:", response.error);
            return NextResponse.json({ 
                error: response.error || "Error al obtener artículos de ADMCloud",
                items: [],
            }, { status: 500 });
        }

        // Log the raw response for debugging
        console.log("[ADMCloud Items] Raw response sample:", JSON.stringify(response.data?.slice(0, 2), null, 2));

        // Transform the data to a simpler format
        // ADMCloud puede usar diferentes campos según la versión de la API
        const items = (response.data || []).map((item) => ({
            id: item.ID || item.ItemID || "",
            code: item.Code || "",
            name: item.Name || item.Description || "",
            price: item.SalesPrice || item.Price || item.UnitPrice || 0,
        })).filter(item => item.id); // Solo items con ID válido

        return NextResponse.json({ items });
    } catch (error) {
        console.error("Error fetching ADMCloud items:", error);
        return NextResponse.json({ 
            error: "Error interno del servidor",
            items: [],
        }, { status: 500 });
    }
}
