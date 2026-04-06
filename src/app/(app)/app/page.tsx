import { auth } from "@/auth";
import { CfoDashboard } from "@/components/dashboard/cfo-dashboard";
import { ExecutiveDashboard } from "@/components/dashboard/executive-dashboard";
import { getCurrentWorkspace } from "@/actions/workspace";
import { createAdmCloudClient, type AdmCloudCollectionSummary, type AdmCloudTransaction, type AdmCloudPaymentTerm } from "@/lib/admcloud/client";
import { prisma } from "@/lib/prisma";
import { CompanyType, DealStatus } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export const revalidate = 60;

const STATUS_LABELS: Record<string, string> = {
    PROSPECCION: "Prospección",
    CALIFICACION: "Calificación",
    NEGOCIACION: "Negociación",
    FORMALIZACION: "Formalización",
    CIERRE_GANADO: "Cierre Ganado",
    CIERRE_PERDIDO: "Cierre Perdido",
    NO_CALIFICADOS: "No Calificados",
};

const STATUS_ORDER: DealStatus[] = [
    "PROSPECCION",
    "CALIFICACION",
    "NEGOCIACION",
    "FORMALIZACION",
    "CIERRE_GANADO",
    "CIERRE_PERDIDO",
    "NO_CALIFICADOS",
];

type DashboardPreference = "ALL" | "CEO" | "CFO" | "CUSTOMER_SUCCESS";

const DASHBOARD_LABELS: Record<Exclude<DashboardPreference, "ALL">, string> = {
    CEO: "CEO",
    CFO: "CFO",
    CUSTOMER_SUCCESS: "Customer Success",
};

const DASHBOARD_ORDER: Array<Exclude<DashboardPreference, "ALL">> = ["CEO", "CFO", "CUSTOMER_SUCCESS"];

const EMPTY_STATS = {
    allCompaniesCount: 0,
    clientCompaniesCount: 0,
    oneTimeClientsCount: 0,
    prospectsCount: 0,
    potentialClientsCount: 0,
    contactsCount: 0,
    dealsCount: 0,
    activeProjects: 0,
    activeClientUsers: 0,
    mrr: 0,
    arr: 0,
    pipeline: 0,
};

const EMPTY_CFO_FINANCE = {
    billedGross: 0,
    billedNet: 0,
    collected: 0,
    openReceivables: 0,
    overdueReceivables: 0,
    taxes: 0,
    deposits: 0,
    invoiceCount: 0,
    receiptCount: 0,
    creditNotes: 0,
    debitNotes: 0,
    openItems: 0,
    collectibleRatio: 0,
    billedDelta: 0,
    collectedDelta: 0,
    recurringBilled: 0,
    recurringCollected: 0,
    oneTimeBilled: 0,
    subscriberReceivables: 0,
    subscriberCompaniesWithOpenBalance: 0,
    receivablesTop: [] as Array<{ name: string; amount: number; typeLabel: string; note: string }>,
    collectionTrend: [] as Array<{ label: string; amount: number; isCurrent?: boolean; share?: number; note?: string }>,
    paymentTerms: [] as Array<{ label: string; amount: number; share?: number; note?: string }>,
    currencyMix: [] as Array<{ label: string; amount: number; share?: number; note?: string }>,
};

const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
    PROSPECTO: "Prospecto",
    POTENCIAL: "Potencial",
    CLIENTE_SUSCRIPTOR: "Cliente suscriptor",
    CLIENTE_ONETIME: "Cliente one-time",
    PROVEEDOR: "Proveedor",
    INVERSIONISTA: "Inversionista",
    COMPETIDOR: "Competidor",
    NO_CALIFICA: "No califica",
    NO_RESPONDIO: "No respondió",
    DESISTIO: "Desistió",
    RESCINDIO_CONTRATO: "Rescindió contrato",
    SIN_MOTIVO: "Sin motivo",
};

function numberValue(value: unknown) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "string") {
        const sanitized = value.replace(/,/g, "").trim();
        const parsed = Number(sanitized);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
}

function dateValue(value: unknown) {
    if (typeof value !== "string" || !value.trim()) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
}

function startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addMonths(date: Date, amount: number) {
    return new Date(date.getFullYear(), date.getMonth() + amount, 1, 0, 0, 0, 0);
}

