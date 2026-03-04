import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/actions/workspace";
import { createClickUpClient, ClickUpCustomField } from "@/lib/clickup/client";

function getClientFieldValue(
    field: ClickUpCustomField | undefined,
    fallbackOptions: Array<{ id?: string; orderindex?: number | string; name?: string }> = []
): string {
    if (!field) return "Sin cliente";

    const typeConfig = field.type_config as
        | { options?: Array<{ id?: string; orderindex?: number | string; name?: string }> }
        | undefined;
    const options = typeConfig?.options || fallbackOptions;

    const resolveByOptionRef = (ref: unknown): string | null => {
        if (typeof ref === "number" || typeof ref === "string") {
            const normalized = String(ref).trim();
            const selected = options.find((opt) => {
                const byId = opt.id ? String(opt.id) === normalized : false;
                const byOrder = opt.orderindex !== undefined ? String(opt.orderindex) === normalized : false;
                return byId || byOrder;
            });
            if (selected?.name?.trim()) return selected.name.trim();
        }
        return null;
    };

    const parseRawValue = (raw: unknown): string | null => {
        if (typeof raw === "string") {
            const trimmed = raw.trim();
            if (!trimmed) return null;
            const byOption = resolveByOptionRef(trimmed);
            if (byOption) return byOption;
            return trimmed;
        }
        if (typeof raw === "number") return resolveByOptionRef(raw);
        if (Array.isArray(raw)) {
            const values = raw
                .map((item) => parseRawValue(item))
                .filter((value): value is string => Boolean(value));
            return values.length > 0 ? values.join(", ") : null;
        }
        if (raw && typeof raw === "object") {
            const record = raw as Record<string, unknown>;
            if (typeof record.name === "string" && record.name.trim()) return record.name.trim();
            if (typeof record.label === "string" && record.label.trim()) return record.label.trim();
            if (record.id !== undefined) {
                const byOption = resolveByOptionRef(record.id);
                if (byOption) return byOption;
            }
        }
        return null;
    };

    return parseRawValue(field.value) || "Sin cliente";
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

        const config = await prisma.workspace.findUnique({
            where: { id: workspace.id },
            select: {
                clickUpEnabled: true,
                clickUpApiToken: true,
                clickUpListId: true,
                clickUpClientFieldId: true,
            },
        });

        if (!config?.clickUpEnabled || !config.clickUpApiToken || !config.clickUpListId || !config.clickUpClientFieldId) {
            return NextResponse.json({ error: "Configuración de ClickUp incompleta" }, { status: 400 });
        }

        const client = createClickUpClient(config.clickUpApiToken);
        const [tasksResult, fieldsResult] = await Promise.all([
            client.getTasks(config.clickUpListId, { include_closed: true, subtasks: true }),
            client.getListFields(config.clickUpListId),
        ]);

        if (!tasksResult.success || !tasksResult.data) {
            return NextResponse.json({ error: tasksResult.error || "Error consultando tareas" }, { status: 502 });
        }

        const fieldDef = fieldsResult.success
            ? fieldsResult.data?.find((field) => field.id === config.clickUpClientFieldId)
            : null;
        const options = (fieldDef?.type_config as { options?: Array<{ id?: string; orderindex?: number | string; name?: string }> } | undefined)?.options || [];

        const sample = tasksResult.data.slice(0, 20).map((task) => {
            const clientField = (task.custom_fields || []).find((field) => field.id === config.clickUpClientFieldId);
            return {
                taskId: task.id,
                taskName: task.name,
                status: task.status?.status,
                statusType: task.status?.type,
                assigneesRaw: task.assignees,
                assigneesParsed: (task.assignees || [])
                    .map((assignee) => assignee.username || assignee.email || assignee.initials || String(assignee.id))
                    .filter(Boolean),
                clientFieldRaw: clientField || null,
                clientParsed: getClientFieldValue(clientField, options),
            };
        });

        const clientsDetected = Array.from(
            new Set(sample.map((row) => row.clientParsed).filter((value) => value && value !== "Sin cliente"))
        );

        return NextResponse.json({
            clickupConfig: {
                listId: config.clickUpListId,
                clientFieldId: config.clickUpClientFieldId,
            },
            fieldDefinition: fieldDef || null,
            optionsCount: options.length,
            tasksCount: tasksResult.data.length,
            clientsDetected,
            sample,
        });
    } catch (error) {
        console.error("[ClickUp Closed Tickets Debug] Error:", error);
        return NextResponse.json({ error: "Error interno de diagnóstico" }, { status: 500 });
    }
}
