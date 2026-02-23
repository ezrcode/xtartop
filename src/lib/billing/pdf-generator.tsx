/**
 * Generador de PDF para Proformas/Cotizaciones
 * Replica el diseño exacto de las proformas de ADMCloud (IronPdf)
 * usando @react-pdf/renderer
 */

import React from "react";
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Image,
} from "@react-pdf/renderer";

const TEAL = "#C9D9DE";
const BORDER = "#DDDDDD";
const BLACK = "#000000";

const styles = StyleSheet.create({
    page: {
        paddingTop: 30,
        paddingBottom: 30,
        paddingHorizontal: 36,
        fontSize: 9,
        fontFamily: "Helvetica",
        color: BLACK,
    },

    // ── Header ──────────────────────────────────────────────
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 6,
    },
    logo: {
        width: 160,
        maxHeight: 55,
    },
    companyInfo: {
        textAlign: "right",
        fontSize: 8,
        lineHeight: 1.5,
    },
    companyName: {
        fontSize: 9,
        fontFamily: "Helvetica-Bold",
        marginBottom: 2,
    },

    // ── Divider (barra de color teal llena) ──────────────────
    divider: {
        height: 12,
        backgroundColor: TEAL,
        marginVertical: 10,
    },

    // ── Info section (proforma + dates) ─────────────────────
    infoSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    infoColumn: {
        width: "55%",
    },
    infoColumnRight: {
        width: "42%",
        alignItems: "flex-end",
    },
    infoRow: {
        flexDirection: "row",
        marginBottom: 2,
        fontSize: 8,
    },
    infoLabel: {
        fontFamily: "Helvetica-Bold",
        width: 110,
        fontSize: 8,
    },
    infoValue: {
        flex: 1,
        fontSize: 8,
    },
    infoRowRight: {
        flexDirection: "row",
        marginBottom: 2,
        fontSize: 8,
    },
    infoLabelRight: {
        fontFamily: "Helvetica-Bold",
        fontSize: 8,
        marginRight: 6,
    },
    infoValueRight: {
        fontSize: 8,
    },

    // ── Table ────────────────────────────────────────────────
    table: {
        marginTop: 4,
        marginBottom: 6,
    },
    tableHeader: {
        flexDirection: "row",
        borderWidth: 1,
        borderColor: BORDER,
        paddingVertical: 7,
        paddingHorizontal: 6,
        backgroundColor: "#FFFFFF",
    },
    tableHeaderCell: {
        fontFamily: "Helvetica-Bold",
        fontSize: 8,
    },
    tableRow: {
        flexDirection: "row",
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: BORDER,
        paddingVertical: 8,
        paddingHorizontal: 6,
    },
    tableCell: {
        fontSize: 8,
    },
    colConcept: { width: "33.3%" },
    colQty: { width: "13.9%", textAlign: "right" },
    colPrice: { width: "28.1%", textAlign: "right" },
    colTotal: { width: "24.7%", textAlign: "right" },

    // ── Totals ───────────────────────────────────────────────
    totalsSection: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 8,
    },
    totalsTable: {
        width: 240,
    },
    totalsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 2,
        fontFamily: "Helvetica-Bold",
        fontSize: 8,
    },
    totalsLabel: {
        textAlign: "right",
        paddingRight: 12,
    },
    totalsValue: {
        textAlign: "right",
        width: 80,
    },
    totalsFinalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 3,
        paddingTop: 3,
        borderTopWidth: 1,
        borderTopColor: BORDER,
        fontFamily: "Helvetica-Bold",
        fontSize: 9,
    },

    // ── Sections (Observaciones, Bank Info) ──────────────────
    sectionTitle: {
        fontFamily: "Helvetica-Bold",
        fontSize: 9,
        marginBottom: 6,
    },
    sectionBody: {
        fontSize: 8,
        lineHeight: 1.6,
    },
    sectionGap: {
        marginTop: 14,
    },
    bankGroup: {
        marginTop: 6,
    },
    bankName: {
        fontFamily: "Helvetica-Bold",
        fontSize: 8,
    },
    bankAccount: {
        fontSize: 8,
        lineHeight: 1.5,
    },
    closingNote: {
        marginTop: 8,
        fontSize: 8,
    },
});

// ── Interfaces ──────────────────────────────────────────────

