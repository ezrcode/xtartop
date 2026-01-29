import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/actions/workspace";

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
            // Return mock data for testing when ADMCloud is not configured
            return NextResponse.json({
                items: [],
                message: "ADMCloud no está configurado en este workspace",
            });
        }

        // Fetch items from ADMCloud
        const admCloudUrl = `https://api.admcloud.net/api/Items?skip=0&appid=${workspaceData.admCloudAppId}&company=${workspaceData.admCloudCompany}&role=${workspaceData.admCloudRole || "Administradores"}`;

        const headers: HeadersInit = {
            "Content-Type": "application/json",
        };

        // Add Basic Auth if credentials are available
        if (workspaceData.admCloudUsername && workspaceData.admCloudPassword) {
            const credentials = Buffer.from(`${workspaceData.admCloudUsername}:${workspaceData.admCloudPassword}`).toString("base64");
            headers["Authorization"] = `Basic ${credentials}`;
        }

        const response = await fetch(admCloudUrl, {
            method: "GET",
            headers,
            cache: "no-store",
        });

        if (!response.ok) {
            console.error("ADMCloud API error:", response.status, await response.text());
            return NextResponse.json({ 
                error: "Error al obtener artículos de ADMCloud",
                status: response.status 
            }, { status: 500 });
        }

        const data = await response.json();

        // Transform the data to a simpler format
        const items = Array.isArray(data) ? data.map((item: {
            Id?: string;
            Code?: string;
            Name?: string;
            Price?: number;
            Description?: string;
        }) => ({
            id: item.Id || "",
            code: item.Code || "",
            name: item.Name || item.Description || "",
            price: item.Price || 0,
        })) : [];

        return NextResponse.json({ items });
    } catch (error) {
        console.error("Error fetching ADMCloud items:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
