import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateAgentRequest, jsonAgentResponse } from "@/lib/agent-api/auth";

export const dynamic = "force-dynamic";

type Params = {
    params: {
        resource: string;
    };
};

function getPagination(request: NextRequest) {
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") || "1") || 1);
    const requestedLimit = Math.max(1, Number(request.nextUrl.searchParams.get("limit") || "100") || 100);
    const limit = Math.min(requestedLimit, 200);

    return {
        page,
        limit,
        skip: (page - 1) * limit,
    };
}

function getSearch(request: NextRequest) {
    return request.nextUrl.searchParams.get("search")?.trim() || "";
}

function getDateRange(request: NextRequest) {
    const dateFrom = request.nextUrl.searchParams.get("dateFrom");
    const dateTo = request.nextUrl.searchParams.get("dateTo");

    return {
        dateFrom: dateFrom ? new Date(dateFrom) : null,
        dateTo: dateTo ? new Date(`${dateTo}T23:59:59.999`) : null,
    };
}

function createdAtRange(request: NextRequest) {
    const { dateFrom, dateTo } = getDateRange(request);
    if (!dateFrom && !dateTo) return undefined;

    return {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
    };
}

function paginationPayload(total: number, page: number, limit: number) {
    return {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    };
}

async function getWorkspace(workspaceId: string) {
    return prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: {
            id: true,
            name: true,
            slug: true,
            legalName: true,
            rnc: true,
            address: true,
            phone: true,
            logoUrl: true,
            contractVersion: true,
            commissionMarginRate: true,
            createdAt: true,
            _count: {
                select: {
                    contacts: true,
                    companies: true,
                    deals: true,
                    activities: true,
                    businessLines: true,
                    purchaseOrders: true,
                },
            },
        },
    });
}

async function getCompanies(workspaceId: string, request: NextRequest) {
    const { page, limit, skip } = getPagination(request);
    const search = getSearch(request);
    const type = request.nextUrl.searchParams.get("type") || undefined;
    const status = request.nextUrl.searchParams.get("status") || undefined;

    const where = {
        workspaceId,
        ...(type ? { type: type as never } : {}),
        ...(status ? { status: status as never } : {}),
        ...(search
            ? {
                OR: [
                    { name: { contains: search, mode: "insensitive" as const } },
                    { legalName: { contains: search, mode: "insensitive" as const } },
                    { taxId: { contains: search, mode: "insensitive" as const } },
                    { city: { contains: search, mode: "insensitive" as const } },
                ],
            }
            : {}),
    };

    const [total, data] = await Promise.all([
        prisma.company.count({ where }),
        prisma.company.findMany({
            where,
            orderBy: { updatedAt: "desc" },
            skip,
            take: limit,
            select: {
                id: true,
                name: true,
                legalName: true,
                taxId: true,
                fiscalAddress: true,
                initialProjects: true,
                initialUsers: true,
                country: true,
                city: true,
                phone: true,
                website: true,
                origin: true,
                status: true,
                type: true,
                termsAccepted: true,
                termsAcceptedAt: true,
                termsAcceptedByName: true,
                termsVersion: true,
                clickUpClientName: true,
                createdAt: true,
                updatedAt: true,
                primaryContact: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        mobile: true,
                        title: true,
                    },
                },
                subscriptionBilling: {
                    select: {
                        billingType: true,
                        autoBillingEnabled: true,
                        billingDay: true,
                        billingMonthOffset: true,
                        items: {
                            select: {
                                id: true,
                                code: true,
                                description: true,
                                price: true,
                                countType: true,
                                manualQuantity: true,
                                calculatedBase: true,
                                calculatedSubtract: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        contacts: true,
                        deals: true,
                        quotes: true,
                        projects: true,
                        clientUsers: true,
                        activities: true,
                    },
                },
            },
        }),
    ]);

    return { data, pagination: paginationPayload(total, page, limit) };
}

async function getContacts(workspaceId: string, request: NextRequest) {
    const { page, limit, skip } = getPagination(request);
    const search = getSearch(request);
    const status = request.nextUrl.searchParams.get("status") || undefined;

    const where = {
        workspaceId,
        ...(status ? { status: status as never } : {}),
        ...(search
            ? {
                OR: [
                    { fullName: { contains: search, mode: "insensitive" as const } },
                    { email: { contains: search, mode: "insensitive" as const } },
                    { mobile: { contains: search, mode: "insensitive" as const } },
                    { company: { name: { contains: search, mode: "insensitive" as const } } },
                ],
            }
            : {}),
    };

    const [total, data] = await Promise.all([
        prisma.contact.count({ where }),
        prisma.contact.findMany({
            where,
            orderBy: { updatedAt: "desc" },
            skip,
            take: limit,
            select: {
                id: true,
                fullName: true,
                title: true,
                email: true,
                mobile: true,
                status: true,
                receivesInvoices: true,
                createdAt: true,
                updatedAt: true,
                company: {
                    select: {
                        id: true,
                        name: true,
                        legalName: true,
                        type: true,
                    },
                },
                _count: {
                    select: {
                        deals: true,
                        quotes: true,
                        activities: true,
                    },
                },
            },
        }),
    ]);

    return { data, pagination: paginationPayload(total, page, limit) };
}

