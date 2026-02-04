/**
 * Generador de PDF para Proformas/Cotizaciones
 * Replica el template de ADMCloud usando @react-pdf/renderer
 */

import React from "react";
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Image,
    Font,
} from "@react-pdf/renderer";

// Register fonts (optional, but improves appearance)
Font.register({
    family: "Helvetica",
    fonts: [
        { src: "https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8LbS2YAu48YLAPZe5QgOZE4d3N8.woff2" },
    ],
});

// Define styles
const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 10,
        fontFamily: "Helvetica",
        color: "#333",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    logo: {
        width: 150,
        maxHeight: 60,
        objectFit: "contain",
    },
    companyInfo: {
        textAlign: "right",
        fontSize: 9,
    },
    companyName: {
        fontSize: 11,
        fontWeight: "bold",
        marginBottom: 4,
    },
    divider: {
        borderBottomWidth: 3,
        borderBottomColor: "#c9d9de",
        marginVertical: 15,
    },
    infoSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 15,
    },
    infoColumn: {
        width: "55%",
    },
    infoColumnRight: {
        width: "40%",
        textAlign: "right",
    },
    infoRow: {
        flexDirection: "row",
        marginBottom: 3,
    },
    infoLabel: {
        fontWeight: "bold",
        width: 100,
    },
    infoValue: {
        flex: 1,
    },
    table: {
        marginTop: 10,
        marginBottom: 15,
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#f5f5f5",
        borderWidth: 1,
        borderColor: "#ddd",
        paddingVertical: 8,
        paddingHorizontal: 5,
    },
    tableHeaderCell: {
        fontWeight: "bold",
        fontSize: 9,
    },
    tableRow: {
        flexDirection: "row",
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: "#ddd",
        paddingVertical: 6,
        paddingHorizontal: 5,
    },
    tableCell: {
        fontSize: 9,
    },
    colConcept: { width: "50%" },
    colQty: { width: "15%", textAlign: "right" },
    colPrice: { width: "17.5%", textAlign: "right" },
    colTotal: { width: "17.5%", textAlign: "right" },
    totalsSection: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 10,
    },
    totalsLabels: {
        width: 120,
        textAlign: "right",
        paddingRight: 10,
    },
    totalsValues: {
        width: 100,
        textAlign: "right",
    },
    totalsRow: {
        marginBottom: 3,
    },
    totalsFinal: {
        fontWeight: "bold",
        fontSize: 11,
        marginTop: 5,
        paddingTop: 5,
        borderTopWidth: 1,
        borderTopColor: "#ddd",
    },
    panel: {
        marginTop: 15,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 0,
    },
    panelHeader: {
        backgroundColor: "#f5f5f5",
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
    },
    panelHeaderText: {
        fontWeight: "bold",
        fontSize: 10,
    },
    panelBody: {
        padding: 10,
    },
    panelText: {
        fontSize: 9,
        lineHeight: 1.5,
    },
    bankInfo: {
        marginTop: 10,
    },
    bankRow: {
        marginBottom: 2,
    },
    footer: {
        position: "absolute",
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: "center",
        fontSize: 8,
        color: "#666",
    },
});

// Interfaces
export interface ProformaData {
    // Document info
    documentNumber: string;
    documentDate: Date;
    expirationDate: Date;
    currency: "USD" | "DOP";
    exchangeRate?: string;

    // Company (provider) info
    providerName: string;
    providerLogo?: string;
    providerAddress: string;
    providerPhone: string;
    providerRNC: string;

    // Client info
    clientName: string;
    clientRNC: string;
    clientAddress: string;
    clientContact: string;

    // Items
    items: ProformaItem[];

    // Totals
    subtotal: number;
    discount: number;
    taxAmount: number;
    total: number;

    // Additional
    notes?: string;
    
