import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/actions/workspace";
import { createClickUpClient, ClickUpCustomField, ClickUpTask } from "@/lib/clickup/client";

interface ClosedTicketLine {
    id: string;
    name: string;
    status: string;
    closedAt: string;
    closedDate: string;
    client: string;
    assignees: string[];
    url: string;
}

function parseDateInput(value: string | null): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getClientFieldValue(field?: ClickUpCustomField): string {
    if (!field) return "Sin cliente";

    const raw = field.value;
    if (typeof raw === "string" && raw.trim()) {
        return raw.trim();
    }

    if (typeof raw === "number" && field.type_config) {
        const options = (field.type_config as { options?: Array<{ orderindex: number; name: string }> }).options;
        const selected = options?.find((opt) => opt.orderindex === raw);
        if (selected?.name) return selected.name;
    }

    return "Sin cliente";
}

function normalizeTask(task: ClickUpTask, clientFieldId: string): ClosedTicketLine {
    const closedAt = task.date_closed ? new Date(Number(task.date_closed)) : null;
    const clientField = task.custom_fields?.find((field) => field.id === clientFieldId);

    return {
        id: task.id,
        name: task.name,
        status: task.status.status,
        closedAt: closedAt ? closedAt.toISOString() : "",
        closedDate: closedAt ? closedAt.toISOString().split("T")[0] : "",
        client: getClientFieldValue(clientField),
        assignees: task.assignees?.map((assignee) => assignee.username).filter(Boolean) || [],
        url: task.url,
    };
}

function isCompletedStatus(status: string): boolean {
    const normalized = status.trim().toLowerCase();
    return normalized.includes("completad");
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

        const workspaceConfig = await prisma.workspace.findUnique({
            where: { id: workspace.id },
            select: {
                clickUpEnabled: true,
                clickUpApiToken: true,
                clickUpListId: true,
                clickUpClientFieldId: true,
            },
        });

        if (!workspaceConfig?.clickUpEnabled) {
            return NextResponse.json({ error: "Integración con ClickUp no habilitada" }, { status: 400 });
        }

        if (!workspaceConfig.clickUpApiToken || !workspaceConfig.clickUpListId || !workspaceConfig.clickUpClientFieldId) {
            return NextResponse.json({ error: "Configuración de ClickUp incompleta" }, { status: 400 });
        }

        const from = parseDateInput(request.nextUrl.searchParams.get("dateFrom"));
        const to = parseDateInput(request.nextUrl.searchParams.get("dateTo"));

        if (to) {
            to.setHours(23, 59, 59, 999);
        }

        const client = createClickUpClient(workspaceConfig.clickUpApiToken);
        const taskResult = await client.getTasks(workspaceConfig.clickUpListId, {
            subtasks: true,
            include_closed: true,
        });

        if (!taskResult.success || !taskResult.data) {
            return NextResponse.json({ error: taskResult.error || "Error consultando ClickUp" }, { status: 502 });
        }

        const lines = taskResult.data
            .filter((task) => task.date_closed && isCompletedStatus(task.status.status))
            .map((task) => normalizeTask(task, workspaceConfig.clickUpClientFieldId!))
            .filter((line) => {
                if (!line.closedAt) return false;
                const closed = new Date(line.closedAt);
                if (from && closed < from) return false;
                if (to && closed > to) return false;
                return true;
            })
            .sort((a, b) => b.closedAt.localeCompare(a.closedAt));

        return NextResponse.json({ lines });
    } catch (error) {
        console.error("[ClickUp Closed Tickets Report] Error:", error);
        return NextResponse.json({ error: "Error interno al consultar el reporte" }, { status: 500 });
    }
}