async function getDeals(workspaceId: string, request: NextRequest) {
    const { page, limit, skip } = getPagination(request);
    const search = getSearch(request);
    const status = request.nextUrl.searchParams.get("status") || undefined;
    const recurrence = request.nextUrl.searchParams.get("recurrence") || undefined;

    const where = {
        workspaceId,
        ...(status ? { status: status as never } : {}),
        ...(recurrence ? { recurrence: recurrence as never } : {}),
        ...(search
            ? {
                OR: [
                    { name: { contains: search, mode: "insensitive" as const } },
                    { description: { contains: search, mode: "insensitive" as const } },
                    { company: { name: { contains: search, mode: "insensitive" as const } } },
                    { contact: { fullName: { contains: search, mode: "insensitive" as const } } },
                ],
            }
            : {}),
    };

    const [total, data] = await Promise.all([
        prisma.deal.count({ where }),
        prisma.deal.findMany({
            where,
            orderBy: { updatedAt: "desc" },
            skip,
            take: limit,
            select: {
                id: true,
                number: true,
                name: true,
                description: true,
                value: true,
                mrr: true,
                arr: true,
                type: true,
                recurrence: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                businessLine: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                company: {
                    select: {
                        id: true,
                        name: true,
                        legalName: true,
                        type: true,
                    },
                },
                contact: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
                quotes: {
                    orderBy: { number: "asc" },
                    select: {
                        id: true,
                        number: true,
                        date: true,
                        status: true,
                        totalOneTime: true,
                        totalMonthly: true,
                        totalAnnual: true,
                        currency: true,
                    },
                },
                commissions: {
                    select: {
                        id: true,
                        status: true,
                        marginRate: true,
                        commissionableBase: true,
                        notes: true,
                    },
                },
            },
        }),
    ]);

    return { data, pagination: paginationPayload(total, page, limit) };
}

async function getQuotes(workspaceId: string, request: NextRequest) {
    const { page, limit, skip } = getPagination(request);
    const search = getSearch(request);
    const status = request.nextUrl.searchParams.get("status") || undefined;
    const date = createdAtRange(request);

    const where = {
        deal: { workspaceId },
        ...(status ? { status: status as never } : {}),
        ...(date ? { date } : {}),
        ...(search
            ? {
                OR: [
                    { company: { name: { contains: search, mode: "insensitive" as const } } },
                    { contact: { fullName: { contains: search, mode: "insensitive" as const } } },
                    { deal: { name: { contains: search, mode: "insensitive" as const } } },
                ],
            }
            : {}),
    };

    const [total, data] = await Promise.all([
        prisma.quote.count({ where }),
        prisma.quote.findMany({
            where,
            orderBy: { date: "desc" },
            skip,
            take: limit,
            select: {
                id: true,
                number: true,
                date: true,
                validity: true,
                status: true,
                totalOneTime: true,
                totalMonthly: true,
                totalAnnual: true,
                currency: true,
                deliveryTime: true,
                taxType: true,
                taxName: true,
                taxRate: true,
                taxAmountOneTime: true,
                taxAmountMonthly: true,
                taxAmountAnnual: true,
                createdAt: true,
                updatedAt: true,
                deal: {
                    select: {
                        id: true,
                        number: true,
                        name: true,
                        status: true,
                    },
                },
                company: {
                    select: {
                        id: true,
                        name: true,
                        legalName: true,
                    },
                },
                contact: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
                items: {
                    orderBy: { createdAt: "asc" },
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        quantity: true,
                        frequency: true,
                        netPrice: true,
                    },
                },
            },
        }),
    ]);

    return { data, pagination: paginationPayload(total, page, limit) };
}