    // Bank info
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

// Helper functions
function formatDate(date: Date): string {
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
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

// Add business days (skipping weekends)
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

// PDF Document Component
export function ProformaPDF({ data }: { data: ProformaData }) {
    const hasDiscount = data.discount > 0;
    const netAmount = data.subtotal - data.discount;

    return (
        <Document>
            <Page size="LETTER" style={styles.page}>
                {/* Header */}
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
                        <Text>{data.providerAddress}</Text>
                        <Text>República Dominicana</Text>
                        <Text>{data.providerPhone}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Document & Client Info */}
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
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Dirección:</Text>
                            <Text style={styles.infoValue}>{data.clientAddress}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Contacto:</Text>
                            <Text style={styles.infoValue}>{data.clientContact}</Text>
                        </View>
                    </View>
                    <View style={styles.infoColumnRight}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Fecha de emisión:</Text>
                            <Text>{formatDate(data.documentDate)}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Fecha de vencimiento:</Text>
                            <Text>{formatDate(data.expirationDate)}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Items Table */}
                <View style={styles.table}>
                    {/* Header */}
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, styles.colConcept]}>Concepto</Text>
                        <Text style={[styles.tableHeaderCell, styles.colQty]}>Cantidad</Text>
                        <Text style={[styles.tableHeaderCell, styles.colPrice]}>Precio unitario ({data.currency})</Text>
                        <Text style={[styles.tableHeaderCell, styles.colTotal]}>Precio total ({data.currency})</Text>
                    </View>
                    
                    {/* Rows */}
                    {data.items.map((item, index) => (
                        <View key={index} style={styles.tableRow}>
                            <Text style={[styles.tableCell, styles.colConcept]}>{item.name}</Text>
                            <Text style={[styles.tableCell, styles.colQty]}>{formatMoney(item.quantity)}</Text>
                            <Text style={[styles.tableCell, styles.colPrice]}>{formatMoney(item.unitPrice)}</Text>
                            <Text style={[styles.tableCell, styles.colTotal]}>{formatMoney(item.total)}</Text>
                        </View>
                    ))}
                </View>

                {/* Totals */}
                <View style={styles.totalsSection}>
                    <View style={styles.totalsLabels}>
                        <Text style={styles.totalsRow}>Subtotal:</Text>
                        {hasDiscount && (
                            <>
                                <Text style={styles.totalsRow}>Descuento:</Text>
                                <Text style={styles.totalsRow}>Neto:</Text>
                            </>
                        )}
                        <Text style={styles.totalsRow}>Impuesto:</Text>
                        <Text style={[styles.totalsRow, styles.totalsFinal]}>Total {data.currency}:</Text>
                        {data.exchangeRate && (
                            <Text style={styles.totalsRow}>Tasa:</Text>
                        )}
                    </View>
                    <View style={styles.totalsValues}>
                        <Text style={styles.totalsRow}>{formatMoney(data.subtotal)}</Text>
                        {hasDiscount && (
                            <>
                                <Text style={styles.totalsRow}>{formatMoney(data.discount)}</Text>
                                <Text style={styles.totalsRow}>{formatMoney(netAmount)}</Text>
                            </>
                        )}
                        <Text style={styles.totalsRow}>{formatMoney(data.taxAmount)}</Text>
                        <Text style={[styles.totalsRow, styles.totalsFinal]}>{formatMoney(data.total)}</Text>
                        {data.exchangeRate && (
                            <Text style={styles.totalsRow}>{data.exchangeRate}</Text>
                        )}
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Notes Panel */}
                {data.notes && (
                    <View style={styles.panel}>
                        <View style={styles.panelHeader}>
                            <Text style={styles.panelHeaderText}>Observaciones</Text>
                        </View>
                        <View style={styles.panelBody}>
                            <Text style={styles.panelText}>{data.notes}</Text>
                        </View>
                    </View>
                )}

                {/* Bank Info Panel */}
                {data.bankInfo && (
                    <View style={styles.panel}>
                        <View style={styles.panelHeader}>
                            <Text style={styles.panelHeaderText}>Favor realizar el pago a nombre de:</Text>
                        </View>
                        <View style={styles.panelBody}>
                            <Text style={styles.panelText}>{data.bankInfo.beneficiary} | {data.bankInfo.rnc}</Text>
                            
                            {data.bankInfo.banks.map((bank, bankIndex) => (
                                <View key={bankIndex} style={styles.bankInfo}>
                                    <Text style={[styles.panelText, { fontWeight: "bold" }]}>{bank.name}</Text>
                                    {bank.accounts.map((account, accIndex) => (
                                        <Text key={accIndex} style={styles.panelText}>
                                            {account.currency}: {account.number} | {account.type}
                                        </Text>
                                    ))}
                                </View>
                            ))}
                            
                            <Text style={[styles.panelText, { marginTop: 10 }]}>
                                Al validar el pago se enviará factura con NCF de forma inmediata
                            </Text>
                        </View>
                    </View>
                )}
            </Page>
        </Document>
    );
}

