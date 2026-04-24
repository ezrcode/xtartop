import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCurrentWorkspace } from "@/actions/workspace";
import { prisma } from "@/lib/prisma";
import { createAdmCloudClient, type AdmCloudVendor } from "@/lib/admcloud/client";

export interface AdmCloudVendorMasterLine {
    id: string;
    name: string;
    fiscalId: string;
}

function normalizeVendor(vendor: AdmCloudVendor): AdmCloudVendorMasterLine | null {
    const id = String(vendor.ID || "").trim();
    const name = String(vendor.Name || vendor.ComercialName || "").trim();
    const fiscalId = String(vendor.FiscalID || "").trim();

    if (!id && !name && !fiscalId) return null;

    return {
        id,
        name,
        fiscalId,
    };
}

export async function GET(_request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const workspace = await getCurrentWorkspace();
        if (!workspace) {
            return NextResponse.json({ error: "Workspace no encontrado" }, { status: 404 });
        }

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

        if (!workspaceData?.admCloudEnabled || !workspaceData.admCloudAppId) {
            return NextResponse.json({ error: "ADMCloud no está configurado" }, { status: 400 });
        }

        const client = createAdmCloudClient({
            appId: workspaceData.admCloudAppId,
            username: workspaceData.admCloudUsername!,
            password: workspaceData.admCloudPassword!,
            company: workspaceData.admCloudCompany!,
            role: workspaceData.admCloudRole || "Administradores",
        });

        const result = await client.getVendors();
        if (!result.success) {
            return NextResponse.json({ error: result.error || "Error consultando proveedores" }, { status: 502 });
        }

        const lines = (result.data || [])
            .map(normalizeVendor)
            .filter((line): line is AdmCloudVendorMasterLine => Boolean(line))
            .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));

        return NextResponse.json({ lines });
    } catch (error) {
        console.error("[AdmCloudVendorsMasterReport] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Error interno" },
            { status: 500 }
        );
    }
}
