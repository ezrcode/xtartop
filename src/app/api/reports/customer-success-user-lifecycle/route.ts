import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/actions/workspace";

type LifecycleEventType = "ACTIVATED" | "DEACTIVATED";

interface LifecycleEvent {
    id: string;
    date: string;
    dateLabel: string;
    weekLabel: string;
    companyId: string;
    companyName: string;
    userName: string;
    eventType: LifecycleEventType;
    source: "CREATE" | "STATUS_CHANGE";
}

function parseDateInput(value: string | null): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateLabel(date: Date): string {
    return date.toLocaleDateString("es-DO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function getWeekStartSunday(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    const day = result.getDay();
    result.setDate(result.getDate() - day);
    return result;
}

function getWeekLabel(date: Date): string {
    const start = getWeekStartSunday(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const from = start.toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit" });
    const to = end.toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit" });
    return `${from} - ${to}`;
}

function parseLifecycleStatusFromSubject(subject: string | null): LifecycleEventType | null {
    if (!subject) return null;
    const normalized = subject.toLowerCase().trim();
    if (normalized.startsWith("usuario activado")) return "ACTIVATED";
    if (normalized.startsWith("usuario inactivado")) return "DEACTIVATED";
    if (normalized.startsWith("usuario eliminado")) return "DEACTIVATED";
    return null;
}

function parseUserNameFromSubject(subject: string | null): string {
    if (!subject) return "Usuario";
    const parts = subject.split(":");
    if (parts.length > 1) {
        const parsed = parts.slice(1).join(":").trim();
        if (parsed) return parsed;
    }
    return "Usuario";
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

        const now = new Date();
        const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
        const from = parseDateInput(request.nextUrl.searchParams.get("dateFrom")) || defaultFrom;
        const to = parseDateInput(request.nextUrl.searchParams.get("dateTo")) || now;
        to.setHours(23, 59, 59, 999);

        const [companies, allClientUsers, statusActivities] = await Promise.all([
            prisma.company.findMany({
                where: { workspaceId: workspace.id },
                select: { id: true, name: true },
            }),
            prisma.clientUser.findMany({
                where: { company: { workspaceId: workspace.id } },
                select: {
                    id: true,
                    fullName: true,
                    status: true,
                    companyId: true,
                    createdAt: true,
                },
            }),
            prisma.activity.findMany({
                where: {
                    workspaceId: workspace.id,
                    type: "CLIENT_USER",
                    createdAt: {
                        gte: from,
                        lte: to,
                    },
                },
                select: {
                    id: true,
                    companyId: true,
                    emailSubject: true,
                    createdAt: true,
                },
                orderBy: { createdAt: "asc" },
            }),
        ]);

        const companyNameById = new Map(companies.map((company) => [company.id, company.name]));
        const events: LifecycleEvent[] = [];

        for (const clientUser of allClientUsers) {
            if (clientUser.createdAt < from || clientUser.createdAt > to) continue;
            const companyName = companyNameById.get(clientUser.companyId);
            if (!companyName) continue;

            events.push({
                id: `create-${clientUser.id}`,
                date: clientUser.createdAt.toISOString(),
                dateLabel: toDateLabel(clientUser.createdAt),
                weekLabel: getWeekLabel(clientUser.createdAt),
                companyId: clientUser.companyId,
                companyName,
                userName: clientUser.fullName,
                eventType: "ACTIVATED",
                source: "CREATE",
            });
        }

        for (const activity of statusActivities) {
            if (!activity.companyId) continue;
            const companyName = companyNameById.get(activity.companyId);
            if (!companyName) continue;

            const eventType = parseLifecycleStatusFromSubject(activity.emailSubject);
            if (!eventType) continue;

            events.push({
                id: `activity-${activity.id}`,
                date: activity.createdAt.toISOString(),
                dateLabel: toDateLabel(activity.createdAt),
                weekLabel: getWeekLabel(activity.createdAt),
                companyId: activity.companyId,
                companyName,
                userName: parseUserNameFromSubject(activity.emailSubject),
                eventType,
                source: "STATUS_CHANGE",
            });
        }

        events.sort((a, b) => a.date.localeCompare(b.date));

        const activeNowByCompanyMap = new Map<string, number>();
        for (const clientUser of allClientUsers) {
            if (clientUser.status !== "ACTIVE") continue;
            activeNowByCompanyMap.set(
                clientUser.companyId,
                (activeNowByCompanyMap.get(clientUser.companyId) || 0) + 1
            );
        }

        const activeNowByCompany = companies
            .map((company) => ({
                companyId: company.id,
                companyName: company.name,
                activeUsers: activeNowByCompanyMap.get(company.id) || 0,
            }))
            .sort((a, b) => a.companyName.localeCompare(b.companyName, "es"));

        const activeNowTotal = activeNowByCompany.reduce((acc, row) => acc + row.activeUsers, 0);

        return NextResponse.json({
            events,
            activeNowByCompany,
            activeNowTotal,
            range: {
                from: from.toISOString().split("T")[0],
                to: to.toISOString().split("T")[0],
            },
        });
    } catch (error) {
        console.error("[Customer Success User Lifecycle Report] Error:", error);
        return NextResponse.json({ error: "Error interno al consultar el reporte" }, { status: 500 });
    }
}