// Factory function for creating the PDF document (for renderToBuffer)
// Returns a ReactElement that can be passed to renderToBuffer
export function createProformaPDF(data: ProformaData): React.ReactElement {
    const hasDiscount = data.discount > 0;
    const netAmount = data.subtotal - data.discount;

    return (
        <Document>
            <Page size="LETTER" style={styles.page}>
                {/* Header */}
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
                        <Text>{data.providerAddress}</Text>
                        <Text>República Dominicana</Text>
                        <Text>{data.providerPhone}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Document & Client Info */}
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
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Dirección:</Text>
                            <Text style={styles.infoValue}>{data.clientAddress}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Contacto:</Text>
                            <Text style={styles.infoValue}>{data.clientContact}</Text>
                        </View>
                    </View>
                    <View style={styles.infoColumnRight}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Fecha de emisión:</Text>
                            <Text>{formatDate(data.documentDate)}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Fecha de vencimiento:</Text>
                            <Text>{formatDate(data.expirationDate)}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Items Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, styles.colConcept]}>Concepto</Text>
                        <Text style={[styles.tableHeaderCell, styles.colQty]}>Cantidad</Text>
                        <Text style={[styles.tableHeaderCell, styles.colPrice]}>Precio unitario ({data.currency})</Text>
                        <Text style={[styles.tableHeaderCell, styles.colTotal]}>Precio total ({data.currency})</Text>
                    </View>
                    
                    {data.items.map((item, index) => (
                        <View key={index} style={styles.tableRow}>
                            <Text style={[styles.tableCell, styles.colConcept]}>{item.name}</Text>
                            <Text style={[styles.tableCell, styles.colQty]}>{formatMoney(item.quantity)}</Text>
                            <Text style={[styles.tableCell, styles.colPrice]}>{formatMoney(item.unitPrice)}</Text>
                            <Text style={[styles.tableCell, styles.colTotal]}>{formatMoney(item.total)}</Text>
                        </View>
                    ))}
                </View>

                {/* Totals */}
                <View style={styles.totalsSection}>
                    <View style={styles.totalsLabels}>
                        <Text style={styles.totalsRow}>Subtotal:</Text>
                        {hasDiscount && (
                            <>
                                <Text style={styles.totalsRow}>Descuento:</Text>
                                <Text style={styles.totalsRow}>Neto:</Text>
                            </>
                        )}
                        <Text style={styles.totalsRow}>Impuesto:</Text>
                        <Text style={[styles.totalsRow, styles.totalsFinal]}>Total {data.currency}:</Text>
                        {data.exchangeRate && (
                            <Text style={styles.totalsRow}>Tasa:</Text>
                        )}
                    </View>
                    <View style={styles.totalsValues}>
                        <Text style={styles.totalsRow}>{formatMoney(data.subtotal)}</Text>
                        {hasDiscount && (
                            <>
                                <Text style={styles.totalsRow}>{formatMoney(data.discount)}</Text>
                                <Text style={styles.totalsRow}>{formatMoney(netAmount)}</Text>
                            </>
                        )}
                        <Text style={styles.totalsRow}>{formatMoney(data.taxAmount)}</Text>
                        <Text style={[styles.totalsRow, styles.totalsFinal]}>{formatMoney(data.total)}</Text>
                        {data.exchangeRate && (
                            <Text style={styles.totalsRow}>{data.exchangeRate}</Text>
                        )}
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Notes Panel */}
                {data.notes && (
                    <View style={styles.panel}>
                        <View style={styles.panelHeader}>
                            <Text style={styles.panelHeaderText}>Observaciones</Text>
                        </View>
                        <View style={styles.panelBody}>
                            <Text style={styles.panelText}>{data.notes}</Text>
                        </View>
                    </View>
                )}

                {/* Bank Info Panel */}
                {data.bankInfo && (
                    <View style={styles.panel}>
                        <View style={styles.panelHeader}>
                            <Text style={styles.panelHeaderText}>Favor realizar el pago a nombre de:</Text>
                        </View>
                        <View style={styles.panelBody}>
                            <Text style={styles.panelText}>{data.bankInfo.beneficiary} | {data.bankInfo.rnc}</Text>
                            
                            {data.bankInfo.banks.map((bank, bankIndex) => (
                                <View key={bankIndex} style={styles.bankInfo}>
                                    <Text style={[styles.panelText, { fontWeight: "bold" }]}>{bank.name}</Text>
                                    {bank.accounts.map((account, accIndex) => (
                                        <Text key={accIndex} style={styles.panelText}>
                                            {account.currency}: {account.number} | {account.type}
                                        </Text>
                                    ))}
                                </View>
                            ))}
                            
                            <Text style={[styles.panelText, { marginTop: 10 }]}>
                                Al validar el pago se enviará factura con NCF de forma inmediata
                            </Text>
                        </View>
                    </View>
                )}
            </Page>
        </Document>
    );
}

// Default bank info for NEARBY
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
