import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspace } from "@/actions/workspace";
import { createAdmCloudClient, AdmCloudCustomerCreditNote, AdmCloudInvoice, AdmCloudQuote } from "@/lib/admcloud/client";

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

interface InternalReportLine extends ReportLine {
    sourceDocumentId?: string;
    sourceDocumentNcf?: string;
    itemId?: string;
    itemSku?: string;
}

interface CreditNoteLineCredit {
    invoiceIds: Set<string>;
    invoiceDocNumbers: Set<string>;
    invoiceNcfs: Set<string>;
    itemKeys: Set<string>;
    remainingAmount: number;
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

function extractDocId(doc: AdmCloudInvoice | AdmCloudQuote | AdmCloudCustomerCreditNote): string {
    return String(doc.ID || (doc as Record<string, unknown>).id || "");
}

function extractExchangeRate(doc: AdmCloudInvoice | AdmCloudQuote): number {
    const ref = doc.Reference;
    if (!ref) return 0;
    const num = parseFloat(String(ref));
    return isNaN(num) ? 0 : num;
}

function normalizeKey(value: unknown): string {
    return String(value || "").trim().toLowerCase();
}

function getItemKeys(record: Record<string, unknown>): Set<string> {
    const keys = new Set<string>();
    const itemId = normalizeKey(record.ItemID || record.itemId || record.ItemId);
    const itemSku = normalizeKey(record.ItemSKU || record.SKU || record.Sku || record.sku);
    const itemCode = normalizeKey(record.ItemCode || record.Code || record.code);
    const name = normalizeKey(record.Name || record.Description || record.ItemName);

    if (itemId) keys.add(`id:${itemId}`);
    if (itemSku) keys.add(`sku:${itemSku}`);
    if (itemCode) keys.add(`code:${itemCode}`);
    if (name) keys.add(`name:${name}`);

    return keys;
}

function setsIntersect(a: Set<string>, b: Set<string>): boolean {
    for (const value of a) {
        if (b.has(value)) return true;
    }
    return false;
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

function getDiscountAmount(record: Record<string, unknown>): number | null {
    return getNumberFromAliases(record, [
        "DiscountAmount",
        "DiscountAmountLocalCurrency",
        "DiscountValue",
        "DiscAmount",
        "DiscValue",
    ]);
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

    const discountAmount = getDiscountAmount(record);

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

function getLineNetAmount(
    record: Record<string, unknown>,
    quantity: number,
    unitPrice: number,
    discountPercent: number,
    fallbackAmount?: number | null
): number {
    const gross = quantity * unitPrice;
    const netAmount = getNumberFromAliases(record, [
        "NetAmount",
        "CalculatedNetAmount",
        "LineNetAmount",
        "AmountAfterDiscount",
    ]);

    if (netAmount !== null) return netAmount;

    const discountAmount = getDiscountAmount(record);
    if (discountAmount !== null && gross > 0) {
        return gross - discountAmount;
    }

    if (discountPercent > 0 && gross > 0) {
        return gross * (1 - discountPercent / 100);
    }

    return (
        getNumberFromAliases(record, ["Extended", "Amount", "LineTotal"]) ??
        fallbackAmount ??
        gross
    );
}

function getCreditNoteInvoiceIds(note: AdmCloudCustomerCreditNote): Set<string> {
    return new Set(
        [
            note.InvoiceID,
            note.RelatedID,
            (note as Record<string, unknown>).invoiceId,
            (note as Record<string, unknown>).relatedId,
        ]
            .map(normalizeKey)
            .filter(Boolean)
    );
}

function getCreditNoteInvoiceDocNumbers(note: AdmCloudCustomerCreditNote): Set<string> {
    return new Set(
        [
            note.RelatedDocID,
            (note as Record<string, unknown>).RelatedDocumentNumber,
            (note as Record<string, unknown>).InvoiceDocID,
        ]
            .map(normalizeKey)
            .filter(Boolean)
    );
}

function getCreditNoteInvoiceNcfs(note: AdmCloudCustomerCreditNote): Set<string> {
    return new Set(
        [
            note.RelatedNCF,
            (note as Record<string, unknown>).InvoiceNCF,
        ]
            .map(normalizeKey)
            .filter(Boolean)
    );
}

function noteMatchesAnyInvoice(
    note: AdmCloudCustomerCreditNote,
    invoiceIds: Set<string>,
    invoiceDocNumbers: Set<string>,
    invoiceNcfs: Set<string>
): boolean {
    if (note.Void) return false;
    return (
        setsIntersect(getCreditNoteInvoiceIds(note), invoiceIds) ||
        setsIntersect(getCreditNoteInvoiceDocNumbers(note), invoiceDocNumbers) ||
        setsIntersect(getCreditNoteInvoiceNcfs(note), invoiceNcfs)
    );
}

function createCreditNoteLineCredits(note: AdmCloudCustomerCreditNote): CreditNoteLineCredit[] {
    if (note.Void || !note.Items?.length) return [];

    const invoiceIds = getCreditNoteInvoiceIds(note);
    const invoiceDocNumbers = getCreditNoteInvoiceDocNumbers(note);
    const invoiceNcfs = getCreditNoteInvoiceNcfs(note);

    return note.Items.map((item) => {
        const record = item as Record<string, unknown>;
        const quantity = getNumberFromAliases(record, ["Quantity"]) ?? item.Quantity ?? 0;
        const unitPrice = getNumberFromAliases(record, ["UnitPrice", "Price", "SalesPrice"]) ?? item.UnitPrice ?? item.Price ?? 0;
        const discountPercent = getDiscountPercent(record, quantity, unitPrice);
        const amount = getLineNetAmount(record, quantity, unitPrice, discountPercent, item.Amount);

        return {
            invoiceIds,
            invoiceDocNumbers,
            invoiceNcfs,
            itemKeys: getItemKeys(record),
            remainingAmount: Math.max(0, amount),
        };
    }).filter((credit) => credit.remainingAmount > 0 && credit.itemKeys.size > 0);
}

function applyCreditNoteLineCredits(
    lines: InternalReportLine[],
    credits: CreditNoteLineCredit[]
): InternalReportLine[] {
    return lines.flatMap((line) => {
        let adjustedAmount = line.extendedPrice;
        const lineInvoiceIds = new Set([normalizeKey(line.sourceDocumentId)].filter(Boolean));
        const lineDocNumbers = new Set([normalizeKey(line.documentNumber)].filter(Boolean));
        const lineNcfs = new Set([normalizeKey(line.sourceDocumentNcf)].filter(Boolean));
        const lineItemKeys = new Set(
            [
                line.itemId ? `id:${normalizeKey(line.itemId)}` : "",
                line.itemSku ? `sku:${normalizeKey(line.itemSku)}` : "",
                line.itemCode ? `code:${normalizeKey(line.itemCode)}` : "",
                line.itemDescription ? `name:${normalizeKey(line.itemDescription)}` : "",
            ].filter(Boolean)
        );

        for (const credit of credits) {
            if (adjustedAmount <= 0) break;
            if (credit.remainingAmount <= 0) continue;
            const matchesInvoice =
                setsIntersect(credit.invoiceIds, lineInvoiceIds) ||
                setsIntersect(credit.invoiceDocNumbers, lineDocNumbers) ||
                setsIntersect(credit.invoiceNcfs, lineNcfs);
            if (!matchesInvoice || !setsIntersect(credit.itemKeys, lineItemKeys)) continue;

            const amountToApply = Math.min(adjustedAmount, credit.remainingAmount);
            adjustedAmount -= amountToApply;
            credit.remainingAmount -= amountToApply;
        }

        if (adjustedAmount <= 0.005) return [];
        return [{ ...line, extendedPrice: adjustedAmount }];
    });
}

function normalizeInvoiceItems(invoice: AdmCloudInvoice, clientName: string, clientId: string): InternalReportLine[] {
    const items = invoice.Items || [];
    const docDate = extractDocDate(invoice);
    const docNumber = extractDocNumber(invoice);
    const exchangeRate = extractExchangeRate(invoice);
    const sourceDocumentId = extractDocId(invoice);
    const sourceDocumentNcf = (invoice.NCF || (invoice as unknown as Record<string, unknown>).ncf || "").toString();

    return items.map((item) => {
        const record = item as Record<string, unknown>;
        const quantity = getNumberFromAliases(record, ["Quantity"]) ?? item.Quantity ?? 0;
        const unitPrice = getNumberFromAliases(record, ["UnitPrice", "Price", "SalesPrice"]) ?? item.UnitPrice ?? 0;
        let discountPercent = getDiscountPercent(record, quantity, unitPrice);
        const extended = getLineNetAmount(record, quantity, unitPrice, discountPercent, item.Amount);
        if (discountPercent === 0 && quantity > 0 && unitPrice > 0 && extended < quantity * unitPrice) {
            discountPercent = ((quantity * unitPrice - extended) / (quantity * unitPrice)) * 100;
        }
        const itemCode = String(record.ItemCode || record.ItemSKU || record.Code || "");
        const itemDesc = String(record.Description || record.Name || record.ItemName || item.Description || "");
        const itemId = String(record.ItemID || record.itemId || record.ItemId || "");
        const itemSku = String(record.ItemSKU || record.SKU || record.Sku || record.sku || "");

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
            sourceDocumentId,
            sourceDocumentNcf,
            itemId,
            itemSku,
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
        const extended = getLineNetAmount(record, quantity, unitPrice, discountPercent);
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
        const clientLabel = searchParams.get("clientLabel") || "company";
        const useLegalName = clientLabel === "legal";

        const includeProformas = typesParam.includes("proformas");
        const includeCredit = typesParam.includes("credit");

        const dateFromObj = dateFrom ? new Date(dateFrom) : null;
        const dateToObj = dateTo ? new Date(dateTo + "T23:59:59") : null;

        const companies = await prisma.company.findMany({
            where: {
                workspaceId: workspace.id,
                admCloudLinks: { some: {} },
            },
            select: {
                id: true,
                name: true,
                legalName: true,
                admCloudLinks: { select: { admCloudRelationshipId: true } },
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
                const relIds = company.admCloudLinks.map(l => l.admCloudRelationshipId);
                const companyLabel = useLegalName
                    ? (company.legalName?.trim() || company.name)
                    : company.name;
                const lines: InternalReportLine[] = [];

                for (const relId of relIds) {
                    if (includeCredit) {
                        const res = await client.getCreditInvoices(relId, dateFrom || undefined, dateTo || undefined);
                        if (res.success && res.data) {
                            const INV_BATCH = 5;
                            const fullInvoices: AdmCloudInvoice[] = [];
                            for (let q = 0; q < res.data.length; q += INV_BATCH) {
                                const invBatch = res.data.slice(q, q + INV_BATCH);
                                const detailResults = await Promise.all(
                                    invBatch.map(async (invoice) => {
                                        if (invoice.Items && invoice.Items.length > 0) {
                                            return invoice;
                                        }
                                        const invoiceId = invoice.ID || (invoice as unknown as Record<string, unknown>).id;
                                        if (!invoiceId) return invoice;
                                        const detail = await client.getCreditInvoice(String(invoiceId));
                                        return detail.success && detail.data ? detail.data : invoice;
                                    })
                                );
                                fullInvoices.push(...detailResults);
                            }

                            const invoiceIds = new Set(fullInvoices.map(extractDocId).map(normalizeKey).filter(Boolean));
                            const invoiceDocNumbers = new Set(fullInvoices.map(extractDocNumber).map(normalizeKey).filter(Boolean));
                            const invoiceNcfs = new Set(
                                fullInvoices
                                    .map((invoice) => normalizeKey(invoice.NCF || (invoice as unknown as Record<string, unknown>).ncf))
                                    .filter(Boolean)
                            );
                            const creditNoteCredits: CreditNoteLineCredit[] = [];

                            if (invoiceIds.size > 0 || invoiceDocNumbers.size > 0 || invoiceNcfs.size > 0) {
                                const creditNotesResult = await client.getCustomerCreditNotes(relId);
                                if (creditNotesResult.success && creditNotesResult.data) {
                                    const relevantCreditNotes = creditNotesResult.data.filter((note) =>
                                        noteMatchesAnyInvoice(note, invoiceIds, invoiceDocNumbers, invoiceNcfs)
                                    );
                                    const detailedCreditNotes = await Promise.all(
                                        relevantCreditNotes.map(async (note) => {
                                            if (note.Items && note.Items.length > 0) return note;
                                            const noteId = extractDocId(note);
                                            if (!noteId) return note;
                                            const detail = await client.getCustomerCreditNote(noteId);
                                            return detail.success && detail.data
                                                ? {
                                                    ...note,
                                                    ...detail.data,
                                                    RelatedID: detail.data.RelatedID ?? note.RelatedID,
                                                    RelatedDocID: detail.data.RelatedDocID ?? note.RelatedDocID,
                                                    RelatedNCF: detail.data.RelatedNCF ?? note.RelatedNCF,
                                                }
                                                : note;
                                        })
                                    );

                                    creditNoteCredits.push(...detailedCreditNotes.flatMap(createCreditNoteLineCredits));
                                }
                            }

                            for (const fullInvoice of fullInvoices) {
                                const invoiceLines = applyCreditNoteLineCredits(
                                    normalizeInvoiceItems(fullInvoice, companyLabel, company.id),
                                    creditNoteCredits
                                );
                                if (invoiceLines.length > 0) {
                                    lines.push(...invoiceLines);
                                } else if (!fullInvoice.Items?.length) {
                                    lines.push({
                                        clientName: companyLabel,
                                        clientId: company.id,
                                        itemDescription: "(Sin detalle de items)",
                                        itemCode: "",
                                        quantity: 1,
                                        unitPrice: Number(fullInvoice.SubtotalAmount || fullInvoice.SubTotal || fullInvoice.Total || 0),
                                        exchangeRate: extractExchangeRate(fullInvoice),
                                        discountPercent: 0,
                                        documentNumber: extractDocNumber(fullInvoice),
                                        documentType: "credit_invoice",
                                        documentDate: extractDocDate(fullInvoice)?.toISOString().split("T")[0] || "",
                                        extendedPrice: Number(fullInvoice.TotalAmount || fullInvoice.Total || 0),
                                        sourceDocumentId: extractDocId(fullInvoice),
                                        sourceDocumentNcf: String(fullInvoice.NCF || (fullInvoice as unknown as Record<string, unknown>).ncf || ""),
                                    });
                                }
                            }
                        }
                    }

                    if (includeProformas) {
                        const res = await client.getQuotesByCustomer(relId, dateFrom || undefined, dateTo || undefined);
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
                                    lines.push(...normalizeQuoteItems(fullQuote, companyLabel, company.id));
                                }
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
