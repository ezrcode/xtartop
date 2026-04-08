"use client";

import { PaymentFrequency } from "@prisma/client";
import { calculateQuoteTaxBreakdown } from "@/lib/quote-taxes";
import { formatQuoteNumber } from "@/lib/deal-number";
import { normalizeQuoteRichText } from "@/lib/rich-text";

export type QuotePDFFormat = "basic" | "advanced";

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
    format?: QuotePDFFormat;
    workspace?: {
        legalName?: string | null;
        rnc?: string | null;
        address?: string | null;
        phone?: string | null;
        logoUrl?: string | null;
    };
}

function createQuotePDFContext({
    quote,
    totals,
}: Pick<QuotePDFTemplateProps, "quote" | "totals">) {
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
    const quoteCode = formatQuoteNumber(quote.deal?.number, quote.number);
    const proposalDescriptionHtml = normalizeQuoteRichText(quote.proposalDescription || "—");

    return {
        formatCurrency,
        formatDate,
        taxName,
        hasOneTime,
        hasMonthly,
        breakdown,
        showTaxBreakdown,
        grandTotal,
        quoteCode,
        proposalDescriptionHtml,
    };
}

export function QuotePDFTemplate({
    quote,
    items,
    companyName,
    contactName,
    totals,
    format = "basic",
    workspace,
}: QuotePDFTemplateProps) {
    if (format === "advanced") {
        return (
            <AdvancedQuotePDFTemplate
                quote={quote}
                items={items}
                companyName={companyName}
                contactName={contactName}
                totals={totals}
                workspace={workspace}
            />
        );
    }

    const {
        formatCurrency,
        formatDate,
        taxName,
        hasOneTime,
        hasMonthly,
        breakdown,
        showTaxBreakdown,
        grandTotal,
        quoteCode,
        proposalDescriptionHtml,
    } = createQuotePDFContext({ quote, totals });

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
                        <span>{quoteCode}</span>
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
                        fontSize: "8.2pt",
                        lineHeight: "1.55",
                    }}
                    className="quote-pdf-rich-text"
                    dangerouslySetInnerHTML={{ __html: proposalDescriptionHtml || "—" }}
                />
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
                            <th style={{ padding: "8px 6px", textAlign: "left", border: "1px solid #dddddd", fontWeight: 700, width: "40%" }}>Descripción</th>
                            <th style={{ padding: "8px 6px", textAlign: "right", border: "1px solid #dddddd", fontWeight: 700, width: "12%" }}>Cant.</th>
                            <th style={{ padding: "8px 6px", textAlign: "right", border: "1px solid #dddddd", fontWeight: 700, width: "16%" }}>P. Unit.</th>
                            <th style={{ padding: "8px 6px", textAlign: "center", border: "1px solid #dddddd", fontWeight: 700, width: "14%" }}>Frec.</th>
                            <th style={{ padding: "8px 6px", textAlign: "right", border: "1px solid #dddddd", fontWeight: 700, width: "18%" }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index}>
                                <td style={{ padding: "8px 6px", border: "1px solid #dddddd" }}>{item.name}</td>
                                <td style={{ padding: "8px 6px", textAlign: "right", border: "1px solid #dddddd" }}>{item.quantity.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td style={{ padding: "8px 6px", textAlign: "right", border: "1px solid #dddddd" }}>{formatCurrency(item.price, quote.currency)}</td>
                                <td style={{ padding: "8px 6px", textAlign: "center", border: "1px solid #dddddd" }}>{item.frequency === "MENSUAL" ? "Mensual" : "Pago único"}</td>
                                <td style={{ padding: "8px 6px", textAlign: "right", border: "1px solid #dddddd" }}>{formatCurrency(item.netPrice, quote.currency)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "14px" }}>
                <div style={{ width: "300px" }}>
                    {hasOneTime && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <span>Pago único:</span>
                            <span style={{ textAlign: "right" }}>{formatCurrency(breakdown.baseOneTime, quote.currency)}</span>
                        </div>
                    )}
                    {hasMonthly && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <span>Pago mensual:</span>
                            <span style={{ textAlign: "right" }}>{formatCurrency(breakdown.baseMonthly, quote.currency)}</span>
                        </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontWeight: 700 }}>
                        <span>Total sin impuestos:</span>
                        <span style={{ textAlign: "right" }}>{formatCurrency(breakdown.totalBase, quote.currency)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontWeight: 700 }}>
                        <span>{showTaxBreakdown ? `Impuestos (${taxName})` : "Impuestos"}</span>
                        <span style={{ textAlign: "right" }}>
                            {showTaxBreakdown ? formatCurrency(breakdown.totalTax, quote.currency) : formatCurrency(0, quote.currency)}
                        </span>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginTop: "6px",
                            paddingTop: "6px",
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
                            <div style={{ fontSize: "9pt", fontWeight: 700, marginBottom: "5px" }}>Condiciones de pago</div>
                            <div style={{ whiteSpace: "pre-wrap", fontSize: "8.2pt", lineHeight: "1.55" }}>{quote.paymentConditions}</div>
                        </div>
                    )}
                    {quote.deliveryTime && (
                        <div>
                            <div style={{ fontSize: "9pt", fontWeight: 700, marginBottom: "5px" }}>Tiempo de entrega</div>
                            <div style={{ whiteSpace: "pre-wrap", fontSize: "8.2pt", lineHeight: "1.55" }}>{quote.deliveryTime}</div>
                        </div>
                    )}
                </div>
            )}

            {/* Footer */}
            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "10px", marginTop: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "7pt", color: "#6b7280", lineHeight: "1.6" }}>
                    <div style={{ marginBottom: "4px" }}>
                        <span style={{ fontWeight: 600 }}>Impuestos:</span> {quote.taxType === "INCLUIDOS" ? "Incluidos" : "No incluidos"}
                        {" • "}
                        <span style={{ fontWeight: 600 }}>Moneda:</span> {quote.currency}
                    </div>
                    <div style={{ fontStyle: "italic" }}>Esta cotización es válida por {quote.validity}</div>
                </div>
            </div>
        </div>
    );
}