async function getSubscriptions(workspaceId: string, request: NextRequest) {
    const { page, limit, skip } = getPagination(request);
    const search = getSearch(request);

    const where = {
        workspaceId,
        subscriptionBilling: { isNot: null },
        ...(search
            ? {
                OR: [
                    { name: { contains: search, mode: "insensitive" as const } },
                    { legalName: { contains: search, mode: "insensitive" as const } },
                ],
            }
            : {}),
    };

    const [total, data] = await Promise.all([
        prisma.company.count({ where }),
        prisma.company.findMany({
            where,
            orderBy: { name: "asc" },
            skip,
            take: limit,
            select: {
                id: true,
                name: true,
                legalName: true,
                type: true,
                initialProjects: true,
                initialUsers: true,
                subscriptionBilling: {
                    select: {
                        id: true,
                        billingType: true,
                        autoBillingEnabled: true,
                        billingDay: true,
                        billingMonthOffset: true,
                        items: {
                            select: {
                                id: true,
                                code: true,
                                description: true,
                                price: true,
                                countType: true,
                                manualQuantity: true,
                                calculatedBase: true,
                                calculatedSubtract: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        projects: true,
                        clientUsers: true,
                    },
                },
            },
        }),
    ]);

    return { data, pagination: paginationPayload(total, page, limit) };
}

async function getProjects(workspaceId: string, request: NextRequest) {
    const { page, limit, skip } = getPagination(request);
    const search = getSearch(request);
    const status = request.nextUrl.searchParams.get("status") || undefined;

    const where = {
        company: { workspaceId },
        ...(status ? { status: status as never } : {}),
        ...(search
            ? {
                OR: [
                    { name: { contains: search, mode: "insensitive" as const } },
                    { company: { name: { contains: search, mode: "insensitive" as const } } },
                ],
            }
            : {}),
    };

    const [total, data] = await Promise.all([
        prisma.project.count({ where }),
        prisma.project.findMany({
            where,
            orderBy: { updatedAt: "desc" },
            skip,
            take: limit,
            select: {
                id: true,
                name: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                company: {
                    select: {
                        id: true,
                        name: true,
                        legalName: true,
                        type: true,
                    },
                },
            },
        }),
    ]);

    return { data, pagination: paginationPayload(total, page, limit) };
}

async function getClientUsers(workspaceId: string, request: NextRequest) {
    const { page, limit, skip } = getPagination(request);
    const search = getSearch(request);
    const status = request.nextUrl.searchParams.get("status") || undefined;

    const where = {
        company: { workspaceId },
        ...(status ? { status: status as never } : {}),
        ...(search
            ? {
                OR: [
                    { fullName: { contains: search, mode: "insensitive" as const } },
                    { email: { contains: search, mode: "insensitive" as const } },
                    { company: { name: { contains: search, mode: "insensitive" as const } } },
                ],
            }
            : {}),
    };

    const [total, data] = await Promise.all([
        prisma.clientUser.count({ where }),
        prisma.clientUser.findMany({
            where,
            orderBy: { updatedAt: "desc" },
            skip,
            take: limit,
            select: {
                id: true,
                fullName: true,
                email: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                company: {
                    select: {
                        id: true,
                        name: true,
                        legalName: true,
                        type: true,
                    },
                },
            },
        }),
    ]);

    return { data, pagination: paginationPayload(total, page, limit) };
}

async function getActivities(workspaceId: string, request: NextRequest) {
    const { page, limit, skip } = getPagination(request);
    const type = request.nextUrl.searchParams.get("type") || undefined;
    const date = createdAtRange(request);

    const where = {
        workspaceId,
        ...(type ? { type: type as never } : {}),
        ...(date ? { createdAt: date } : {}),
    };

    const [total, data] = await Promise.all([
        prisma.activity.count({ where }),
        prisma.activity.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
            select: {
                id: true,
                type: true,
                emailTo: true,
                emailSubject: true,
                emailStatus: true,
                errorMsg: true,
                createdAt: true,
                company: {
                    select: {
                        id: true,
                        name: true,
                        legalName: true,
                    },
                },
                contact: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
                deal: {
                    select: {
                        id: true,
                        number: true,
                        name: true,
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        }),
    ]);

    return { data, pagination: paginationPayload(total, page, limit) };
}

export async function GET(request: NextRequest, { params }: Params) {
    const authResult = await authenticateAgentRequest(request);
    if (!authResult.ok) return authResult.response;

    const resource = params.resource.toLowerCase();
    const workspaceId = authResult.context.workspaceId;

    switch (resource) {
        case "workspace":
            return jsonAgentResponse({ data: await getWorkspace(workspaceId) });
        case "companies":
            return jsonAgentResponse(await getCompanies(workspaceId, request));
        case "contacts":
            return jsonAgentResponse(await getContacts(workspaceId, request));
        case "deals":
            return jsonAgentResponse(await getDeals(workspaceId, request));
        case "quotes":
            return jsonAgentResponse(await getQuotes(workspaceId, request));
        case "subscriptions":
            return jsonAgentResponse(await getSubscriptions(workspaceId, request));
        case "projects":
            return jsonAgentResponse(await getProjects(workspaceId, request));
        case "client-users":
            return jsonAgentResponse(await getClientUsers(workspaceId, request));
        case "activities":
            return jsonAgentResponse(await getActivities(workspaceId, request));
        default:
            return jsonAgentResponse(
                {
                    error: "Recurso no disponible",
                    resources: ["workspace", "companies", "contacts", "deals", "quotes", "subscriptions", "projects", "client-users", "activities"],
                },
                { status: 404 }
            );
    }
}