export interface ProformaData {
    documentNumber: string;
    documentDate: Date;
    expirationDate: Date;
    currency: "USD" | "DOP";
    exchangeRate?: string;

    providerName: string;
    providerLogo?: string;
    providerAddress: string;
    providerPhone: string;
    providerRNC: string;

    clientName: string;
    clientRNC: string;
    clientAddress: string;
    clientContact: string;

    items: ProformaItem[];

    subtotal: number;
    discount: number;
    taxAmount: number;
    total: number;

    notes?: string;

    bankInfo?: {
        beneficiary: string;
        rnc: string;
        banks: {
            name: string;
            accounts: {
                currency: string;
                number: string;
                type: string;
            }[];
        }[];
    };
}

export interface ProformaItem {
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

// ── Helpers ─────────────────────────────────────────────────

function formatDate(date: Date): string {
    const months = [
        "ene.", "feb.", "mar.", "abr.", "may.", "jun.",
        "jul.", "ago.", "sep.", "oct.", "nov.", "dic.",
    ];
    const day = date.getDate().toString().padStart(2, "0");
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function formatMoney(amount: number): string {
    return amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export function addBusinessDays(date: Date, days: number): Date {
    const result = new Date(date);
    let added = 0;
    while (added < days) {
        result.setDate(result.getDate() + 1);
        const dayOfWeek = result.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            added++;
        }
    }
    return result;
}

// ── Shared content (single source of truth) ─────────────────

function ProformaContent({ data }: { data: ProformaData }) {
    const hasDiscount = data.discount > 0;
    const netAmount = data.subtotal - data.discount;

    return (
        <Page size="A4" style={styles.page}>
            {/* ─── Header ─── */}
            <View style={styles.header}>
                <View>
                    {data.providerLogo ? (
                        <Image src={data.providerLogo} style={styles.logo} />
                    ) : (
                        <Text style={styles.companyName}>{data.providerName}</Text>
                    )}
                </View>
                <View style={styles.companyInfo}>
                    <Text style={styles.companyName}>{data.providerName}</Text>
                    {data.providerAddress ? <Text>{data.providerAddress}</Text> : null}
                    <Text>República Dominicana</Text>
                    {data.providerPhone ? <Text>{data.providerPhone}</Text> : null}
                </View>
            </View>

            {/* ─── Divider 1 ─── */}
            <View style={styles.divider} />

            {/* ─── Info Section ─── */}
            <View style={styles.infoSection}>
                <View style={styles.infoColumn}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Proforma Nro.:</Text>
                        <Text style={styles.infoValue}>{data.documentNumber}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Cliente:</Text>
                        <Text style={styles.infoValue}>{data.clientName}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>RNC:</Text>
                        <Text style={styles.infoValue}>{data.clientRNC}</Text>
                    </View>
                    {data.clientAddress ? (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Dirección:</Text>
                            <Text style={styles.infoValue}>{data.clientAddress}</Text>
                        </View>
                    ) : null}
                    {data.clientContact ? (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Contacto:</Text>
                            <Text style={styles.infoValue}>{data.clientContact}</Text>
                        </View>
                    ) : null}
                </View>
                <View style={styles.infoColumnRight}>
                    <View style={styles.infoRowRight}>
                        <Text style={styles.infoLabelRight}>Fecha de emisión:</Text>
                        <Text style={styles.infoValueRight}>{formatDate(data.documentDate)}</Text>
                    </View>
                    <View style={styles.infoRowRight}>
                        <Text style={styles.infoLabelRight}>Fecha de vencimiento:</Text>
                        <Text style={styles.infoValueRight}>{formatDate(data.expirationDate)}</Text>
                    </View>
                </View>
            </View>

            {/* ─── Divider 2 ─── */}
            <View style={styles.divider} />

            {/* ─── Items Table ─── */}
            <View style={styles.table}>
                <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, styles.colConcept]}>Concepto</Text>
                    <Text style={[styles.tableHeaderCell, styles.colQty]}>Cantidad</Text>
                    <Text style={[styles.tableHeaderCell, styles.colPrice]}>
                        Precio unitario ({data.currency})
                    </Text>
                    <Text style={[styles.tableHeaderCell, styles.colTotal]}>
                        Precio total ({data.currency})
                    </Text>
                </View>

                {data.items.map((item, index) => (
                    <View key={index} style={styles.tableRow}>
                        <Text style={[styles.tableCell, styles.colConcept]}>{item.name}</Text>
                        <Text style={[styles.tableCell, styles.colQty]}>
                            {formatMoney(item.quantity)}
                        </Text>
                        <Text style={[styles.tableCell, styles.colPrice]}>
                            {formatMoney(item.unitPrice)}
                        </Text>
                        <Text style={[styles.tableCell, styles.colTotal]}>
                            {formatMoney(item.total)}
                        </Text>
                    </View>
                ))}
            </View>

            {/* ─── Totals ─── */}
            <View style={styles.totalsSection}>
                <View style={styles.totalsTable}>
                    <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>Subtotal:</Text>
                        <Text style={styles.totalsValue}>{formatMoney(data.subtotal)}</Text>
                    </View>
                    {hasDiscount && (
                        <>
                            <View style={styles.totalsRow}>
                                <Text style={styles.totalsLabel}>Descuento:</Text>
                                <Text style={styles.totalsValue}>
                                    {formatMoney(data.discount)}
                                </Text>
                            </View>
                            <View style={styles.totalsRow}>
                                <Text style={styles.totalsLabel}>Neto:</Text>
                                <Text style={styles.totalsValue}>
                                    {formatMoney(netAmount)}
                                </Text>
                            </View>
                        </>
                    )}
                    <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>Impuesto:</Text>
                        <Text style={styles.totalsValue}>{formatMoney(data.taxAmount)}</Text>
                    </View>
                    <View style={styles.totalsFinalRow}>
                        <Text style={styles.totalsLabel}>Total {data.currency}:</Text>
                        <Text style={styles.totalsValue}>{formatMoney(data.total)}</Text>
                    </View>
                    {data.exchangeRate && (
                        <View style={styles.totalsRow}>
                            <Text style={styles.totalsLabel}>Tasa:</Text>
                            <Text style={styles.totalsValue}>{data.exchangeRate}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* ─── Divider 3 ─── */}
            <View style={styles.divider} />

            {/* ─── Observaciones ─── */}
            {data.notes ? (
                <View style={styles.sectionGap}>
                    <Text style={styles.sectionTitle}>Observaciones</Text>
                    <Text style={styles.sectionBody}>{data.notes}</Text>
                </View>
            ) : null}

            {/* ─── Bank Info ─── */}
            {data.bankInfo && (
                <View style={styles.sectionGap}>
                    <Text style={styles.sectionTitle}>
                        Favor realizar el pago a nombre de:
                    </Text>
                    <Text style={styles.sectionBody}>
                        {data.bankInfo.beneficiary} | {data.bankInfo.rnc}
                    </Text>

                    {data.bankInfo.banks.map((bank, bankIndex) => (
                        <View key={bankIndex} style={styles.bankGroup}>
                            <Text style={styles.bankName}>{bank.name}</Text>
                            {bank.accounts.map((account, accIndex) => (
                                <Text key={accIndex} style={styles.bankAccount}>
                                    {account.currency}: {account.number} | {account.type}
                                </Text>
                            ))}
                        </View>
                    ))}

                    <Text style={styles.closingNote}>
                        Al validar el pago se enviará factura con NCF de forma inmediata
                    </Text>
                </View>
            )}
        </Page>
    );
}

// ── Exported components ─────────────────────────────────────

export function ProformaPDF({ data }: { data: ProformaData }) {
    return (
        <Document>
            <ProformaContent data={data} />
        </Document>
    );
}

export function createProformaPDF(data: ProformaData): React.ReactElement {
    return (
        <Document>
            <ProformaContent data={data} />
        </Document>
    );
}

// ── Default bank info ───────────────────────────────────────

export const DEFAULT_BANK_INFO = {
    beneficiary: "NEARBY PROPTECH SOLUTIONS SAS",
    rnc: "1-32-53017-9",
    banks: [
        {
            name: "BHD LEON",
            accounts: [
                { currency: "DÓLARES", number: "38226000021", type: "AHORROS" },
                { currency: "PESOS", number: "38226000012", type: "AHORROS" },
            ],
        },
        {
            name: "BANRESERVAS",
            accounts: [
                { currency: "DÓLARES", number: "9604603792", type: "AHORROS" },
                { currency: "PESOS", number: "9604603841", type: "AHORROS" },
            ],
        },
    ],
};
