"use client";

import { PaymentFrequency } from "@prisma/client";
import { calculateQuoteTaxBreakdown } from "@/lib/quote-taxes";

interface QuoteItem {
    name: string;
    price: number;
    quantity: number;
    frequency: PaymentFrequency;
    netPrice: number;
}

interface QuotePDFTemplateProps {
    quote: any;
    items: QuoteItem[];
    companyName: string;
    contactName: string;
    totals: { oneTime: number; monthly: number };
    workspace?: {
        legalName?: string | null;
        rnc?: string | null;
        address?: string | null;
        phone?: string | null;
        logoUrl?: string | null;
    };
}

export function QuotePDFTemplate({
    quote,
    items,
    companyName,
    contactName,
    totals,
    workspace,
}: QuotePDFTemplateProps) {
    const formatCurrency = (value: number, currency: string) => {
        return new Intl.NumberFormat("es-DO", {
            style: "currency",
            currency: currency === "USD" ? "USD" : "DOP",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    const formatDate = (date: string | Date) => {
        return new Date(date).toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    const taxLabel = quote.taxType === "INCLUIDOS" ? "Incluidos" : "No incluidos";
    const taxName = quote.taxName ? `${quote.taxName}${quote.taxRate ? ` (${Number(quote.taxRate).toLocaleString("es-DO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%)` : ""}` : taxLabel;
    const hasOneTime = totals.oneTime > 0;
    const hasMonthly = totals.monthly > 0;
    const breakdown = calculateQuoteTaxBreakdown({
        totalOneTime: totals.oneTime,
        totalMonthly: totals.monthly,
        taxRate: quote.taxType === "INCLUIDOS" ? Number(quote.taxRate || 0) : null,
    });
    const showTaxBreakdown = quote.taxType === "INCLUIDOS" && Number(quote.taxRate || 0) > 0;
    const grandTotal = breakdown.grandTotal;

    return (
        <div
            id="quote-pdf-content"
            style={{
                width: "210mm",
                minHeight: "297mm",
                padding: "12mm 10mm",
                backgroundColor: "#ffffff",
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
                color: "#000000",
                position: "absolute",
                left: "-9999px",
                top: "0",
                fontSize: "8.5pt",
                lineHeight: "1.4",
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "8px",
                    gap: "12px",
                }}
            >
                <div style={{ width: "45%" }}>
                    {workspace?.logoUrl ? (
                        <img
                            src={workspace.logoUrl}
                            alt="Logo"
                            style={{
                                maxHeight: "52px",
                                maxWidth: "190px",
                                objectFit: "contain",
                            }}
                        />
                    ) : (
                        <div style={{ fontSize: "10pt", fontWeight: 700, marginBottom: "4px" }}>
                            {workspace?.legalName || "NEARBY CRM"}
                        </div>
                    )}
                </div>
                <div style={{ width: "55%", textAlign: "right", fontSize: "8pt", lineHeight: "1.5" }}>
                    <div style={{ fontWeight: 700, fontSize: "9pt", marginBottom: "2px" }}>
                        {workspace?.legalName || "NEARBY CRM"}
                    </div>
                    {workspace?.rnc && (
                        <div>RNC: {workspace.rnc}</div>
                    )}
                    {workspace?.address && (
                        <div>{workspace.address}</div>
                    )}
                    <div>República Dominicana</div>
                    {workspace?.phone && (
                        <div>Tel: {workspace.phone}</div>
                    )}
                </div>
            </div>

            {/* Divider 1 */}
            <div style={{ height: "12px", backgroundColor: "#c9d9de", margin: "10px 0" }} />

            {/* Main details */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                    gap: "10px",
                }}
            >
                <div style={{ width: "58%" }}>
                    <div style={{ marginBottom: "3px" }}>
                        <span style={{ fontWeight: 700, display: "inline-block", width: "95px" }}>Cotización Nro.:</span>
                        <span>{String(quote.number).padStart(3, "0")}</span>
                    </div>
                    <div style={{ marginBottom: "3px" }}>
                        <span style={{ fontWeight: 700, display: "inline-block", width: "95px" }}>Cliente:</span>
                        <span>{companyName}</span>
                    </div>
                    <div style={{ marginBottom: "3px" }}>
                        <span style={{ fontWeight: 700, display: "inline-block", width: "95px" }}>Atención:</span>
                        <span>{contactName || "-"}</span>
                    </div>
                </div>
                <div style={{ width: "42%", textAlign: "right" }}>
                    <div style={{ marginBottom: "3px" }}>
                        <span style={{ fontWeight: 700 }}>Fecha de emisión:</span> {formatDate(quote.date)}
                    </div>
                    <div style={{ marginBottom: "3px" }}>
                        <span style={{ fontWeight: 700 }}>Validez:</span> {quote.validity}
                    </div>
                </div>
            </div>

            {/* Divider 2 */}
            <div style={{ height: "12px", backgroundColor: "#c9d9de", margin: "10px 0" }} />

            {/* Proposal description */}
            <div style={{ marginBottom: "10px" }}>
                <div style={{
                    fontSize: "9pt",
                    fontWeight: 700,
                    marginBottom: "6px",
                }}>
                    Descripción de la Propuesta
                </div>
                <div
                    style={{
                        minHeight: "34px",
                        whiteSpace: "pre-wrap",
                        fontSize: "8.2pt",
                        lineHeight: "1.55",
                    }}
                >
                    {quote.proposalDescription || "—"}
                </div>
                <div
                    style={{
                        height: "12px",
                        backgroundColor: "#c9d9de",
                        marginTop: "10px",
                    }}
                />
            </div>

            {/* Products Table */}
            <div style={{ marginBottom: "14px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8pt" }}>
                    <thead>
                        <tr style={{ backgroundColor: "#ffffff" }}>
                            <th style={{
                                padding: "8px 6px",
                                textAlign: "left",
                                border: "1px solid #dddddd",
                                fontWeight: 700,
                                width: "40%",
                            }}>
                                Descripción
                            </th>
                            <th style={{
                                padding: "8px 6px",
                                textAlign: "right",
                                border: "1px solid #dddddd",
                                fontWeight: 700,
                                width: "12%",
                            }}>
                                Cant.
                            </th>
                            <th style={{
                                padding: "8px 6px",
                                textAlign: "right",
                                border: "1px solid #dddddd",
                                fontWeight: 700,
                                width: "16%",
                            }}>
                                P. Unit.
                            </th>
                            <th style={{
                                padding: "8px 6px",
                                textAlign: "center",
                                border: "1px solid #dddddd",
                                fontWeight: 700,
                                width: "14%",
                            }}>
                                Frec.
                            </th>
                            <th style={{
                                padding: "8px 6px",
                                textAlign: "right",
                                border: "1px solid #dddddd",
                                fontWeight: 700,
                                width: "18%",
                            }}>
                                Total
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index}>
                                <td style={{ padding: "8px 6px", border: "1px solid #dddddd" }}>
                                    {item.name}
                                </td>
                                <td style={{ padding: "8px 6px", textAlign: "right", border: "1px solid #dddddd" }}>
                                    {item.quantity.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td style={{ padding: "8px 6px", textAlign: "right", border: "1px solid #dddddd" }}>
                                    {formatCurrency(item.price, quote.currency)}
                                </td>
                                <td style={{ padding: "8px 6px", textAlign: "center", border: "1px solid #dddddd" }}>
                                    {item.frequency === "MENSUAL" ? "Mensual" : "Pago único"}
                                </td>
                                <td style={{ padding: "8px 6px", textAlign: "right", border: "1px solid #dddddd" }}>
                                    {formatCurrency(item.netPrice, quote.currency)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "14px" }}>
                <div style={{ width: "285px" }}>
                    {hasOneTime && showTaxBreakdown && (
                        <>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                                <span>Base imponible pago único:</span>
                                <span style={{ textAlign: "right" }}>{formatCurrency(breakdown.baseOneTime, quote.currency)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                                <span>{quote.taxName || "Impuesto"} pago único:</span>
                                <span style={{ textAlign: "right" }}>{formatCurrency(breakdown.taxOneTime, quote.currency)}</span>
                            </div>
                        </>
                    )}
                    {hasOneTime && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                            <span style={{ fontWeight: 700 }}>Total pago único:</span>
                            <span style={{ textAlign: "right" }}>{formatCurrency(breakdown.totalOneTime, quote.currency)}</span>
                        </div>
                    )}
                    {hasMonthly && showTaxBreakdown && (
                        <>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                                <span>Base imponible mensual:</span>
                                <span style={{ textAlign: "right" }}>{formatCurrency(breakdown.baseMonthly, quote.currency)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                                <span>{quote.taxName || "Impuesto"} mensual:</span>
                                <span style={{ textAlign: "right" }}>{formatCurrency(breakdown.taxMonthly, quote.currency)}</span>
                            </div>
                        </>
                    )}
                    {hasMonthly && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                            <span style={{ fontWeight: 700 }}>Total mensual:</span>
                            <span style={{ textAlign: "right" }}>{formatCurrency(breakdown.totalMonthly, quote.currency)}</span>
                        </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                        <span style={{ fontWeight: 700 }}>Impuestos:</span>
                        <span style={{ textAlign: "right" }}>{showTaxBreakdown ? taxName : taxLabel}</span>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginTop: "4px",
                            paddingTop: "4px",
                            borderTop: "1px solid #dddddd",
                            fontWeight: 700,
                        }}
                    >
                        <span>Total {quote.currency}:</span>
                        <span style={{ textAlign: "right" }}>{formatCurrency(grandTotal, quote.currency)}</span>
                    </div>
                </div>
            </div>

            {/* Divider 3 */}
            <div style={{ height: "12px", backgroundColor: "#c9d9de", margin: "10px 0" }} />

            {/* Terms / extra fields */}
            {(quote.paymentConditions || quote.deliveryTime) && (
                <div style={{ marginTop: "10px", marginBottom: "10px" }}>
                    {quote.paymentConditions && (
                        <div style={{ marginBottom: "10px" }}>
                            <div style={{ fontSize: "9pt", fontWeight: 700, marginBottom: "5px" }}>
                                Condiciones de pago
                            </div>
                            <div style={{ whiteSpace: "pre-wrap", fontSize: "8.2pt", lineHeight: "1.55" }}>
                                {quote.paymentConditions}
                            </div>
                        </div>
                    )}
                    {quote.deliveryTime && (
                        <div>
                            <div style={{ fontSize: "9pt", fontWeight: 700, marginBottom: "5px" }}>
                                Tiempo de entrega
                            </div>
                            <div style={{ whiteSpace: "pre-wrap", fontSize: "8.2pt", lineHeight: "1.55" }}>
                                {quote.deliveryTime}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Footer */}
            <div style={{
                borderTop: "1px solid #e5e7eb",
                paddingTop: "10px",
                marginTop: "12px",
                textAlign: "center",
            }}>
                <div style={{ fontSize: "7pt", color: "#6b7280", lineHeight: "1.6" }}>
                    <div style={{ marginBottom: "4px" }}>
                        <span style={{ fontWeight: 600 }}>Impuestos:</span> {showTaxBreakdown ? taxName : taxLabel}
                        {" • "}
                        <span style={{ fontWeight: 600 }}>Moneda:</span> {quote.currency}
                    </div>
                    <div style={{ fontStyle: "italic" }}>
                        Esta cotización es válida por {quote.validity}
                    </div>
                </div>
            </div>
        </div>
    );
}