function AdvancedQuotePDFTemplate({
    quote,
    items,
    companyName,
    contactName,
    totals,
    workspace,
}: Omit<QuotePDFTemplateProps, "format">) {
    const {
        formatCurrency,
        formatDate,
        taxName,
        hasOneTime,
        hasMonthly,
        breakdown,
        showTaxBreakdown,
        grandTotal,
        quoteCode,
        proposalDescriptionHtml,
    } = createQuotePDFContext({ quote, totals });

    const muted = "#667085";
    const ink = "#17212f";
    const accent = "#ff5b35";
    const navy = "#101928";
    const line = "#d9e3e8";

    return (
        <div
            id="quote-pdf-content"
            style={{
                width: "210mm",
                minHeight: "297mm",
                padding: "0",
                backgroundColor: "#f6f8fa",
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
                color: ink,
                position: "absolute",
                left: "-9999px",
                top: "0",
                fontSize: "8.3pt",
                lineHeight: "1.48",
            }}
        >
            <div style={{ padding: "10mm", minHeight: "277mm", boxSizing: "border-box" }}>
                <div
                    style={{
                        background: `linear-gradient(135deg, ${navy} 0%, #1b2d44 72%, #263f5f 100%)`,
                        color: "#ffffff",
                        borderRadius: "14px",
                        padding: "9mm",
                        position: "relative",
                        overflow: "hidden",
                        marginBottom: "8mm",
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            width: "72mm",
                            height: "72mm",
                            borderRadius: "999px",
                            right: "-24mm",
                            top: "-30mm",
                            background: "rgba(255, 91, 53, 0.22)",
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            width: "50mm",
                            height: "50mm",
                            borderRadius: "999px",
                            right: "18mm",
                            bottom: "-34mm",
                            background: "rgba(201, 217, 222, 0.14)",
                        }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12mm", position: "relative" }}>
                        <div style={{ width: "45%" }}>
                            {workspace?.logoUrl ? (
                                <div style={{ background: "#ffffff", borderRadius: "10px", padding: "8px 10px", display: "inline-flex" }}>
                                    <img src={workspace.logoUrl} alt="Logo" style={{ maxHeight: "36px", maxWidth: "160px", objectFit: "contain" }} />
                                </div>
                            ) : (
                                <div style={{ fontSize: "12pt", fontWeight: 800, letterSpacing: "0.08em" }}>{workspace?.legalName || "NEARBY CRM"}</div>
                            )}
                        </div>
                        <div style={{ width: "55%", textAlign: "right", color: "rgba(255,255,255,0.78)", fontSize: "7.2pt", lineHeight: "1.55" }}>
                            <div style={{ fontSize: "7pt", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: "5px" }}>Cotización</div>
                            <div style={{ fontSize: "17pt", fontWeight: 800, color: "#ffffff", letterSpacing: "0.01em", marginBottom: "6px" }}>{quoteCode}</div>
                            <div style={{ fontWeight: 700, color: "#ffffff" }}>{workspace?.legalName || "NEARBY CRM"}</div>
                            {workspace?.rnc && <div>RNC: {workspace.rnc}</div>}
                            {workspace?.address && <div>{workspace.address}</div>}
                            <div>República Dominicana{workspace?.phone ? ` · Tel: ${workspace.phone}` : ""}</div>
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: "7mm", marginTop: "11mm", position: "relative" }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "7pt", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.58)", marginBottom: "5px" }}>Cliente</div>
                            <div style={{ fontSize: "18pt", fontWeight: 800, color: "#ffffff", lineHeight: "1.1" }}>{companyName || "—"}</div>
                            <div style={{ color: "rgba(255,255,255,0.74)", marginTop: "6px" }}>Atención: <span style={{ color: "#ffffff", fontWeight: 650 }}>{contactName || "—"}</span></div>
                        </div>
                        <div style={{ width: "52mm", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                            <div style={{ border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.08)", borderRadius: "10px", padding: "10px" }}>
                                <div style={{ fontSize: "6.6pt", textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.55)", marginBottom: "4px" }}>Fecha</div>
                                <div style={{ fontWeight: 800, color: "#ffffff" }}>{formatDate(quote.date)}</div>
                            </div>
                            <div style={{ border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.08)", borderRadius: "10px", padding: "10px" }}>
                                <div style={{ fontSize: "6.6pt", textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.55)", marginBottom: "4px" }}>Validez</div>
                                <div style={{ fontWeight: 800, color: "#ffffff" }}>{quote.validity}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", gap: "7mm", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <section style={{ background: "#ffffff", border: `1px solid ${line}`, borderRadius: "14px", padding: "7mm", marginBottom: "6mm" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5mm" }}>
                                <div style={{ width: "24px", height: "3px", borderRadius: "999px", background: accent }} />
                                <div style={{ fontSize: "7.2pt", textTransform: "uppercase", letterSpacing: "0.16em", color: muted, fontWeight: 800 }}>Descripción de la Propuesta</div>
                            </div>
                            <div
                                style={{ fontSize: "8.7pt", lineHeight: "1.65", color: "#253244" }}
                                className="quote-pdf-rich-text quote-pdf-rich-text-advanced"
                                dangerouslySetInnerHTML={{ __html: proposalDescriptionHtml || "—" }}
                            />
                        </section>

                        <section style={{ background: "#ffffff", border: `1px solid ${line}`, borderRadius: "14px", overflow: "hidden", marginBottom: "6mm" }}>
                            <div style={{ padding: "5mm 6mm", borderBottom: `1px solid ${line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <div style={{ fontSize: "7.2pt", textTransform: "uppercase", letterSpacing: "0.16em", color: muted, fontWeight: 800 }}>Productos y servicios</div>
                                </div>
                                <div style={{ color: muted, fontSize: "7.5pt" }}>{items.length} {items.length === 1 ? "línea" : "líneas"}</div>
                            </div>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "7.8pt" }}>
                                <thead>
                                    <tr style={{ backgroundColor: "#f3f6f8", color: muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                        <th style={{ padding: "9px 10px", textAlign: "left", fontWeight: 800, width: "40%" }}>Descripción</th>
                                        <th style={{ padding: "9px 8px", textAlign: "right", fontWeight: 800, width: "12%" }}>Cant.</th>
                                        <th style={{ padding: "9px 8px", textAlign: "right", fontWeight: 800, width: "17%" }}>P. Unit.</th>
                                        <th style={{ padding: "9px 8px", textAlign: "center", fontWeight: 800, width: "13%" }}>Frec.</th>
                                        <th style={{ padding: "9px 10px", textAlign: "right", fontWeight: 800, width: "18%" }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={index} style={{ borderTop: index === 0 ? "0" : `1px solid ${line}` }}>
                                            <td style={{ padding: "10px", color: ink, fontWeight: 650 }}>{item.name}</td>
                                            <td style={{ padding: "10px 8px", textAlign: "right", color: muted }}>{item.quantity.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td style={{ padding: "10px 8px", textAlign: "right", color: muted }}>{formatCurrency(item.price, quote.currency)}</td>
                                            <td style={{ padding: "10px 8px", textAlign: "center", color: muted }}>{item.frequency === "MENSUAL" ? "Mensual" : "Pago único"}</td>
                                            <td style={{ padding: "10px", textAlign: "right", color: ink, fontWeight: 800 }}>{formatCurrency(item.netPrice, quote.currency)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>

                        {(quote.paymentConditions || quote.deliveryTime) && (
                            <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                <div style={{ background: "#ffffff", border: `1px solid ${line}`, borderRadius: "12px", padding: "12px" }}>
                                    <div style={{ color: muted, textTransform: "uppercase", letterSpacing: "0.12em", fontSize: "6.8pt", fontWeight: 800, marginBottom: "6px" }}>Condiciones de pago</div>
                                    <div style={{ whiteSpace: "pre-wrap", fontSize: "8pt", color: ink, lineHeight: "1.55" }}>{quote.paymentConditions || "—"}</div>
                                </div>
                                <div style={{ background: "#ffffff", border: `1px solid ${line}`, borderRadius: "12px", padding: "12px" }}>
                                    <div style={{ color: muted, textTransform: "uppercase", letterSpacing: "0.12em", fontSize: "6.8pt", fontWeight: 800, marginBottom: "6px" }}>Tiempo de entrega</div>
                                    <div style={{ whiteSpace: "pre-wrap", fontSize: "8pt", color: ink, lineHeight: "1.55" }}>{quote.deliveryTime || "—"}</div>
                                </div>
                            </section>
                        )}
                    </div>

                    <aside style={{ width: "60mm", position: "relative" }}>
                        <div style={{ background: "#ffffff", border: `1px solid ${line}`, borderRadius: "14px", overflow: "hidden", marginBottom: "5mm" }}>
                            <div style={{ background: navy, color: "#ffffff", padding: "5mm" }}>
                                <div style={{ fontSize: "6.8pt", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.62)", marginBottom: "6px" }}>Resumen financiero</div>
                                <div style={{ fontSize: "18pt", fontWeight: 850, lineHeight: "1" }}>{formatCurrency(grandTotal, quote.currency)}</div>
                                <div style={{ fontSize: "7pt", color: "rgba(255,255,255,0.66)", marginTop: "6px" }}>Total {quote.currency}</div>
                            </div>
                            <div style={{ padding: "5mm", background: "#ffffff" }}>
                                {hasOneTime && (
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "8px" }}>
                                        <span style={{ color: muted }}>Pago único</span>
                                        <span style={{ fontWeight: 750, textAlign: "right" }}>{formatCurrency(breakdown.baseOneTime, quote.currency)}</span>
                                    </div>
                                )}
                                {hasMonthly && (
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "8px" }}>
                                        <span style={{ color: muted }}>Pago mensual</span>
                                        <span style={{ fontWeight: 750, textAlign: "right" }}>{formatCurrency(breakdown.baseMonthly, quote.currency)}</span>
                                    </div>
                                )}
                                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "8px", paddingTop: "8px", borderTop: `1px solid ${line}` }}>
                                    <span style={{ color: ink, fontWeight: 800 }}>Total sin impuestos</span>
                                    <span style={{ fontWeight: 850, textAlign: "right" }}>{formatCurrency(breakdown.totalBase, quote.currency)}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "8px" }}>
                                    <span style={{ color: ink, fontWeight: 800 }}>{showTaxBreakdown ? `Impuestos (${taxName})` : "Impuestos"}</span>
                                    <span style={{ fontWeight: 850, textAlign: "right" }}>{showTaxBreakdown ? formatCurrency(breakdown.totalTax, quote.currency) : formatCurrency(0, quote.currency)}</span>
                                </div>
                                <div style={{ height: "3px", background: `linear-gradient(90deg, ${accent}, #c9d9de)`, borderRadius: "999px", margin: "12px 0" }} />
                                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "9pt" }}>
                                    <span style={{ fontWeight: 850 }}>Total {quote.currency}</span>
                                    <span style={{ fontWeight: 900, textAlign: "right" }}>{formatCurrency(grandTotal, quote.currency)}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ background: "#ffffff", border: `1px solid ${line}`, borderRadius: "14px", padding: "5mm" }}>
                            <div style={{ fontSize: "6.8pt", textTransform: "uppercase", letterSpacing: "0.14em", color: muted, fontWeight: 800, marginBottom: "8px" }}>Datos de emisión</div>
                            <div style={{ display: "grid", gap: "7px", fontSize: "7.8pt" }}>
                                <div><span style={{ color: muted }}>Cotización:</span> <strong>{quoteCode}</strong></div>
                                <div><span style={{ color: muted }}>Fecha:</span> <strong>{formatDate(quote.date)}</strong></div>
                                <div><span style={{ color: muted }}>Validez:</span> <strong>{quote.validity}</strong></div>
                                <div><span style={{ color: muted }}>Impuestos:</span> <strong>{quote.taxType === "INCLUIDOS" ? "Incluidos" : "No incluidos"}</strong></div>
                                <div><span style={{ color: muted }}>Moneda:</span> <strong>{quote.currency}</strong></div>
                            </div>
                        </div>
                    </aside>
                </div>

                <div style={{ marginTop: "7mm", borderTop: `1px solid ${line}`, paddingTop: "4mm", display: "flex", justifyContent: "space-between", alignItems: "center", color: muted, fontSize: "7pt" }}>
                    <div>
                        <span style={{ fontWeight: 800 }}>Impuestos:</span> {quote.taxType === "INCLUIDOS" ? "Incluidos" : "No incluidos"}
                        {" · "}
                        <span style={{ fontWeight: 800 }}>Moneda:</span> {quote.currency}
                    </div>
                    <div style={{ fontStyle: "italic" }}>Esta cotización es válida por {quote.validity}</div>
                </div>
            </div>
        </div>
    );
}
