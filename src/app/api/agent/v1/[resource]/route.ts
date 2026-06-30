import { NextRequest } from "next/server";
import { z } from "zod";
import { DEAL_NUMBER_START } from "@/lib/deal-number";
import { prisma } from "@/lib/prisma";
import { agentCanWrite, authenticateAgentRequest, jsonAgentResponse, type AgentAuthContext } from "@/lib/agent-api/auth";

export const dynamic = "force-dynamic";

type Params = {
    params: {
        resource: string;
    };
};

const optionalText = z.union([z.string(), z.null()]).optional();
const optionalUrl = z.union([z.string().url(), z.literal(""), z.null()]).optional();

const CompanyWriteSchema = z.object({
    name: z.string().min(1).optional(),
    logoUrl: optionalUrl,
    taxId: optionalText,
    legalName: optionalText,
    fiscalAddress: optionalText,
    initialProjects: z.number().int().min(0).optional(),
    initialUsers: z.number().int().min(0).optional(),
    quoteId: optionalText,
    quoteFileUrl: optionalUrl,
    country: optionalText,
    city: optionalText,
    phone: optionalText,
    website: optionalUrl,
    instagramUrl: optionalUrl,
    linkedinUrl: optionalUrl,
    primaryContactId: optionalText,
    origin: z.enum(["PROSPECCION_MANUAL", "REFERIDO_CLIENTE", "REFERIDO_ALIADO", "INBOUND_MARKETING", "OUTBOUND_MARKETING", "EVENTO_PRESENCIAL"]).nullable().optional(),
    status: z.enum(["ACTIVO", "INACTIVO"]).optional(),
    type: z.enum(["PROSPECTO", "POTENCIAL", "CLIENTE_SUSCRIPTOR", "CLIENTE_ONETIME", "PROVEEDOR", "INVERSIONISTA", "COMPETIDOR", "NO_CALIFICA", "NO_RESPONDIO", "DESISTIO", "RESCINDIO_CONTRATO", "SIN_MOTIVO"]).optional(),
});

const ContactWriteSchema = z.object({
    fullName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    title: optionalText,
    companyId: optionalText,
    mobile: optionalText,
    instagramUrl: optionalUrl,
    linkedinUrl: optionalUrl,
    status: z.enum(["PROSPECTO", "POTENCIAL", "CLIENTE", "INVERSIONISTA", "DESCARTADO"]).optional(),
    receivesInvoices: z.boolean().optional(),
});

const DealWriteSchema = z.object({
    name: z.string().min(1).optional(),
    description: optionalText,
    value: z.number().min(0).optional(),
    mrr: z.number().min(0).nullable().optional(),
    arr: z.number().min(0).nullable().optional(),
    companyId: optionalText,
    contactId: optionalText,
    businessLineId: optionalText,
    type: z.enum(["CLIENTE_NUEVO", "UPSELLING"]).nullable().optional(),
    recurrence: z.enum(["ONETIME_PROJECT", "SUSCRIPCION"]).optional(),
    status: z.enum(["PROSPECCION", "CALIFICACION", "NEGOCIACION", "FORMALIZACION", "CIERRE_GANADO", "CIERRE_PERDIDO", "NO_CALIFICADOS"]).optional(),
});

const ProjectWriteSchema = z.object({
    name: z.string().min(1).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    companyId: z.string().min(1).optional(),
});

const ClientUserWriteSchema = z.object({
    fullName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
    companyId: z.string().min(1).optional(),
});

const ActivityWriteSchema = z.object({
    type: z.enum(["NOTE", "CALL", "MEETING", "STATUS_CHANGE", "TYPE_CHANGE"]).optional(),
    companyId: optionalText,
    contactId: optionalText,
    dealId: optionalText,
    emailSubject: optionalText,
    emailBody: optionalText,
});

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

async function getJsonBody(request: NextRequest) {
    try {
        return await request.json();
    } catch {
        return null;
    }
}

function getRecordId(request: NextRequest, body?: unknown) {
    const queryId = request.nextUrl.searchParams.get("id");
    if (queryId) return queryId;
    if (body && typeof body === "object" && "id" in body) {
        const id = (body as { id?: unknown }).id;
        return typeof id === "string" ? id : null;
    }
    return null;
}

