"use client";

import { PaymentFrequency } from "@prisma/client";

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
        }).format(value);
    };

    const formatDate = (date: string | Date) => {
        return new Date(date).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            BORRADOR: "Borrador",
            ACTIVA: "Activa",
            RECHAZADA: "Rechazada",
            APROBADA: "Aprobada",
        };
        return labels[status] || status;
    };

    return (
        <div 
            id="quote-pdf-content" 
            style={{
                width: '210mm',
                minHeight: '297mm',
                padding: '20mm',
                backgroundColor: '#ffffff',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
                color: '#000000',
                position: 'absolute',
                left: '-9999px',
                top: '0',
                fontSize: '9pt',
                lineHeight: '1.4',
            }}
        >
            {/* Header - Centered Design */}
            <div style={{ textAlign: 'center', marginBottom: '28px', paddingBottom: '18px', borderBottom: '1px solid #d1d5db' }}>
                {/* Logo Section */}
                {workspace?.logoUrl ? (
                    <div style={{ marginBottom: '12px' }}>
                        <img 
                            src={workspace.logoUrl} 
                            alt="Logo" 
                            style={{ 
                                maxHeight: '50px', 
                                maxWidth: '180px', 
                                objectFit: 'contain',
                                margin: '0 auto',
                                display: 'block'
                            }}
                        />
                    </div>
                ) : null}
                
                {/* Company Name */}
                {workspace?.legalName && (
                    <h1 style={{ 
                        fontSize: '11pt', 
                        fontWeight: '600', 
                        color: '#111827', 
                        margin: workspace?.logoUrl ? '8px 0 6px 0' : '0 0 6px 0', 
                        letterSpacing: '0.5px', 
                        textTransform: 'uppercase' 
                    }}>
                        {workspace.legalName}
                    </h1>
                )}
                
                {/* Company Details */}
                <div style={{ fontSize: '8pt', color: '#6b7280', lineHeight: '1.5' }}>
                    {workspace?.rnc && (
                        <div style={{ margin: '2px 0' }}>RNC: {workspace.rnc}</div>
                    )}
                    {workspace?.address && (
                        <div style={{ margin: '2px 0' }}>{workspace.address}</div>
                    )}
                    {workspace?.phone && (
                        <div style={{ margin: '2px 0' }}>Tel: {workspace.phone}</div>
                    )}
                </div>
            </div>

            {/* Quote Title */}
            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
                <h2 style={{ fontSize: '14pt', fontWeight: '300', color: '#111827', margin: '0 0 6px 0', letterSpacing: '3px', textTransform: 'uppercase' }}>
                    Cotización
                </h2>
                <div style={{ fontSize: '9pt', fontWeight: '500', color: '#6b7280', letterSpacing: '1.5px' }}>
                    No. {String(quote.number).padStart(3, "0")}
                </div>
            </div>

            {/* Client & Details - Clean Design */}
            <div style={{ marginBottom: '28px', padding: '14px 16px', backgroundColor: '#c9d9ef', border: '1px solid #d1d5db' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
                    <tbody>
                        <tr>
                            <td style={{ padding: '5px 8px', fontWeight: '600', color: '#374151', width: '18%', textTransform: 'uppercase', fontSize: '7.5pt', letterSpacing: '0.5px' }}>Cliente</td>
                            <td style={{ padding: '5px 8px', color: '#111827', fontWeight: '500' }}>{companyName}</td>
                            <td style={{ padding: '5px 8px', fontWeight: '600', color: '#374151', width: '15%', textTransform: 'uppercase', fontSize: '7.5pt', letterSpacing: '0.5px', textAlign: 'right' }}>Fecha</td>
                            <td style={{ padding: '5px 8px', color: '#111827', textAlign: 'right', width: '18%' }}>{formatDate(quote.date)}</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '5px 8px', fontWeight: '600', color: '#374151', textTransform: 'uppercase', fontSize: '7.5pt', letterSpacing: '0.5px' }}>Atención</td>
                            <td style={{ padding: '5px 8px', color: '#111827' }}>{contactName}</td>
                            <td style={{ padding: '5px 8px', fontWeight: '600', color: '#374151', textTransform: 'uppercase', fontSize: '7.5pt', letterSpacing: '0.5px', textAlign: 'right' }}>Validez</td>
                            <td style={{ padding: '5px 8px', color: '#111827', textAlign: 'right' }}>{quote.validity}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Proposal Description */}
            {quote.proposalDescription && (
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ 
                        fontSize: '9pt', 
                        fontWeight: '600', 
                        color: '#111827', 
                        margin: '0 0 10px 0',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        borderBottom: '1px solid #e5e7eb',
                        paddingBottom: '6px'
                    }}>
                        Descripción de la Propuesta
                    </h3>
                    <div style={{ 
                        padding: '12px 0', 
                        whiteSpace: 'pre-wrap',
                        fontSize: '8.5pt',
                        lineHeight: '1.6',
                        color: '#374151',
                        textAlign: 'justify'
                    }}>
                        {quote.proposalDescription}
                    </div>
                </div>
            )}

            {/* Products Table */}
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{ 
                    fontSize: '9pt', 
                    fontWeight: '600', 
                    color: '#111827', 
                    margin: '0 0 10px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    borderBottom: '1px solid #e5e7eb',
                    paddingBottom: '6px'
                }}>
                    Productos y Servicios
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #111827' }}>
                            <th style={{ 
                                padding: '8px 6px', 
                                textAlign: 'left', 
                                color: '#111827', 
                                fontWeight: '600',
                                fontSize: '7.5pt',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                Descripción
                            </th>
                            <th style={{ 
                                padding: '8px 6px', 
                                textAlign: 'center', 
                                color: '#111827', 
                                fontWeight: '600',
                                fontSize: '7.5pt',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                width: '60px'
                            }}>
                                Cant.
                            </th>
                            <th style={{ 
                                padding: '8px 6px', 
                                textAlign: 'right', 
                                color: '#111827', 
                                fontWeight: '600',
                                fontSize: '7.5pt',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                width: '80px'
                            }}>
                                P. Unit.
                            </th>
                            <th style={{ 
                                padding: '8px 6px', 
                                textAlign: 'center', 
                                color: '#111827', 
                                fontWeight: '600',
                                fontSize: '7.5pt',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                width: '75px'
                            }}>
                                Frec.
                            </th>
                            <th style={{ 
                                padding: '8px 6px', 
                                textAlign: 'right', 
                                color: '#111827', 
                                fontWeight: '600',
                                fontSize: '7.5pt',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                width: '80px'
                            }}>
                                Total
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr 
                                key={index} 
                                style={{ 
                                    borderBottom: '1px solid #e5e7eb'
                                }}
                            >
                                <td style={{ padding: '10px 6px', color: '#374151' }}>
                                    {item.name}
                                </td>
                                <td style={{ padding: '10px 6px', textAlign: 'center', color: '#6b7280' }}>
                                    {item.quantity}
                                </td>
                                <td style={{ padding: '10px 6px', textAlign: 'right', color: '#6b7280' }}>
                                    {formatCurrency(item.price, quote.currency)}
                                </td>
                                <td style={{ padding: '10px 6px', textAlign: 'center', fontSize: '7pt' }}>
                                    <span style={{
                                        padding: '3px 6px',
                                        backgroundColor: item.frequency === 'MENSUAL' ? '#dbeafe' : '#f3f4f6',
                                        color: item.frequency === 'MENSUAL' ? '#1e40af' : '#6b7280',
                                        borderRadius: '3px',
                                        fontWeight: '500',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.3px'
                                    }}>
                                        {item.frequency === 'MENSUAL' ? 'Mens.' : 'Único'}
                                    </span>
                                </td>
                                <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: '600', color: '#111827' }}>
                                    {formatCurrency(item.netPrice, quote.currency)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div style={{ 
                marginBottom: '24px',
                paddingTop: '8px',
                borderTop: '2px solid #111827'
            }}>
                <table style={{ width: '100%', fontSize: '8.5pt' }}>
                    <tbody>
                        {totals.oneTime > 0 && (
                            <tr>
                                <td style={{ padding: '8px 6px', textAlign: 'right', color: '#6b7280', fontSize: '8pt', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Total Pago Único:
                                </td>
                                <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '600', color: '#111827', fontSize: '10pt', width: '120px' }}>
                                    {formatCurrency(totals.oneTime, quote.currency)}
                                </td>
                            </tr>
                        )}
                        {totals.monthly > 0 && (
                            <tr>
                                <td style={{ padding: '8px 6px', textAlign: 'right', color: '#6b7280', fontSize: '8pt', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Total Mensual:
                                </td>
                                <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '600', color: '#2563eb', fontSize: '10pt', width: '120px' }}>
                                    {formatCurrency(totals.monthly, quote.currency)}
                                </td>
                            </tr>
                        )}
                        <tr style={{ borderTop: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '12px 6px', textAlign: 'right', color: '#111827', fontSize: '9pt', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {totals.monthly > 0 ? 'Total General:' : 'Total:'}
                            </td>
                            <td style={{ padding: '12px 6px', textAlign: 'right', fontWeight: '700', color: '#111827', fontSize: '12pt', width: '120px' }}>
                                {formatCurrency(totals.oneTime + totals.monthly, quote.currency)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Terms Grid */}
            {(quote.paymentConditions || quote.deliveryTime) && (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '16px', 
                    marginBottom: '24px',
                    padding: '12px',
                    backgroundColor: '#c9d9ef',
                    border: '1px solid #d1d5db'
                }}>
                    {quote.paymentConditions && (
                        <div>
                            <h4 style={{ fontSize: '7.5pt', fontWeight: '600', color: '#111827', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Condiciones de Pago
                            </h4>
                            <p style={{ fontSize: '8pt', color: '#374151', lineHeight: '1.5', margin: 0 }}>
                                {quote.paymentConditions}
                            </p>
                        </div>
                    )}
                    {quote.deliveryTime && (
                        <div>
                            <h4 style={{ fontSize: '7.5pt', fontWeight: '600', color: '#111827', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Tiempo de Entrega
                            </h4>
                            <p style={{ fontSize: '8pt', color: '#374151', lineHeight: '1.5', margin: 0 }}>
                                {quote.deliveryTime}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Footer */}
            <div style={{ 
                borderTop: '1px solid #e5e7eb', 
                paddingTop: '16px',
                marginTop: 'auto',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '7pt', color: '#9ca3af', lineHeight: '1.6' }}>
                    <div style={{ marginBottom: '4px' }}>
                        <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '500' }}>Impuestos:</span> {quote.taxType === 'INCLUIDOS' ? 'Incluidos' : 'No incluidos'}
                        {' • '}
                        <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '500' }}>Moneda:</span> {quote.currency === 'USD' ? 'USD' : 'DOP'}
                    </div>
                    <div style={{ fontStyle: 'italic', color: '#6b7280' }}>
                        Esta cotización es válida por {quote.validity}
                    </div>
                </div>
            </div>
        </div>
    );
}

