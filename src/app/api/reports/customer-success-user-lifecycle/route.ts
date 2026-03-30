import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/actions/workspace";

type LifecycleEventType = "ACTIVATED" | "DEACTIVATED";
type LifecycleEntity = "USER" | "PROJECT";

interface LifecycleEvent {
    id: string;
    date: string;
    dateLabel: string;
    weekLabel: string;
    companyId: string;
    companyName: string;
    itemName: string;
    eventType: LifecycleEventType;
    entityType: LifecycleEntity;
    source: "CREATE" | "STATUS_CHANGE";
}

interface CompanySummary {
    companyId: string;
    companyName: string;
    activated: number;
    deactivated: number;
    activeAtStart: number;
    activeAtEnd: number;
    activeCurrent: number;
    net: number;
}

function parseProjectStatusFromSubject(subject: string | null): LifecycleEventType | null {
    if (!subject) return null;
    const normalized = subject.toLowerCase().trim();
    if (normalized.startsWith("proyecto activado")) return "ACTIVATED";
    if (normalized.startsWith("proyecto inactivado")) return "DEACTIVATED";
    if (normalized.startsWith("proyecto eliminado")) return "DEACTIVATED";
    return null;
}

function parseItemNameFromSubject(subject: string | null, fallback: string): string {
    if (!subject) return fallback;
    const parts = subject.split(":");
    if (parts.length > 1) {
        const parsed = parts.slice(1).join(":").trim();
        if (parsed) return parsed;
    }
    return fallback;
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

        const [companies, allClientUsers, userActivities, allProjects, projectActivities] = await Promise.all([
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
                },
                select: {
                    id: true,
                    companyId: true,
                    emailSubject: true,
                    createdAt: true,
                },
                orderBy: { createdAt: "asc" },
            }),
            prisma.project.findMany({
                where: { company: { workspaceId: workspace.id } },
                select: {
                    id: true,
                    name: true,
                    status: true,
                    companyId: true,
                    createdAt: true,
                },
            }),
            prisma.activity.findMany({
                where: {
                    workspaceId: workspace.id,
                    type: "PROJECT",
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
        const allUserEvents: LifecycleEvent[] = [];
        const allProjectEvents: LifecycleEvent[] = [];

        for (const clientUser of allClientUsers) {
            const companyName = companyNameById.get(clientUser.companyId);
            if (!companyName) continue;

            allUserEvents.push({
                id: `create-${clientUser.id}`,
                date: clientUser.createdAt.toISOString(),
                dateLabel: toDateLabel(clientUser.createdAt),
                weekLabel: getWeekLabel(clientUser.createdAt),
                companyId: clientUser.companyId,
                companyName,
                itemName: clientUser.fullName,
                eventType: "ACTIVATED",
                entityType: "USER",
                source: "CREATE",
            });
        }

        for (const activity of userActivities) {
            if (!activity.companyId) continue;
            const companyName = companyNameById.get(activity.companyId);
            if (!companyName) continue;

            const eventType = parseLifecycleStatusFromSubject(activity.emailSubject);
            if (!eventType) continue;

            allUserEvents.push({
                id: `activity-${activity.id}`,
                date: activity.createdAt.toISOString(),
                dateLabel: toDateLabel(activity.createdAt),
                weekLabel: getWeekLabel(activity.createdAt),
                companyId: activity.companyId,
                companyName,
                itemName: parseItemNameFromSubject(activity.emailSubject, "Usuario"),
                eventType,
                entityType: "USER",
                source: "STATUS_CHANGE",
            });
        }

        for (const project of allProjects) {
            const companyName = companyNameById.get(project.companyId);
            if (!companyName) continue;

            allProjectEvents.push({
                id: `create-project-${project.id}`,
                date: project.createdAt.toISOString(),
                dateLabel: toDateLabel(project.createdAt),
                weekLabel: getWeekLabel(project.createdAt),
                companyId: project.companyId,
                companyName,
                itemName: project.name,
                eventType: "ACTIVATED",
                entityType: "PROJECT",
                source: "CREATE",
            });
        }

        for (const activity of projectActivities) {
            if (!activity.companyId) continue;
            const companyName = companyNameById.get(activity.companyId);
            if (!companyName) continue;

            const eventType = parseProjectStatusFromSubject(activity.emailSubject);
            if (!eventType) continue;

            allProjectEvents.push({
                id: `activity-project-${activity.id}`,
                date: activity.createdAt.toISOString(),
                dateLabel: toDateLabel(activity.createdAt),
                weekLabel: getWeekLabel(activity.createdAt),
                companyId: activity.companyId,
                companyName,
                itemName: parseItemNameFromSubject(activity.emailSubject, "Proyecto"),
                eventType,
                entityType: "PROJECT",
                source: "STATUS_CHANGE",
            });
        }

        allUserEvents.sort((a, b) => a.date.localeCompare(b.date));
        allProjectEvents.sort((a, b) => a.date.localeCompare(b.date));

        const events = allUserEvents.filter((event) => {
            const eventDate = new Date(event.date);
            return eventDate >= from && eventDate <= to;
        });
        const projectEvents = allProjectEvents.filter((event) => {
            const eventDate = new Date(event.date);
            return eventDate >= from && eventDate <= to;
        });

        const activeNowByCompanyMap = new Map<string, number>();
        for (const clientUser of allClientUsers) {
            if (clientUser.status !== "ACTIVE") continue;
            activeNowByCompanyMap.set(
                clientUser.companyId,
                (activeNowByCompanyMap.get(clientUser.companyId) || 0) + 1
            );
        }

        const activeAtStartByCompanyMap = new Map(activeNowByCompanyMap);
        const activeAtEndByCompanyMap = new Map(activeNowByCompanyMap);

        for (const event of allUserEvents) {
            const eventDate = new Date(event.date);
            const startCurrent = activeAtStartByCompanyMap.get(event.companyId) || 0;
            const endCurrent = activeAtEndByCompanyMap.get(event.companyId) || 0;

            if (eventDate >= from) {
                activeAtStartByCompanyMap.set(
                    event.companyId,
                    Math.max(
                        0,
                        startCurrent + (event.eventType === "ACTIVATED" ? -1 : 1)
                    )
                );
            }

            if (eventDate > to) {
                activeAtEndByCompanyMap.set(
                    event.companyId,
                    Math.max(
                        0,
                        endCurrent + (event.eventType === "ACTIVATED" ? -1 : 1)
                    )
                );
            }
        }

        const activeProjectsNowByCompanyMap = new Map<string, number>();
        for (const project of allProjects) {
            if (project.status !== "ACTIVE") continue;
            activeProjectsNowByCompanyMap.set(
                project.companyId,
                (activeProjectsNowByCompanyMap.get(project.companyId) || 0) + 1
            );
        }

        const activeProjectsAtStartByCompanyMap = new Map(activeProjectsNowByCompanyMap);
        const activeProjectsAtEndByCompanyMap = new Map(activeProjectsNowByCompanyMap);

        for (const event of allProjectEvents) {
            const eventDate = new Date(event.date);
            const startCurrent = activeProjectsAtStartByCompanyMap.get(event.companyId) || 0;
            const endCurrent = activeProjectsAtEndByCompanyMap.get(event.companyId) || 0;

            if (eventDate >= from) {
                activeProjectsAtStartByCompanyMap.set(
                    event.companyId,
                    Math.max(0, startCurrent + (event.eventType === "ACTIVATED" ? -1 : 1))
                );
            }

            if (eventDate > to) {
                activeProjectsAtEndByCompanyMap.set(
                    event.companyId,
                    Math.max(0, endCurrent + (event.eventType === "ACTIVATED" ? -1 : 1))
                );
            }
        }

        const activeNowByCompany = companies
            .map((company) => ({
                companyId: company.id,
                companyName: company.name,
                activeUsers: activeNowByCompanyMap.get(company.id) || 0,
            }))
            .sort((a, b) => a.companyName.localeCompare(b.companyName, "es"));

        const activeNowTotal = activeNowByCompany.reduce((acc, row) => acc + row.activeUsers, 0);
        const companySummary: CompanySummary[] = companies
            .map((company) => {
                const companyEvents = events.filter((event) => event.companyId === company.id);
                const activated = companyEvents.filter((event) => event.eventType === "ACTIVATED").length;
                const deactivated = companyEvents.filter((event) => event.eventType === "DEACTIVATED").length;
                const activeCurrent = activeNowByCompanyMap.get(company.id) || 0;
                const activeAtStart = activeAtStartByCompanyMap.get(company.id) || 0;
                const activeAtEnd = activeAtEndByCompanyMap.get(company.id) || 0;

                return {
                    companyId: company.id,
                    companyName: company.name,
                    activated,
                    deactivated,
                    activeAtStart,
                    activeAtEnd,
                    activeCurrent,
                    net: activated - deactivated,
                };
            })
            .sort((a, b) => a.companyName.localeCompare(b.companyName, "es"));

        const projectSummary: CompanySummary[] = companies
            .map((company) => {
                const companyEvents = projectEvents.filter((event) => event.companyId === company.id);
                const activated = companyEvents.filter((event) => event.eventType === "ACTIVATED").length;
                const deactivated = companyEvents.filter((event) => event.eventType === "DEACTIVATED").length;
                const activeCurrent = activeProjectsNowByCompanyMap.get(company.id) || 0;
                const activeAtStart = activeProjectsAtStartByCompanyMap.get(company.id) || 0;
                const activeAtEnd = activeProjectsAtEndByCompanyMap.get(company.id) || 0;

                return {
                    companyId: company.id,
                    companyName: company.name,
                    activated,
                    deactivated,
                    activeAtStart,
                    activeAtEnd,
                    activeCurrent,
                    net: activated - deactivated,
                };
            })
            .sort((a, b) => a.companyName.localeCompare(b.companyName, "es"));

        const activeStartTotal = companySummary.reduce((acc, row) => acc + row.activeAtStart, 0);
        const activeEndTotal = companySummary.reduce((acc, row) => acc + row.activeAtEnd, 0);

        return NextResponse.json({
            events,
            projectEvents,
            activeNowByCompany,
            activeNowTotal,
            activeStartTotal,
            activeEndTotal,
            companySummary,
            projectSummary,
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