function requireWriteAccess(context: AgentAuthContext) {
    if (agentCanWrite(context.scope)) return null;
    return jsonAgentResponse(
        {
            error: "La API key no tiene permiso de escritura",
            requiredScope: "FULL_WRITE",
        },
        { status: 403 }
    );
}

async function writeAuditLog(
    context: AgentAuthContext,
    action: "CREATE" | "UPDATE" | "DELETE",
    resource: string,
    recordId: string | null,
    payload?: unknown
) {
    await prisma.agentApiAuditLog.create({
        data: {
            action,
            resource,
            recordId,
            payload: payload === undefined ? undefined : JSON.parse(JSON.stringify(payload)),
            workspaceId: context.workspaceId,
            apiKeyId: context.apiKeyId,
            createdById: context.createdById,
        },
    });
}

async function assertCompanyInWorkspace(workspaceId: string, companyId?: string | null) {
    if (!companyId) return true;
    const company = await prisma.company.findFirst({
        where: { id: companyId, workspaceId },
        select: { id: true },
    });
    return Boolean(company);
}

async function assertContactInWorkspace(workspaceId: string, contactId?: string | null) {
    if (!contactId) return true;
    const contact = await prisma.contact.findFirst({
        where: { id: contactId, workspaceId },
        select: { id: true },
    });
    return Boolean(contact);
}

async function assertDealInWorkspace(workspaceId: string, dealId?: string | null) {
    if (!dealId) return true;
    const deal = await prisma.deal.findFirst({
        where: { id: dealId, workspaceId },
        select: { id: true },
    });
    return Boolean(deal);
}

async function assertBusinessLineInWorkspace(workspaceId: string, businessLineId?: string | null) {
    if (!businessLineId) return true;
    const businessLine = await prisma.businessLine.findFirst({
        where: { id: businessLineId, workspaceId },
        select: { id: true },
    });
    return Boolean(businessLine);
}

