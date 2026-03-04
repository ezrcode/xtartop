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

interface ClickUpAssigneeLike {
    username?: string | null;
    email?: string | null;
    initials?: string | null;
    id?: string | number | null;
}

function extractCompletionDate(task: ClickUpTask): Date | null {
    const record = task as unknown as Record<string, unknown>;
    const rawCandidates = [
        task.date_closed,
        typeof record.date_done === "string" ? record.date_done : null,
        task.date_updated,
    ];

    for (const raw of rawCandidates) {
        if (!raw) continue;
        const value = Number(raw);
        if (Number.isFinite(value) && value > 0) {
            const parsed = new Date(value);
            if (!Number.isNaN(parsed.getTime())) return parsed;
        }
    }
    return null;
}

function parseDateInput(value: string | null): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

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

    const parseRawValue = (raw: unknown, depth = 0): string | null => {
        if (depth > 6) return null;

        if (typeof raw === "string") {
            const trimmed = raw.trim();
            if (!trimmed) return null;

            if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
                try {
                    const parsed = JSON.parse(trimmed);
                    const nested = parseRawValue(parsed, depth + 1);
                    if (nested) return nested;
                } catch {
                    // ignore malformed JSON string
                }
            }

            const byOption = resolveByOptionRef(trimmed);
            if (byOption) return byOption;
            return trimmed;
        }

        if (typeof raw === "number") {
            return resolveByOptionRef(raw);
        }

        if (Array.isArray(raw)) {
            const values = raw
                .map((item) => parseRawValue(item, depth + 1))
                .filter((value): value is string => Boolean(value));
            if (values.length > 0) return values.join(", ");
            return null;
        }

        if (raw && typeof raw === "object") {
            const record = raw as Record<string, unknown>;
            if (typeof record.name === "string" && record.name.trim()) return record.name.trim();
            if (typeof record.label === "string" && record.label.trim()) return record.label.trim();
            if (typeof record.value === "string" && record.value.trim()) return record.value.trim();
            if (record.id !== undefined) {
                const byOption = resolveByOptionRef(record.id);
                if (byOption) return byOption;
            }
            if (record.orderindex !== undefined) {
                const byOption = resolveByOptionRef(record.orderindex);
                if (byOption) return byOption;
            }

            const nested = Object.values(record)
                .map((value) => parseRawValue(value, depth + 1))
                .filter((value): value is string => Boolean(value));
            if (nested.length > 0) return nested[0];
        }

        return null;
    };

    return parseRawValue(field.value) || "Sin cliente";
}

function normalizeTask(
    task: ClickUpTask,
    clientFieldId: string,
    fallbackOptions: Array<{ id?: string; orderindex?: number | string; name?: string }> = []
): ClosedTicketLine {
    const closedAt = extractCompletionDate(task);
    const clientField = task.custom_fields?.find((field) => field.id === clientFieldId);

    const normalizedAssignees = (task.assignees || [])
        .map((assignee) => {
            const raw = assignee as unknown as ClickUpAssigneeLike;
            const label = raw.username || raw.email || raw.initials || (raw.id !== undefined && raw.id !== null ? String(raw.id) : "");
            return String(label || "").trim();
        })
        .filter(Boolean);

    return {
        id: task.id,
        name: task.name,
        status: task.status.status,
        closedAt: closedAt ? closedAt.toISOString() : "",
        closedDate: closedAt ? closedAt.toISOString().split("T")[0] : "",
        client: getClientFieldValue(clientField, fallbackOptions),
        assignees: normalizedAssignees,
        url: task.url,
    };
}

function isCompletedStatus(status: string): boolean {
    const normalized = status.trim().toLowerCase();
    return (
        normalized.includes("completad") ||
        normalized.includes("complete") ||
        normalized.includes("done") ||
        normalized.includes("cerrad") ||
        normalized.includes("resuelto")
    );
}

function isClosedType(task: ClickUpTask): boolean {
    const type = (task.status?.type || "").toLowerCase();
    return type === "closed" || type === "done";
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
        const [taskResult, fieldsResult] = await Promise.all([
            client.getTasks(workspaceConfig.clickUpListId, {
                subtasks: true,
                include_closed: true,
            }),
            client.getListFields(workspaceConfig.clickUpListId),
        ]);

        if (!taskResult.success || !taskResult.data) {
            return NextResponse.json({ error: taskResult.error || "Error consultando ClickUp" }, { status: 502 });
        }

        const clientFieldOptions = (fieldsResult.success && fieldsResult.data
            ? fieldsResult.data.find((field) => field.id === workspaceConfig.clickUpClientFieldId)?.type_config?.options
            : undefined) as Array<{ id?: string; orderindex?: number | string; name?: string }> | undefined;

        const taskLevelOptions = taskResult.data
            .flatMap((task) => task.custom_fields || [])
            .filter((field) => field.id === workspaceConfig.clickUpClientFieldId)
            .flatMap((field) => {
                const typeConfig = field.type_config as
                    | { options?: Array<{ id?: string; orderindex?: number | string; name?: string }> }
                    | undefined;
                return typeConfig?.options || [];
            });

        const mergedOptionsMap = new Map<string, { id?: string; orderindex?: number | string; name?: string }>();
        for (const option of [...(clientFieldOptions || []), ...taskLevelOptions]) {
            const key = option.id ? `id:${option.id}` : option.orderindex !== undefined ? `order:${String(option.orderindex)}` : `name:${option.name || ""}`;
            mergedOptionsMap.set(key, option);
        }
        const mergedOptions = Array.from(mergedOptionsMap.values());

        const lines = taskResult.data
            .filter((task) => isCompletedStatus(task.status.status) || isClosedType(task))
            .map((task) => normalizeTask(task, workspaceConfig.clickUpClientFieldId!, mergedOptions))
            .filter((line) => {
                if (!line.closedAt) return false;
                const closed = new Date(line.closedAt);
                if (from && closed < from) return false;
                if (to && closed > to) return false;
                return true;
            })
            .sort((a, b) => b.closedAt.localeCompare(a.closedAt));

        const clientsFromLines = lines
            .map((line) => line.client?.trim())
            .filter((client): client is string => Boolean(client && client !== "Sin cliente"));
        const clientsFromFieldOptions = mergedOptions
            .map((option) => option.name?.trim())
            .filter((name): name is string => Boolean(name));
        const clients = Array.from(new Set([...clientsFromFieldOptions, ...clientsFromLines])).sort((a, b) =>
            a.localeCompare(b, "es")
        );

        const assignees = Array.from(
            new Set(
                lines
                    .flatMap((line) => line.assignees || [])
                    .map((assignee) => assignee.trim())
                    .filter((assignee) => assignee.length > 0 && assignee.toLowerCase() !== "sin asignado")
            )
        ).sort((a, b) => a.localeCompare(b, "es"));

        return NextResponse.json({ lines, clients, assignees });
    } catch (error) {
        console.error("[ClickUp Closed Tickets Report] Error:", error);
        return NextResponse.json({ error: "Error interno al consultar el reporte" }, { status: 500 });
    }
}
