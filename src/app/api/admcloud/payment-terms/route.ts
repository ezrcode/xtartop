import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/actions/workspace";
import { createAdmCloudClient } from "@/lib/admcloud/client";

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
                paymentTerms: [],
                message: "ADMCloud no está configurado en este workspace",
            });
        }

        if (!workspaceData.admCloudUsername || !workspaceData.admCloudPassword) {
            return NextResponse.json({
                paymentTerms: [],
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

        // Get payment terms
        const response = await client.getPaymentTerms();

        if (!response.success) {
            return NextResponse.json({ 
                error: response.error || "Error al obtener términos de pago de ADMCloud",
                paymentTerms: [],
            }, { status: 500 });
        }

        // Map to simple id/name objects
        const paymentTerms = (response.data || []).map((term) => ({
            id: term.ID,
            name: term.Name,
        }));
        
        // Sort alphabetically by name
        paymentTerms.sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json({ paymentTerms });
    } catch (error) {
        console.error("Error fetching ADMCloud payment terms:", error);
        return NextResponse.json({ 
            error: "Error interno del servidor",
            paymentTerms: [],
        }, { status: 500 });
    }
}