function capitalize(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function uniqueById<T extends { ID?: string; DocID?: string }>(items: T[]) {
    const seen = new Set<string>();
    return items.filter((item, index) => {
        const key = item.ID || item.DocID || `${index}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function monthLabel(date: Date) {
    return capitalize(
        new Intl.DateTimeFormat("es-DO", {
            month: "long",
            year: "numeric",
            timeZone: "America/Santo_Domingo",
        }).format(date)
    );
}

function fullDateLabel(date: Date) {
    return capitalize(
        new Intl.DateTimeFormat("es-DO", {
            dateStyle: "medium",
            timeZone: "America/Santo_Domingo",
        }).format(date)
    );
}

function settledData<T>(
    result: PromiseSettledResult<{ success: boolean; data?: T; error?: string }>,
    label: string,
    warnings: string[]
) {
    if (result.status === "fulfilled" && result.value.success) {
        return result.value.data;
    }

    const message =
        result.status === "fulfilled"
            ? result.value.error || "sin detalle adicional"
            : result.reason instanceof Error
              ? result.reason.message
              : String(result.reason);

    warnings.push(`${label}: ${message}`);
    return undefined;
}

function dueDateFromTransaction(transaction: AdmCloudTransaction, paymentTerms: Map<string, number>) {
    const directDueDate =
        dateValue(transaction.ExpirationDate) ||
        dateValue((transaction as Record<string, unknown>).DueDate) ||
        dateValue(transaction.EstimatedCollectionDate);

    if (directDueDate) return directDueDate;

    const documentDate = dateValue(transaction.DocDate) || dateValue(transaction.CreationDate) || dateValue(transaction.PostDate);
    if (!documentDate) return null;

    const daysById = transaction.PaymentTermID ? paymentTerms.get(transaction.PaymentTermID) : undefined;
    const daysByName = transaction.PaymentTermName ? paymentTerms.get(transaction.PaymentTermName.toLowerCase()) : undefined;
    const days = daysById ?? daysByName;

    if (typeof days !== "number") return null;
    return new Date(documentDate.getTime() + days * 24 * 60 * 60 * 1000);
}

function sumTransactions(items: AdmCloudTransaction[]) {
    return items.reduce((acc, item) => {
        const total =
            numberValue(item.TotalAmount) ||
            numberValue(item.CalculatedTotalAmount) ||
            numberValue((item as Record<string, unknown>).Total) ||
            numberValue((item as Record<string, unknown>).TotalLocal);
        return acc + total;
    }, 0);
}

async function getCfoDashboardData(
    workspace: NonNullable<Awaited<ReturnType<typeof getCurrentWorkspace>>>,
    crmStats: Awaited<ReturnType<typeof getBasicStats>>
) {
    const now = new Date();
    const currentStart = startOfMonth(now);
    const previousStart = addMonths(currentStart, -1);
    const previousEnd = endOfMonth(previousStart);
    const warnings: string[] = [];

    if (
        !workspace.admCloudEnabled ||
        !workspace.admCloudAppId ||
        !workspace.admCloudUsername ||
        !workspace.admCloudPassword ||
        !workspace.admCloudCompany
    ) {
        return {
            admCloudConfigured: false,
            generatedAtLabel: fullDateLabel(now),
            monthLabel: monthLabel(now),
            previousMonthLabel: monthLabel(previousStart),
            warnings,
            finance: EMPTY_CFO_FINANCE,
        };
    }

    const client = createAdmCloudClient({
        appId: workspace.admCloudAppId,
        username: workspace.admCloudUsername,
        password: workspace.admCloudPassword,
        company: workspace.admCloudCompany,
        role: workspace.admCloudRole || "Administradores",
    });

    const companies = await prisma.company.findMany({
        where: {
            workspaceId: workspace.id,
            status: "ACTIVO",
            type: { in: ["CLIENTE_SUSCRIPTOR", "CLIENTE_ONETIME"] },
        },
        select: {
            id: true,
            name: true,
            type: true,
            admCloudRelationshipId: true,
            admCloudLinks: {
                select: {
                    admCloudRelationshipId: true,
                },
            },
        },
    });

    const relationshipMap = new Map<string, { companyName: string; type: CompanyType }>();
    for (const company of companies) {
        if (company.admCloudRelationshipId) {
            relationshipMap.set(company.admCloudRelationshipId, {
                companyName: company.name,
                type: company.type,
            });
        }
        for (const link of company.admCloudLinks) {
            relationshipMap.set(link.admCloudRelationshipId, {
                companyName: company.name,
                type: company.type,
            });
        }
    }

    const currentStartIso = currentStart.toISOString();
    const currentEndIso = now.toISOString();
    const previousStartIso = previousStart.toISOString();
    const previousEndIso = previousEnd.toISOString();

    const [
        currentCreditRaw,
        currentCashRaw,
        currentCreditNotesRaw,
        currentDebitNotesRaw,
        currentReceiptsRaw,
        currentDepositsRaw,
        arRaw,
        collectionsRaw,
        paymentTermsRaw,
        previousCreditRaw,
        previousCashRaw,
        previousCreditNotesRaw,
        previousDebitNotesRaw,
        previousReceiptsRaw,
    ] = await Promise.allSettled([
        client.getCreditInvoicesByDateRange(currentStartIso, currentEndIso),
        client.getCashInvoicesByDateRange(currentStartIso, currentEndIso),
        client.getCustomerCreditNotesByDateRange(currentStartIso, currentEndIso),
        client.getCustomerDebitNotesByDateRange(currentStartIso, currentEndIso),
        client.getCashReceiptsByDateRange(currentStartIso, currentEndIso),
        client.getDepositsByDateRange(currentStartIso, currentEndIso),
        client.getAccountsReceivableSnapshot(currentEndIso),
        client.getCollectionsByYear(now.getFullYear()),
        client.getPaymentTerms(),
        client.getCreditInvoicesByDateRange(previousStartIso, previousEndIso),
        client.getCashInvoicesByDateRange(previousStartIso, previousEndIso),
        client.getCustomerCreditNotesByDateRange(previousStartIso, previousEndIso),
        client.getCustomerDebitNotesByDateRange(previousStartIso, previousEndIso),
        client.getCashReceiptsByDateRange(previousStartIso, previousEndIso),
    ]);

    const currentCreditInvoices = uniqueById(settledData(currentCreditRaw, "Facturas a crédito", warnings) ?? []);
    const currentCashInvoices = uniqueById(settledData(currentCashRaw, "Facturas de contado", warnings) ?? []);
    const currentCreditNotes = uniqueById(settledData(currentCreditNotesRaw, "Notas de crédito", warnings) ?? []);
    const currentDebitNotes = uniqueById(settledData(currentDebitNotesRaw, "Notas de débito", warnings) ?? []);
    const currentReceipts = uniqueById(settledData(currentReceiptsRaw, "Recibos de caja", warnings) ?? []);
    const currentDeposits = uniqueById(settledData(currentDepositsRaw, "Depósitos", warnings) ?? []);
    const arItems = uniqueById(settledData(arRaw, "Cuentas por cobrar", warnings) ?? []);
    const collectionSummaries = settledData<AdmCloudCollectionSummary[]>(collectionsRaw, "Resumen de cobranza", warnings) ?? [];
    const paymentTerms = settledData<AdmCloudPaymentTerm[]>(paymentTermsRaw, "Términos de pago", warnings) ?? [];
    const previousCreditInvoices = uniqueById(settledData(previousCreditRaw, "Facturas a crédito mes anterior", warnings) ?? []);
    const previousCashInvoices = uniqueById(settledData(previousCashRaw, "Facturas de contado mes anterior", warnings) ?? []);
    const previousCreditNotes = uniqueById(settledData(previousCreditNotesRaw, "Notas de crédito mes anterior", warnings) ?? []);
    const previousDebitNotes = uniqueById(settledData(previousDebitNotesRaw, "Notas de débito mes anterior", warnings) ?? []);
    const previousReceipts = uniqueById(settledData(previousReceiptsRaw, "Recibos mes anterior", warnings) ?? []);

    const paymentTermMap = new Map<string, number>();
    for (const term of paymentTerms) {
        const days = typeof term.Days === "number" ? term.Days : undefined;
        if (typeof days !== "number") continue;
        paymentTermMap.set(term.ID, days);
        paymentTermMap.set(term.Name.toLowerCase(), days);
    }

    const billedTransactions = [...currentCreditInvoices, ...currentCashInvoices];
    const previousBilledTransactions = [...previousCreditInvoices, ...previousCashInvoices];
    const billedGross = sumTransactions(billedTransactions);
    const previousBilledGross = sumTransactions(previousBilledTransactions);
    const creditNotesTotal = sumTransactions(currentCreditNotes);
    const debitNotesTotal = sumTransactions(currentDebitNotes);
    const previousCreditNotesTotal = sumTransactions(previousCreditNotes);
    const previousDebitNotesTotal = sumTransactions(previousDebitNotes);
    const billedNet = billedGross + debitNotesTotal - creditNotesTotal;
    const previousBilledNet = previousBilledGross + previousDebitNotesTotal - previousCreditNotesTotal;
    const collected = sumTransactions(currentReceipts);
    const previousCollected = sumTransactions(previousReceipts);
    const deposits = sumTransactions(currentDeposits);
    const taxes =
        billedTransactions.reduce((acc, item) => acc + numberValue(item.TaxAmount ?? item.CalculatedTaxAmount), 0) +
        currentDebitNotes.reduce((acc, item) => acc + numberValue(item.TaxAmount ?? item.CalculatedTaxAmount), 0) -
        currentCreditNotes.reduce((acc, item) => acc + numberValue(item.TaxAmount ?? item.CalculatedTaxAmount), 0);

    const openReceivableRows = arItems
        .map((item) => {
            const openAmount =
                numberValue(item.UnappliedAmount) ||
                numberValue(item.Balance) ||
                Math.max(0, numberValue(item.TotalAmount) - numberValue(item.AppliedPayments) - numberValue(item.ManualPayments));
            const rel = item.RelationshipID ? relationshipMap.get(item.RelationshipID) : undefined;
            const dueDate = dueDateFromTransaction(item, paymentTermMap);

            return {
                item,
                openAmount,
                dueDate,
                rel,
            };
        })
        .filter((row) => row.openAmount > 0.009);

    const openReceivables = openReceivableRows.reduce((acc, row) => acc + row.openAmount, 0);
    const overdueReceivables = openReceivableRows.reduce((acc, row) => {
        if (!row.dueDate) return acc;
        return row.dueDate.getTime() < now.getTime() ? acc + row.openAmount : acc;
    }, 0);

    const recurringRelationshipIds = new Set(
        [...relationshipMap.entries()]
            .filter(([, value]) => value.type === "CLIENTE_SUSCRIPTOR")
            .map(([relationshipId]) => relationshipId)
    );
    const oneTimeRelationshipIds = new Set(
        [...relationshipMap.entries()]
            .filter(([, value]) => value.type === "CLIENTE_ONETIME")
            .map(([relationshipId]) => relationshipId)
    );

    const recurringBilled = billedTransactions.reduce((acc, item) => {
        return item.RelationshipID && recurringRelationshipIds.has(item.RelationshipID)
            ? acc + numberValue(item.TotalAmount ?? item.CalculatedTotalAmount)
            : acc;
    }, 0);

    const recurringCollected = currentReceipts.reduce((acc, item) => {
        return item.RelationshipID && recurringRelationshipIds.has(item.RelationshipID)
            ? acc + numberValue(item.TotalAmount ?? item.CalculatedTotalAmount)
            : acc;
    }, 0);

    const oneTimeBilled = billedTransactions.reduce((acc, item) => {
        return item.RelationshipID && oneTimeRelationshipIds.has(item.RelationshipID)
            ? acc + numberValue(item.TotalAmount ?? item.CalculatedTotalAmount)
            : acc;
    }, 0);

    const subscriberReceivables = openReceivableRows.reduce((acc, row) => {
        return row.rel?.type === "CLIENTE_SUSCRIPTOR" ? acc + row.openAmount : acc;
    }, 0);

    const subscriberCompaniesWithOpenBalance = new Set(
        openReceivableRows
            .filter((row) => row.rel?.type === "CLIENTE_SUSCRIPTOR" && row.item.RelationshipID)
            .map((row) => row.item.RelationshipID as string)
    ).size;

    const receivablesTop = openReceivableRows
        .sort((a, b) => b.openAmount - a.openAmount)
        .slice(0, 5)
        .map((row) => {
            const companyName = row.rel?.companyName || row.item.RelationshipName || "Cliente sin vínculo";
            const typeLabel = row.rel ? COMPANY_TYPE_LABELS[row.rel.type] : "Cliente ERP";
            const note = row.dueDate
                ? row.dueDate.getTime() < now.getTime()
                    ? `Vencido desde ${fullDateLabel(row.dueDate)}`
                    : `Cobro estimado para ${fullDateLabel(row.dueDate)}`
                : row.item.PaymentTermName
                  ? `Término ${row.item.PaymentTermName}`
                  : "Sin fecha estimada de cobro";

            return {
                name: companyName,
                amount: row.openAmount,
                typeLabel,
                note,
            };
        });

    const paymentTermsMix = [...openReceivableRows.reduce((acc, row) => {
        const key = row.item.PaymentTermName || "Sin término";
        acc.set(key, (acc.get(key) || 0) + row.openAmount);
        return acc;
    }, new Map<string, number>()).entries()]
        .map(([label, amount]) => ({
            label,
            amount,
            share: openReceivables > 0 ? (amount / openReceivables) * 100 : 0,
            note: "",
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 4);

    const billedUniverse = Math.max(billedNet, 0.01);
    const currencyMix = [...billedTransactions.reduce((acc, item) => {
        const key = item.CurrencyID || "N/A";
        acc.set(key, (acc.get(key) || 0) + numberValue(item.TotalAmount ?? item.CalculatedTotalAmount));
        return acc;
    }, new Map<string, number>()).entries()]
        .map(([label, amount]) => ({
            label,
            amount,
            share: billedUniverse > 0 ? (amount / billedUniverse) * 100 : 0,
            note: "",
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 4);

    const trendMonths = [previousStart, currentStart].map((baseDate, index) => {
        const label = monthLabel(baseDate);
        const fallbackAmount = index === 0 ? previousCollected : collected;

        const amountFromCollections = collectionSummaries.reduce((acc, item) => {
            const itemDate = dateValue(item.DocDate);
            const itemLabel = item.MonthString?.trim().toLowerCase();
            const matchesDate =
                itemDate &&
                itemDate.getFullYear() === baseDate.getFullYear() &&
                itemDate.getMonth() === baseDate.getMonth();
            const matchesLabel = itemLabel && itemLabel.includes(label.split(" ")[0].toLowerCase());
            return matchesDate || matchesLabel ? acc + numberValue(item.Amount) : acc;
        }, 0);

        return {
            label,
            amount: amountFromCollections > 0 ? amountFromCollections : fallbackAmount,
            isCurrent: index === 1,
        };
    });

    return {
        admCloudConfigured: true,
        generatedAtLabel: fullDateLabel(now),
        monthLabel: monthLabel(now),
        previousMonthLabel: monthLabel(previousStart),
        warnings,
        finance: {
            billedGross,
            billedNet,
            collected,
            openReceivables,
            overdueReceivables,
            taxes,
            deposits,
            invoiceCount: billedTransactions.length,
            receiptCount: currentReceipts.length,
            creditNotes: currentCreditNotes.length,
            debitNotes: currentDebitNotes.length,
            openItems: openReceivableRows.length,
            collectibleRatio: billedNet > 0 ? (collected / billedNet) * 100 : 0,
            billedDelta: previousBilledNet > 0 ? ((billedNet - previousBilledNet) / previousBilledNet) * 100 : billedNet > 0 ? 100 : 0,
            collectedDelta: previousCollected > 0 ? ((collected - previousCollected) / previousCollected) * 100 : collected > 0 ? 100 : 0,
            recurringBilled,
            recurringCollected,
            oneTimeBilled,
            subscriberReceivables,
            subscriberCompaniesWithOpenBalance,
            receivablesTop,
            collectionTrend: trendMonths,
            paymentTerms: paymentTermsMix,
            currencyMix,
        },
    };
}

async function getBasicStats(workspaceId: string) {
    try {
        const [
            allCompaniesCount,
            clientCompaniesCount,
            oneTimeClientsCount,
            prospectsCount,
            potentialClientsCount,
            contactsCount,
            dealsCount,
            activeProjects,
            activeClientUsers,
            pipelineValue,
            clientCompanies,
        ] = await Promise.all([
            prisma.company.count({ where: { workspaceId } }),
            prisma.company.count({ where: { workspaceId, status: "ACTIVO", type: "CLIENTE_SUSCRIPTOR" } }),
            prisma.company.count({ where: { workspaceId, status: "ACTIVO", type: "CLIENTE_ONETIME" } }),
            prisma.company.count({ where: { workspaceId, status: "ACTIVO", type: "PROSPECTO" } }),
            prisma.company.count({ where: { workspaceId, status: "ACTIVO", type: "POTENCIAL" } }),
            prisma.contact.count({ where: { workspaceId } }),
            prisma.deal.count({ where: { workspaceId } }),
            prisma.project.count({
                where: {
                    company: { workspaceId, status: "ACTIVO", type: "CLIENTE_SUSCRIPTOR" },
                    status: "ACTIVE",
                },
            }),
            prisma.clientUser.count({
                where: {
                    company: { workspaceId, status: "ACTIVO", type: "CLIENTE_SUSCRIPTOR" },
                    status: "ACTIVE",
                },
            }),
            prisma.deal.aggregate({
                where: {
                    workspaceId,
                    status: { notIn: ["CIERRE_GANADO", "CIERRE_PERDIDO"] },
                },
                _sum: { value: true },
            }),
            prisma.company.findMany({
                where: {
                    workspaceId,
                    status: "ACTIVO",
                    type: "CLIENTE_SUSCRIPTOR",
                    subscriptionBilling: { isNot: null },
                },
                include: {
                    subscriptionBilling: { include: { items: true } },
                    projects: { where: { status: "ACTIVE" }, select: { id: true } },
                    clientUsers: { where: { status: "ACTIVE" }, select: { id: true } },
                },
            }),
        ]);

        let mrr = 0;
        for (const company of clientCompanies) {
            const billing = company.subscriptionBilling;
            if (!billing) continue;

            const companyProjects = company.projects.length;
            const companyUsers = company.clientUsers.length;

            for (const item of billing.items) {
                let quantity = item.manualQuantity || 0;

                if (item.countType === "ACTIVE_PROJECTS") {
                    quantity = companyProjects;
                } else if (item.countType === "ACTIVE_USERS") {
                    quantity = companyUsers;
                } else if (item.countType === "CALCULATED") {
                    const base = item.calculatedBase === "USERS" ? companyUsers : companyProjects;
                    quantity = Math.max(0, base - (item.calculatedSubtract || 0));
                }

                if (quantity > 0) {
                    mrr += Number(item.price) * quantity;
                }
            }
        }

        return {
            allCompaniesCount,
            clientCompaniesCount,
            oneTimeClientsCount,
            prospectsCount,
            potentialClientsCount,
            contactsCount,
            dealsCount,
            activeProjects,
            activeClientUsers,
            mrr,
            arr: mrr * 12,
            pipeline: Number(pipelineValue._sum.value || 0),
        };
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return EMPTY_STATS;
    }
}

async function getPipelineBreakdown(workspaceId: string) {
    try {
        const raw = await prisma.deal.groupBy({
            by: ["status"],
            where: { workspaceId },
            _count: true,
            _sum: { value: true },
        });

        const map = new Map(raw.map((row) => [row.status, row]));

        return STATUS_ORDER.map((status) => {
            const row = map.get(status);
            return {
                status,
                label: STATUS_LABELS[status] ?? status,
                count: row?._count ?? 0,
                value: Number(row?._sum?.value ?? 0),
            };
        });
    } catch (error) {
        console.error("Error fetching pipeline breakdown:", error);
        return STATUS_ORDER.map((status) => ({
            status,
            label: STATUS_LABELS[status] ?? status,
            count: 0,
            value: 0,
        }));
    }
}

function normalizeDashboardView(value: string | string[] | undefined): Exclude<DashboardPreference, "ALL"> | null {
    const rawValue = Array.isArray(value) ? value[0] : value;
    if (!rawValue) return null;
    return DASHBOARD_ORDER.includes(rawValue as Exclude<DashboardPreference, "ALL">)
        ? (rawValue as Exclude<DashboardPreference, "ALL">)
        : null;
}

function DashboardSwitcher({ currentView }: { currentView: Exclude<DashboardPreference, "ALL"> }) {
    return (
        <div className="rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] p-2 shadow-sm">
            <div className="flex flex-wrap gap-2">
                {DASHBOARD_ORDER.map((view) => {
                    const isActive = view === currentView;

                    return (
                        <Link
                            key={view}
                            href={{ pathname: "/app", query: { dashboard: view } }}
                            className={`inline-flex items-center gap-2 rounded-[var(--radius-lg)] px-4 py-2 text-sm font-medium transition-colors ${
                                isActive
                                    ? "bg-nearby-dark text-white"
                                    : "bg-[var(--surface-1)] text-[var(--foreground)] hover:bg-[var(--hover-bg)]"
                            }`}
                        >
                            {DASHBOARD_LABELS[view]}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

function ComingSoonDashboard({
    title,
    description,
    selector,
}: {
    title: string;
    description: string;
    selector?: ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[var(--surface-0)] py-4 md:py-8">
            <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8 md:space-y-6">
                {selector}
                <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[linear-gradient(155deg,var(--surface-1),var(--surface-2))] p-8 shadow-sm sm:p-10">
                    <div className="max-w-2xl">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted-text)]">Dashboard asignado</p>
                        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">{title}</h1>
                        <p className="mt-4 text-base leading-7 text-[var(--muted-text)]">{description}</p>
                        <div className="mt-8 rounded-[var(--radius-lg)] border border-dashed border-[var(--card-border)] bg-[var(--card-bg)] p-6">
                            <p className="text-sm font-medium text-[var(--foreground)]">Pendiente de diseño e implementación</p>
                            <p className="mt-2 text-sm leading-6 text-[var(--muted-text)]">
                                Ya quedó habilitada la asignación por usuario y el intercambio desde `Todos`. Sobre esta base podemos construir el dashboard CFO y Customer Success sin volver a tocar permisos ni preferencias.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default async function DashboardPage({
    searchParams,
}: {
    searchParams?: { dashboard?: string | string[] };
}) {
    const session = await auth();

    if (!session?.user?.email) {
        redirect("/login");
    }

    const workspace = await getCurrentWorkspace();
    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { dashboardPreference: true },
    });

    const firstName = session.user.name?.split(" ")[0] || session.user.email.split("@")[0] || "Equipo";
    const dashboardPreference = currentUser?.dashboardPreference || "ALL";
    const requestedView = normalizeDashboardView(searchParams?.dashboard);
    const currentView =
        dashboardPreference === "ALL"
            ? requestedView || "CEO"
            : dashboardPreference;
    const selector = dashboardPreference === "ALL" ? <DashboardSwitcher currentView={currentView} /> : undefined;

    if (currentView === "CEO") {
        const [stats, pipeline] = await Promise.all([
            workspace ? getBasicStats(workspace.id) : Promise.resolve(EMPTY_STATS),
            workspace ? getPipelineBreakdown(workspace.id) : Promise.resolve([]),
        ]);
        return <ExecutiveDashboard firstName={firstName} stats={stats} pipeline={pipeline} selector={selector} />;
    }

    if (currentView === "CFO") {
        const stats = workspace ? await getBasicStats(workspace.id) : EMPTY_STATS;
        const cfoData = workspace
            ? await getCfoDashboardData(workspace, stats)
            : {
                admCloudConfigured: false,
                generatedAtLabel: fullDateLabel(new Date()),
                monthLabel: monthLabel(new Date()),
                previousMonthLabel: monthLabel(addMonths(new Date(), -1)),
                warnings: [],
                finance: EMPTY_CFO_FINANCE,
            };

        return (
            <CfoDashboard
                firstName={firstName}
                selector={selector}
                admCloudConfigured={cfoData.admCloudConfigured}
                generatedAtLabel={cfoData.generatedAtLabel}
                monthLabel={cfoData.monthLabel}
                previousMonthLabel={cfoData.previousMonthLabel}
                warnings={cfoData.warnings}
                crm={{
                    contractualMrr: stats.mrr,
                    arr: stats.arr,
                    subscriberClients: stats.clientCompaniesCount,
                    oneTimeClients: stats.oneTimeClientsCount,
                    prospects: stats.prospectsCount,
                    potentialClients: stats.potentialClientsCount,
                    activeProjects: stats.activeProjects,
                    activeUsers: stats.activeClientUsers,
                }}
                finance={cfoData.finance}
            />
        );
    }

    return (
        <ComingSoonDashboard
            title="Dashboard Customer Success"
            description="Esta vista se enfocará en salud de cuentas, adopción, soporte, riesgo de churn y expansión de clientes."
            selector={selector}
        />
    );
}
