import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/actions/workspace";
import { createAdmCloudClient, AdmCloudInvoice, AdmCloudQuote } from "@/lib/admcloud/client";

export interface ReportLine {
    clientName: string;
    clientId: string;
    itemDescription: string;
    itemCode: string;
    quantity: number;
    unitPrice: number;
    exchangeRate: number;
    discountPercent: number;
    documentNumber: string;
    documentType: "proforma" | "credit_invoice";
    documentDate: string;
    extendedPrice: number;
}

function parseDate(dateStr?: string): Date | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
}

function extractDocDate(doc: AdmCloudInvoice | AdmCloudQuote): Date | null {
    const raw = doc.DocDate || doc.DocDateString || (doc as AdmCloudInvoice).TransactionDate || doc.CreationDate;
    return parseDate(raw as string);
}

function extractDocNumber(doc: AdmCloudInvoice | AdmCloudQuote): string {
    return (doc.DocID || (doc as AdmCloudInvoice).TransactionNumber || doc.ID || "").toString();
}

function extractExchangeRate(doc: AdmCloudInvoice | AdmCloudQuote): number {
    const ref = doc.Reference;
    if (!ref) return 0;
    const num = parseFloat(String(ref));
    return isNaN(num) ? 0 : num;
}

function parseNumericValue(value: unknown): number | null {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string") {
        const normalized = value
            .trim()
            .replace(/[%$]/g, "")
            .replace(/,/g, "")
            .replace(/\s+/g, "");
        if (!normalized) return null;
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function getNumberFromAliases(record: Record<string, unknown>, aliases: string[]): number | null {
    for (const alias of aliases) {
        const direct = parseNumericValue(record[alias]);
        if (direct !== null) return direct;
    }

    const lowerMap = new Map<string, unknown>();
    for (const [key, value] of Object.entries(record)) {
        lowerMap.set(key.toLowerCase(), value);
    }

    for (const alias of aliases) {
        const match = parseNumericValue(lowerMap.get(alias.toLowerCase()));
        if (match !== null) return match;
    }

    const stack: unknown[] = Object.values(record);
    let depth = 0;
    while (stack.length > 0 && depth < 3) {
        const nextStack: unknown[] = [];
        for (const value of stack) {
            if (!value || typeof value !== "object") continue;

            if (Array.isArray(value)) {
                nextStack.push(...value);
                continue;
            }

            const nested = value as Record<string, unknown>;
            const nestedLower = new Map<string, unknown>();
            for (const [k, v] of Object.entries(nested)) nestedLower.set(k.toLowerCase(), v);

            for (const alias of aliases) {
                const direct = parseNumericValue(nested[alias]);
                if (direct !== null) return direct;
                const lower = parseNumericValue(nestedLower.get(alias.toLowerCase()));
                if (lower !== null) return lower;
            }

            nextStack.push(...Object.values(nested));
        }
        stack.splice(0, stack.length, ...nextStack);
        depth++;
    }

    return null;
}

function getDiscountPercent(record: Record<string, unknown>, quantity: number, unitPrice: number): number {
    const percent = getNumberFromAliases(record, [
        "DiscountPercent",
        "EffectiveDiscountPercent",
        "StandardDiscountPercent",
        "Discount",
        "DiscountPct",
        "DiscountPCT",
        "DiscPercent",
        "DiscPct",
        "DiscPrcnt",
        "DiscountPercentage",
    ]);
    if (percent !== null) return percent;

    const discountAmount = getNumberFromAliases(record, [
        "DiscountAmount",
        "DiscountAmountLocalCurrency",
        "DiscountValue",
        "DiscAmount",
        "DiscValue",
    ]);

    const gross = quantity * unitPrice;
    if (discountAmount !== null && gross > 0) {
        return (discountAmount * 100) / gross;
    }

    const dynamicPercent = getNumberFromAliases(record, Object.keys(record).filter((k) => {
        const key = k.toLowerCase();
        return key.includes("discount") && key.includes("percent");
    }));
    if (dynamicPercent !== null) return dynamicPercent;

    return 0;
}

function normalizeInvoiceItems(invoice: AdmCloudInvoice, clientName: string, clientId: string): ReportLine[] {
    const items = invoice.Items || [];
    const docDate = extractDocDate(invoice);
    const docNumber = extractDocNumber(invoice);
    const exchangeRate = extractExchangeRate(invoice);

    return items.map((item) => {
        const record = item as Record<string, unknown>;
        const quantity = getNumberFromAliases(record, ["Quantity"]) ?? item.Quantity ?? 0;
        const unitPrice = getNumberFromAliases(record, ["UnitPrice", "Price", "SalesPrice"]) ?? item.UnitPrice ?? 0;
        let discountPercent = getDiscountPercent(record, quantity, unitPrice);
        const extended =
            getNumberFromAliases(record, ["Extended", "Amount", "LineTotal"]) ??
            item.Amount ??
            quantity * unitPrice * (1 - discountPercent / 100);
        if (discountPercent === 0 && quantity > 0 && unitPrice > 0 && extended < quantity * unitPrice) {
            discountPercent = ((quantity * unitPrice - extended) / (quantity * unitPrice)) * 100;
        }
        const itemCode = String(record.ItemCode || record.ItemSKU || record.Code || "");
        const itemDesc = String(record.Description || record.Name || record.ItemName || item.Description || "");

        return {
            clientName,
            clientId,
            itemDescription: itemDesc,
            itemCode,
            quantity,
            unitPrice,
            exchangeRate,
            discountPercent,
            documentNumber: docNumber,
            documentType: "credit_invoice" as const,
            documentDate: docDate?.toISOString().split("T")[0] || "",
            extendedPrice: extended,
        };
    });
}

function normalizeQuoteItems(quote: AdmCloudQuote, clientName: string, clientId: string): ReportLine[] {
    const items = quote.Items || [];
    const docDate = extractDocDate(quote);
    const docNumber = extractDocNumber(quote);
    const exchangeRate = extractExchangeRate(quote);

    return items.map((item) => {
        const record = item as Record<string, unknown>;
        const quantity = getNumberFromAliases(record, ["Quantity"]) ?? item.Quantity ?? 0;
        const unitPrice = getNumberFromAliases(record, ["UnitPrice", "Price", "SalesPrice"]) ?? item.Price ?? 0;
        let discountPercent = getDiscountPercent(record, quantity, unitPrice);
        const extended =
            getNumberFromAliases(record, ["Extended", "Amount", "LineTotal"]) ??
            quantity * unitPrice * (1 - discountPercent / 100);
        if (discountPercent === 0 && quantity > 0 && unitPrice > 0 && extended < quantity * unitPrice) {
            discountPercent = ((quantity * unitPrice - extended) / (quantity * unitPrice)) * 100;
        }
        const itemCode = String(record.ItemCode || record.ItemSKU || record.Code || "");
        const itemDesc = String(record.Description || record.Name || record.ItemName || item.Name || "");

        return {
            clientName,
            clientId,
            itemDescription: itemDesc,
            itemCode,
            quantity,
            unitPrice,
            exchangeRate,
            discountPercent,
            documentNumber: docNumber,
            documentType: "proforma" as const,
            documentDate: docDate?.toISOString().split("T")[0] || "",
            extendedPrice: extended,
        };
    });
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

        const { searchParams } = request.nextUrl;
        const typesParam = searchParams.get("types") || "proformas,credit";
        const dateFrom = searchParams.get("dateFrom");
        const dateTo = searchParams.get("dateTo");
        const itemsFilter = searchParams.get("items")?.split(",").filter(Boolean) || [];

        const includeProformas = typesParam.includes("proformas");
        const includeCredit = typesParam.includes("credit");

        const dateFromObj = dateFrom ? new Date(dateFrom) : null;
        const dateToObj = dateTo ? new Date(dateTo + "T23:59:59") : null;

        const companies = await prisma.company.findMany({
            where: {
                workspaceId: workspace.id,
                admCloudRelationshipId: { not: null },
            },
            select: {
                id: true,
                name: true,
                admCloudRelationshipId: true,
            },
        });

        if (companies.length === 0) {
            return NextResponse.json({ lines: [], message: "No hay empresas vinculadas a ADMCloud" });
        }

        const allLines: ReportLine[] = [];

        const BATCH_SIZE = 5;
        for (let i = 0; i < companies.length; i += BATCH_SIZE) {
            const batch = companies.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(async (company) => {
                const relId = company.admCloudRelationshipId!;
                const lines: ReportLine[] = [];

                if (includeCredit) {
                    const res = await client.getCreditInvoices(relId);
                    if (res.success && res.data) {
                        for (const invoice of res.data) {
                            const invoiceLines = normalizeInvoiceItems(invoice, company.name, company.id);
                            if (invoiceLines.length > 0) {
                                lines.push(...invoiceLines);
                            } else {
                                lines.push({
                                    clientName: company.name,
                                    clientId: company.id,
                                    itemDescription: "(Sin detalle de items)",
                                    itemCode: "",
                                    quantity: 1,
                                    unitPrice: Number(invoice.SubtotalAmount || invoice.SubTotal || invoice.Total || 0),
                                    exchangeRate: extractExchangeRate(invoice),
                                    discountPercent: 0,
                                    documentNumber: extractDocNumber(invoice),
                                    documentType: "credit_invoice",
                                    documentDate: extractDocDate(invoice)?.toISOString().split("T")[0] || "",
                                    extendedPrice: Number(invoice.TotalAmount || invoice.Total || 0),
                                });
                            }
                        }
                    }
                }

                if (includeProformas) {
                    const res = await client.getQuotesByCustomer(relId);
                    if (res.success && res.data) {
                        const QUOTE_BATCH = 5;
                        for (let q = 0; q < res.data.length; q += QUOTE_BATCH) {
                            const quoteBatch = res.data.slice(q, q + QUOTE_BATCH);
                            const detailResults = await Promise.all(
                                quoteBatch.map(async (quote) => {
                                    if (quote.Items && quote.Items.length > 0) {
                                        return quote;
                                    }
                                    const quoteId = quote.ID || (quote as Record<string, unknown>).id;
                                    if (!quoteId) return quote;
                                    const detail = await client.getQuote(String(quoteId));
                                    return detail.success && detail.data ? detail.data : quote;
                                })
                            );
                            for (const fullQuote of detailResults) {
                                lines.push(...normalizeQuoteItems(fullQuote, company.name, company.id));
                            }
                        }
                    }
                }

                return lines;
            });

            const batchResults = await Promise.all(batchPromises);
            for (const lines of batchResults) {
                allLines.push(...lines);
            }
        }

        let filtered = allLines;

        if (dateFromObj) {
            filtered = filtered.filter((l) => {
                const d = parseDate(l.documentDate);
                return d && d >= dateFromObj;
            });
        }
        if (dateToObj) {
            filtered = filtered.filter((l) => {
                const d = parseDate(l.documentDate);
                return d && d <= dateToObj;
            });
        }

        if (itemsFilter.length > 0) {
            const itemSet = new Set(itemsFilter.map(i => i.toLowerCase()));
            filtered = filtered.filter((l) =>
                itemSet.has(l.itemCode.toLowerCase()) || itemSet.has(l.itemDescription.toLowerCase())
            );
        }

        filtered.sort((a, b) => {
            const nameCompare = a.clientName.localeCompare(b.clientName);
            if (nameCompare !== 0) return nameCompare;
            return a.documentDate.localeCompare(b.documentDate);
        });

        return NextResponse.json({ lines: filtered });
    } catch (error) {
        console.error("[Reports] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Error interno" },
            { status: 500 }
        );
    }
}
