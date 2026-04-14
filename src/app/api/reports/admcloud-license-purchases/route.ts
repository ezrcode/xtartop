import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCurrentWorkspace } from "@/actions/workspace";
import { prisma } from "@/lib/prisma";
import { createAdmCloudClient, type AdmCloudVendorBill, type AdmCloudVendorBillItem } from "@/lib/admcloud/client";

export interface LicensePurchaseReportLine {
    documentNumber: string;
    reference: string;
    documentDate: string;
    vendorName: string;
    currency: string;
    itemCode: string;
    description: string;
    quantity: number;
    unit: string;
    price: number;
    discountPercent: number;
    amount: number;
    exchangeRate: number;
    amountDop: number;
}

function parseDate(dateStr?: string | null): Date | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? null : d;
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

    return null;
}

function getDocumentDate(doc: AdmCloudVendorBill): string {
    const date = parseDate(doc.DocDate || doc.DocDateString);
    return date?.toISOString().split("T")[0] || "";
}

function getExchangeRate(doc: AdmCloudVendorBill): number {
    const record = doc as Record<string, unknown>;
    return getNumberFromAliases(record, ["ExchangeRate", "ExchangeRateAmount"]) ?? parseNumericValue(doc.Reference) ?? 0;
}

function getLineAmounts(item: AdmCloudVendorBillItem): { amount: number; amountBaseForDop: number } {
    const record = item as Record<string, unknown>;
    const quantity = getNumberFromAliases(record, ["Quantity"]) ?? 0;
    const price = getNumberFromAliases(record, ["Price", "UnitPrice", "SalesPrice"]) ?? 0;
    const discountPercent = getNumberFromAliases(record, ["DiscountPercent", "Discount", "DiscountPct"]) ?? 0;
    const discountAmount = getNumberFromAliases(record, ["DiscountAmount", "DiscountValue", "DiscAmount"]);
    const gross = quantity * price;

    const netAmount = getNumberFromAliases(record, ["NetAmount", "CalculatedNetAmount", "LineNetAmount", "AmountAfterDiscount"]);
    const amount = netAmount ?? (discountAmount !== null ? gross - discountAmount : gross * (1 - discountPercent / 100));
    const amountBaseForDop = gross > 0
        ? (discountPercent > 0 ? gross * (1 - discountPercent / 100) : discountAmount !== null ? gross - discountAmount : gross)
        : amount;

    return { amount, amountBaseForDop };
}

function normalizeVendorBill(doc: AdmCloudVendorBill): LicensePurchaseReportLine[] {
    const items = doc.Items || [];
    const documentNumber = String(doc.DocID || doc.ID || "");
    const documentDate = getDocumentDate(doc);
    const exchangeRate = getExchangeRate(doc);
    const vendorName = String(doc.RelationshipName || "");
    const reference = String(doc.Reference || "");
    const currency = String(doc.CurrencyID || "");

    return items.map((item) => {
        const record = item as Record<string, unknown>;
        const quantity = getNumberFromAliases(record, ["Quantity"]) ?? 0;
        const price = getNumberFromAliases(record, ["Price", "UnitPrice", "SalesPrice"]) ?? 0;
        const discountPercent = getNumberFromAliases(record, ["DiscountPercent", "Discount", "DiscountPct"]) ?? 0;
        const { amount, amountBaseForDop } = getLineAmounts(item);

        return {
            documentNumber,
            reference,
            documentDate,
            vendorName,
            currency,
            itemCode: String(record.ItemSKU || record.ItemCode || record.Code || ""),
            description: String(record.Description || record.Name || record.ItemName || ""),
            quantity,
            unit: String(record.UOMName || record.Unit || record.UOM || ""),
            price,
            discountPercent,
            amount,
            exchangeRate,
            amountDop: amountBaseForDop * exchangeRate,
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

        const { searchParams } = request.nextUrl;
        const dateFrom = searchParams.get("dateFrom") || undefined;
        const dateTo = searchParams.get("dateTo") || undefined;
        const vendorName = (searchParams.get("vendorName") || "").trim().toLowerCase();

        const client = createAdmCloudClient({
            appId: workspaceData.admCloudAppId,
            username: workspaceData.admCloudUsername!,
            password: workspaceData.admCloudPassword!,
            company: workspaceData.admCloudCompany!,
            role: workspaceData.admCloudRole || "Administradores",
        });

        const result = await client.getVendorBills(dateFrom, dateTo);
        if (!result.success) {
            return NextResponse.json({ error: result.error || "Error consultando facturas de proveedor" }, { status: 502 });
        }

        const docs = result.data || [];
        const detailedDocs = await Promise.all(
            docs.map(async (doc) => {
                if (doc.Items && doc.Items.length > 0 && (!vendorName || doc.RelationshipName)) return doc;
                const id = doc.ID || (doc as Record<string, unknown>).id;
                if (!id) return doc;
                const detail = await client.getVendorBill(String(id));
                return detail.success && detail.data ? detail.data : doc;
            })
        );

        const filteredDocs = vendorName
            ? detailedDocs.filter((doc) => String(doc.RelationshipName || "").trim().toLowerCase() === vendorName)
            : detailedDocs;

        const lines = filteredDocs.flatMap(normalizeVendorBill);

        lines.sort((a, b) => {
            const dateCompare = a.documentDate.localeCompare(b.documentDate);
            if (dateCompare !== 0) return dateCompare;
            return a.documentNumber.localeCompare(b.documentNumber);
        });

        return NextResponse.json({ lines });
    } catch (error) {
        console.error("[LicensePurchasesReport] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Error interno" },
            { status: 500 }
        );
    }
}