function invalidPayload(error: z.ZodError) {
    return jsonAgentResponse(
        {
            error: "Payload inválido",
            issues: error.flatten().fieldErrors,
        },
        { status: 400 }
    );
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

async function createResource(resource: string, context: AgentAuthContext, request: NextRequest) {
    const forbidden = requireWriteAccess(context);
    if (forbidden) return forbidden;

    const body = await getJsonBody(request);

    if (resource === "companies") {
        const parsed = CompanyWriteSchema.required({ name: true }).safeParse(body);
        if (!parsed.success) return invalidPayload(parsed.error);

        if (!(await assertContactInWorkspace(context.workspaceId, parsed.data.primaryContactId))) {
            return jsonAgentResponse({ error: "primaryContactId no pertenece al workspace" }, { status: 400 });
        }

        const data = await prisma.company.create({
            data: {
                ...parsed.data,
                logoUrl: parsed.data.logoUrl || null,
                quoteFileUrl: parsed.data.quoteFileUrl || null,
                workspaceId: context.workspaceId,
                createdById: context.createdById,
                status: parsed.data.status || "ACTIVO",
                type: parsed.data.type || "PROSPECTO",
            },
        });
        await writeAuditLog(context, "CREATE", resource, data.id, parsed.data);
        return jsonAgentResponse({ data }, { status: 201 });
    }

    if (resource === "contacts") {
        const parsed = ContactWriteSchema.required({ fullName: true, email: true }).safeParse(body);
        if (!parsed.success) return invalidPayload(parsed.error);

        if (!(await assertCompanyInWorkspace(context.workspaceId, parsed.data.companyId))) {
            return jsonAgentResponse({ error: "companyId no pertenece al workspace" }, { status: 400 });
        }

        const data = await prisma.contact.create({
            data: {
                ...parsed.data,
                instagramUrl: parsed.data.instagramUrl || null,
                linkedinUrl: parsed.data.linkedinUrl || null,
                workspaceId: context.workspaceId,
                createdById: context.createdById,
                status: parsed.data.status || "PROSPECTO",
            },
        });
        await writeAuditLog(context, "CREATE", resource, data.id, parsed.data);
        return jsonAgentResponse({ data }, { status: 201 });
    }

    if (resource === "deals") {
        const parsed = DealWriteSchema.required({ name: true }).safeParse(body);
        if (!parsed.success) return invalidPayload(parsed.error);

        const [validCompany, validContact, validBusinessLine] = await Promise.all([
            assertCompanyInWorkspace(context.workspaceId, parsed.data.companyId),
            assertContactInWorkspace(context.workspaceId, parsed.data.contactId),
            assertBusinessLineInWorkspace(context.workspaceId, parsed.data.businessLineId),
        ]);
        if (!validCompany) return jsonAgentResponse({ error: "companyId no pertenece al workspace" }, { status: 400 });
        if (!validContact) return jsonAgentResponse({ error: "contactId no pertenece al workspace" }, { status: 400 });
        if (!validBusinessLine) return jsonAgentResponse({ error: "businessLineId no pertenece al workspace" }, { status: 400 });

        const data = await prisma.$transaction(async (tx) => {
            const currentMax = await tx.deal.aggregate({
                where: { workspaceId: context.workspaceId },
                _max: { number: true },
            });
            const nextNumber = currentMax._max.number ? currentMax._max.number + 1 : DEAL_NUMBER_START;

            return tx.deal.create({
                data: {
                    ...parsed.data,
                    number: nextNumber,
                    value: parsed.data.value || 0,
                    recurrence: parsed.data.recurrence || "ONETIME_PROJECT",
                    status: parsed.data.status || "PROSPECCION",
                    workspaceId: context.workspaceId,
                    createdById: context.createdById,
                },
            });
        });
        await writeAuditLog(context, "CREATE", resource, data.id, parsed.data);
        return jsonAgentResponse({ data }, { status: 201 });
    }

    if (resource === "projects") {
        const parsed = ProjectWriteSchema.required({ name: true, companyId: true }).safeParse(body);
        if (!parsed.success) return invalidPayload(parsed.error);
        if (!(await assertCompanyInWorkspace(context.workspaceId, parsed.data.companyId))) {
            return jsonAgentResponse({ error: "companyId no pertenece al workspace" }, { status: 400 });
        }

        const data = await prisma.project.create({
            data: {
                name: parsed.data.name,
                status: parsed.data.status || "ACTIVE",
                companyId: parsed.data.companyId,
            },
        });
        await writeAuditLog(context, "CREATE", resource, data.id, parsed.data);
        return jsonAgentResponse({ data }, { status: 201 });
    }

    if (resource === "client-users") {
        const parsed = ClientUserWriteSchema.required({ fullName: true, email: true, companyId: true }).safeParse(body);
        if (!parsed.success) return invalidPayload(parsed.error);
        if (!(await assertCompanyInWorkspace(context.workspaceId, parsed.data.companyId))) {
            return jsonAgentResponse({ error: "companyId no pertenece al workspace" }, { status: 400 });
        }

        const data = await prisma.clientUser.create({
            data: {
                fullName: parsed.data.fullName,
                email: parsed.data.email,
                status: parsed.data.status || "ACTIVE",
                companyId: parsed.data.companyId,
            },
        });
        await writeAuditLog(context, "CREATE", resource, data.id, parsed.data);
        return jsonAgentResponse({ data }, { status: 201 });
    }

    if (resource === "activities") {
        const parsed = ActivityWriteSchema.safeParse(body);
        if (!parsed.success) return invalidPayload(parsed.error);

        const [validCompany, validContact, validDeal] = await Promise.all([
            assertCompanyInWorkspace(context.workspaceId, parsed.data.companyId),
            assertContactInWorkspace(context.workspaceId, parsed.data.contactId),
            assertDealInWorkspace(context.workspaceId, parsed.data.dealId),
        ]);
        if (!validCompany) return jsonAgentResponse({ error: "companyId no pertenece al workspace" }, { status: 400 });
        if (!validContact) return jsonAgentResponse({ error: "contactId no pertenece al workspace" }, { status: 400 });
        if (!validDeal) return jsonAgentResponse({ error: "dealId no pertenece al workspace" }, { status: 400 });

        const data = await prisma.activity.create({
            data: {
                type: parsed.data.type || "NOTE",
                workspaceId: context.workspaceId,
                createdById: context.createdById,
                companyId: parsed.data.companyId || null,
                contactId: parsed.data.contactId || null,
                dealId: parsed.data.dealId || null,
                emailSubject: parsed.data.emailSubject || null,
                emailBody: parsed.data.emailBody || null,
            },
        });
        await writeAuditLog(context, "CREATE", resource, data.id, parsed.data);
        return jsonAgentResponse({ data }, { status: 201 });
    }

    return jsonAgentResponse({ error: "Este recurso no permite escritura por API" }, { status: 405 });
}

async function updateResource(resource: string, context: AgentAuthContext, request: NextRequest) {
    const forbidden = requireWriteAccess(context);
    if (forbidden) return forbidden;

    const body = await getJsonBody(request);
    const id = getRecordId(request, body);
    if (!id) return jsonAgentResponse({ error: "Parámetro id requerido" }, { status: 400 });

    if (resource === "companies") {
        const parsed = CompanyWriteSchema.safeParse(body);
        if (!parsed.success) return invalidPayload(parsed.error);
        if (!(await assertContactInWorkspace(context.workspaceId, parsed.data.primaryContactId))) {
            return jsonAgentResponse({ error: "primaryContactId no pertenece al workspace" }, { status: 400 });
        }
        const existing = await prisma.company.findFirst({ where: { id, workspaceId: context.workspaceId }, select: { id: true } });
        if (!existing) return jsonAgentResponse({ error: "Registro no encontrado" }, { status: 404 });
        const { id: _ignored, ...dataToUpdate } = body && typeof body === "object" ? body as Record<string, unknown> : {};
        const data = await prisma.company.update({
            where: { id },
            data: { ...parsed.data, ...("logoUrl" in dataToUpdate ? { logoUrl: parsed.data.logoUrl || null } : {}), ...("quoteFileUrl" in dataToUpdate ? { quoteFileUrl: parsed.data.quoteFileUrl || null } : {}) },
        });
        await writeAuditLog(context, "UPDATE", resource, id, parsed.data);
        return jsonAgentResponse({ data });
    }

    if (resource === "contacts") {
        const parsed = ContactWriteSchema.safeParse(body);
        if (!parsed.success) return invalidPayload(parsed.error);
        if (!(await assertCompanyInWorkspace(context.workspaceId, parsed.data.companyId))) {
            return jsonAgentResponse({ error: "companyId no pertenece al workspace" }, { status: 400 });
        }
        const existing = await prisma.contact.findFirst({ where: { id, workspaceId: context.workspaceId }, select: { id: true } });
        if (!existing) return jsonAgentResponse({ error: "Registro no encontrado" }, { status: 404 });
        const data = await prisma.contact.update({ where: { id }, data: parsed.data });
        await writeAuditLog(context, "UPDATE", resource, id, parsed.data);
        return jsonAgentResponse({ data });
    }

    if (resource === "deals") {
        const parsed = DealWriteSchema.safeParse(body);
        if (!parsed.success) return invalidPayload(parsed.error);
        const [validCompany, validContact, validBusinessLine] = await Promise.all([
            assertCompanyInWorkspace(context.workspaceId, parsed.data.companyId),
            assertContactInWorkspace(context.workspaceId, parsed.data.contactId),
            assertBusinessLineInWorkspace(context.workspaceId, parsed.data.businessLineId),
        ]);
        if (!validCompany) return jsonAgentResponse({ error: "companyId no pertenece al workspace" }, { status: 400 });
        if (!validContact) return jsonAgentResponse({ error: "contactId no pertenece al workspace" }, { status: 400 });
        if (!validBusinessLine) return jsonAgentResponse({ error: "businessLineId no pertenece al workspace" }, { status: 400 });
        const existing = await prisma.deal.findFirst({ where: { id, workspaceId: context.workspaceId }, select: { id: true } });
        if (!existing) return jsonAgentResponse({ error: "Registro no encontrado" }, { status: 404 });
        const data = await prisma.deal.update({ where: { id }, data: parsed.data });
        await writeAuditLog(context, "UPDATE", resource, id, parsed.data);
        return jsonAgentResponse({ data });
    }

    if (resource === "projects") {
        const parsed = ProjectWriteSchema.safeParse(body);
        if (!parsed.success) return invalidPayload(parsed.error);
        if (!(await assertCompanyInWorkspace(context.workspaceId, parsed.data.companyId))) {
            return jsonAgentResponse({ error: "companyId no pertenece al workspace" }, { status: 400 });
        }
        const existing = await prisma.project.findFirst({ where: { id, company: { workspaceId: context.workspaceId } }, select: { id: true } });
        if (!existing) return jsonAgentResponse({ error: "Registro no encontrado" }, { status: 404 });
        const data = await prisma.project.update({ where: { id }, data: parsed.data });
        await writeAuditLog(context, "UPDATE", resource, id, parsed.data);
        return jsonAgentResponse({ data });
    }

    if (resource === "client-users") {
        const parsed = ClientUserWriteSchema.safeParse(body);
        if (!parsed.success) return invalidPayload(parsed.error);
        if (!(await assertCompanyInWorkspace(context.workspaceId, parsed.data.companyId))) {
            return jsonAgentResponse({ error: "companyId no pertenece al workspace" }, { status: 400 });
        }
        const existing = await prisma.clientUser.findFirst({ where: { id, company: { workspaceId: context.workspaceId } }, select: { id: true } });
        if (!existing) return jsonAgentResponse({ error: "Registro no encontrado" }, { status: 404 });
        const data = await prisma.clientUser.update({ where: { id }, data: parsed.data });
        await writeAuditLog(context, "UPDATE", resource, id, parsed.data);
        return jsonAgentResponse({ data });
    }

    if (resource === "activities") {
        const parsed = ActivityWriteSchema.safeParse(body);
        if (!parsed.success) return invalidPayload(parsed.error);
        const existing = await prisma.activity.findFirst({ where: { id, workspaceId: context.workspaceId }, select: { id: true } });
        if (!existing) return jsonAgentResponse({ error: "Registro no encontrado" }, { status: 404 });
        const data = await prisma.activity.update({ where: { id }, data: parsed.data });
        await writeAuditLog(context, "UPDATE", resource, id, parsed.data);
        return jsonAgentResponse({ data });
    }

    return jsonAgentResponse({ error: "Este recurso no permite escritura por API" }, { status: 405 });
}

async function deleteResource(resource: string, context: AgentAuthContext, request: NextRequest) {
    const forbidden = requireWriteAccess(context);
    if (forbidden) return forbidden;

    const body = await getJsonBody(request);
    const id = getRecordId(request, body);
    if (!id) return jsonAgentResponse({ error: "Parámetro id requerido" }, { status: 400 });

    const deleteHandlers: Record<string, () => Promise<unknown>> = {
        companies: async () => {
            const existing = await prisma.company.findFirst({ where: { id, workspaceId: context.workspaceId }, select: { id: true } });
            if (!existing) return null;
            return prisma.company.delete({ where: { id } });
        },
        contacts: async () => {
            const existing = await prisma.contact.findFirst({ where: { id, workspaceId: context.workspaceId }, select: { id: true } });
            if (!existing) return null;
            return prisma.contact.delete({ where: { id } });
        },
        deals: async () => {
            const existing = await prisma.deal.findFirst({ where: { id, workspaceId: context.workspaceId }, select: { id: true } });
            if (!existing) return null;
            return prisma.deal.delete({ where: { id } });
        },
        projects: async () => {
            const existing = await prisma.project.findFirst({ where: { id, company: { workspaceId: context.workspaceId } }, select: { id: true } });
            if (!existing) return null;
            return prisma.project.delete({ where: { id } });
        },
        "client-users": async () => {
            const existing = await prisma.clientUser.findFirst({ where: { id, company: { workspaceId: context.workspaceId } }, select: { id: true } });
            if (!existing) return null;
            return prisma.clientUser.delete({ where: { id } });
        },
        activities: async () => {
            const existing = await prisma.activity.findFirst({ where: { id, workspaceId: context.workspaceId }, select: { id: true } });
            if (!existing) return null;
            return prisma.activity.delete({ where: { id } });
        },
    };

    const handler = deleteHandlers[resource];
    if (!handler) return jsonAgentResponse({ error: "Este recurso no permite escritura por API" }, { status: 405 });

    const data = await handler();
    if (!data) return jsonAgentResponse({ error: "Registro no encontrado" }, { status: 404 });
    await writeAuditLog(context, "DELETE", resource, id);
    return jsonAgentResponse({ data });
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

export async function POST(request: NextRequest, { params }: Params) {
    const authResult = await authenticateAgentRequest(request);
    if (!authResult.ok) return authResult.response;

    return createResource(params.resource.toLowerCase(), authResult.context, request);
}

export async function PATCH(request: NextRequest, { params }: Params) {
    const authResult = await authenticateAgentRequest(request);
    if (!authResult.ok) return authResult.response;

    return updateResource(params.resource.toLowerCase(), authResult.context, request);
}

export async function DELETE(request: NextRequest, { params }: Params) {
    const authResult = await authenticateAgentRequest(request);
    if (!authResult.ok) return authResult.response;

    return deleteResource(params.resource.toLowerCase(), authResult.context, request);
}
