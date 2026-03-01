/**
 * Cron Job para facturación automática
 * 
 * Este endpoint se ejecuta diariamente para:
 * 1. Buscar empresas con billingDay = día actual
 * 2. Crear proforma en ADMCloud
 * 3. Generar PDF
 * 4. Enviar email a contactos marcados como receivesInvoices
 * 
 * Configurar en vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/billing",
 *     "schedule": "0 8 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdmCloudClient, type AdmCloudPaymentTerm, type AdmCloudQuoteRequest } from "@/lib/admcloud/client";
import { renderToBuffer } from "@react-pdf/renderer";
import { createProformaPDF, addBusinessDays, DEFAULT_BANK_INFO, type ProformaData } from "@/lib/billing/pdf-generator";
import { sendEmail } from "@/lib/email/sender";
import { put } from "@vercel/blob";

function sanitizeForFileName(value: string): string {
    return value
        .replace(/[\\/:*?"<>|]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getBillingPeriodLabel(month: number, year: number): string {
    return `${String(month).padStart(2, "0")}${year}`;
}

function getBillingPeriodText(month: number, year: number): string {
    const months = [
        "Enero",
        "Febrero",
        "Marzo",
        "Abril",
        "Mayo",
        "Junio",
        "Julio",
        "Agosto",
        "Septiembre",
        "Octubre",
        "Noviembre",
        "Diciembre",
    ];
    return `${months[month - 1] || String(month)} ${year}`;
}

function buildPdfBaseName(proformaNumber: string, companyShortName: string, month: number, year: number): string {
    return sanitizeForFileName(`${proformaNumber} ${companyShortName} ${getBillingPeriodLabel(month, year)}`);
}

function normalizeText(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function resolvePaymentTermConfig(term: Pick<AdmCloudPaymentTerm, "Name" | "Description" | "Days"> | null): {
    days: number;
    businessDays: boolean;
} | null {
    if (!term) return null;

    const fromDaysField = typeof term.Days === "number" && Number.isFinite(term.Days) && term.Days > 0
        ? Math.round(term.Days)
        : null;

    const joinedText = normalizeText(`${term.Name || ""} ${term.Description || ""}`);
    const fromText = joinedText.match(/(\d{1,3})\s*(dia|dias|day|days)\b/);
    const parsedDays = fromText ? Number(fromText[1]) : null;

    const days = fromDaysField || parsedDays;
    if (!days || days <= 0) return null;

    const businessDays = /(habil|habiles|laboral|laborales|business)/.test(joinedText);
    return { days, businessDays };
}

function addCalendarDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function normalizeEmailBodyToHtml(template: string): string {
    const trimmed = template.trim();
    if (!trimmed) return "";

    const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(trimmed);
    if (hasHtmlTags) {
        return template;
    }

    return escapeHtml(trimmed)
        .split(/\n{2,}/)
        .map((block) => `<p>${block.replace(/\n/g, "<br/>")}</p>`)
        .join("");
}

function collectStringFieldsDeep(payload: unknown, keys: string[], depth = 0): string[] {
    if (depth > 3 || payload == null) return [];

    const values: string[] = [];

    if (typeof payload === "string") {
        const v = payload.trim();
        return v ? [v] : [];
    }

    if (Array.isArray(payload)) {
        for (const item of payload) {
            values.push(...collectStringFieldsDeep(item, keys, depth + 1));
        }
        return values;
    }

    if (typeof payload !== "object") return [];
    const data = payload as Record<string, unknown>;

    for (const key of keys) {
        const value = data[key];
        if (typeof value === "string" && value.trim()) {
            values.push(value.trim());
        }
    }

    for (const value of Object.values(data)) {
        if (value && (typeof value === "object" || Array.isArray(value))) {
            values.push(...collectStringFieldsDeep(value, keys, depth + 1));
        }
    }

    return values;
}

function isUuidLike(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isValidAdmCloudDocNumber(value: string): boolean {
    return /^PRF/i.test(value);
}

function extractAdmCloudDocNumber(payload: unknown): string | null {
    const rawCandidates = collectStringFieldsDeep(payload, [
        "DocID",
        "DocId",
        "docID",
        "docId",
        "TransactionNumber",
        "DocumentNumber",
        "DocumentNo",
        "Number",
    ]);

    const unique = [...new Set(rawCandidates.map((c) => c.trim()).filter(Boolean))];
    const withoutUuid = unique.filter((c) => !isUuidLike(c));

    const preferredPrf = withoutUuid.find((c) => isValidAdmCloudDocNumber(c));
    if (preferredPrf) return preferredPrf;

    return null;
}

function extractAdmCloudQuoteId(payload: unknown): string | null {
    const candidates = collectStringFieldsDeep(payload, [
        "ID",
        "Id",
        "id",
        "QuoteID",
        "QuoteId",
        "quoteId",
    ]);
    return candidates.length > 0 ? candidates[0] : null;
}

function extractAdmCloudObservation(payload: unknown): string | null {
    const candidates = collectStringFieldsDeep(payload, [
        "Notes",
        "Note",
        "Observaciones",
        "Observation",
        "Comments",
    ]);
    const first = candidates.map((value) => value.trim()).find(Boolean);
    return first || null;
}

// Verify cron secret for security
const CRON_SECRET = process.env.CRON_SECRET;
const BILLING_TIMEZONE = "America/Santo_Domingo";

function getDatePartsInTimeZone(date: Date, timeZone: string): { day: number; month: number; year: number } {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).formatToParts(date);

    const day = Number(parts.find((p) => p.type === "day")?.value ?? "0");
    const month = Number(parts.find((p) => p.type === "month")?.value ?? "0");
    const year = Number(parts.find((p) => p.type === "year")?.value ?? "0");

    return { day, month, year };
}

export async function GET(request: NextRequest) {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    const { day: currentDay, month: currentMonth, year: currentYear } = getDatePartsInTimeZone(
        today,
        BILLING_TIMEZONE
    );

    const results: {
        processed: number;
        sent: number;
        failed: number;
        details: Array<{
            companyId: string;
            companyName: string;
            status: "sent" | "failed" | "no_recipients";
            error?: string;
        }>;
    } = {
        processed: 0,
        sent: 0,
        failed: 0,
        details: [],
    };

    try {
        // Get all workspaces with billing enabled
        const workspaces = await prisma.workspace.findMany({
            where: {
                billingEnabled: true,
                billingFromUserId: { not: null },
            },
            include: {
                companies: {
                    where: {
                        status: "CLIENTE",
                        subscriptionBilling: {
                            billingDay: currentDay,
                            autoBillingEnabled: true, // Solo procesar empresas con cobro automático habilitado
                        },
                    },
                    include: {
                        subscriptionBilling: {
                            include: {
                                items: true,
                            },
                        },
                        contacts: {
                            where: {
                                receivesInvoices: true,
                                email: { not: "" },
                            },
                            select: {
                                id: true,
                                fullName: true,
                                email: true,
                            },
                        },
                        projects: {
                            where: { status: "ACTIVE" },
                        },
                        clientUsers: {
                            where: { status: "ACTIVE" },
                        },
                    },
                },
            },
        });

        for (const workspace of workspaces) {
            // Skip if no companies due for billing
            if (workspace.companies.length === 0) continue;

            const latestExchangeRate = await prisma.exchangeRate.findFirst({
                where: { workspaceId: workspace.id },
                orderBy: [{ date: "desc" }, { createdAt: "desc" }],
            });

            // Get sender user
            const senderUser = await prisma.user.findUnique({
                where: { id: workspace.billingFromUserId! },
                select: {
                    emailFromAddress: true,
                    emailFromName: true,
                    emailPassword: true,
                    emailConfigured: true,
                },
            });

            if (!senderUser || !senderUser.emailConfigured) {
                console.error(`Workspace ${workspace.id}: Sender user not configured for email`);
                continue;
            }

            // Check if ADMCloud is configured
            const admCloudEnabled = workspace.admCloudEnabled && 
                workspace.admCloudAppId && 
                workspace.admCloudUsername && 
                workspace.admCloudPassword;

            let admCloudClient: ReturnType<typeof createAdmCloudClient> | null = null;
            let paymentTermConfig = resolvePaymentTermConfig(
                workspace.admCloudDefaultPaymentTermName
                    ? { Name: workspace.admCloudDefaultPaymentTermName, Description: undefined, Days: undefined }
                    : null
            );
            if (admCloudEnabled) {
                admCloudClient = createAdmCloudClient({
                    appId: workspace.admCloudAppId!,
                    username: workspace.admCloudUsername!,
                    password: workspace.admCloudPassword!,
                    company: workspace.admCloudCompany || "",
                    role: workspace.admCloudRole || "Administradores",
                });

                if (workspace.admCloudDefaultPaymentTermId) {
                    const paymentTermsResult = await admCloudClient.getPaymentTerms();
                    if (paymentTermsResult.success && paymentTermsResult.data) {
                        const selectedTerm = paymentTermsResult.data.find(
                            (term) => term.ID === workspace.admCloudDefaultPaymentTermId
                        );
                        const resolvedTerm = resolvePaymentTermConfig(selectedTerm || null);
                        if (resolvedTerm) {
                            paymentTermConfig = resolvedTerm;
                        }
                    }
                }
            }

            // Process each company
            for (const company of workspace.companies) {
                results.processed++;

                try {
                    // Check if already billed this month
                    const existingBilling = await prisma.billingHistory.findFirst({
                        where: {
                            companyId: company.id,
                            billingMonth: currentMonth,
                            billingYear: currentYear,
                            status: "SENT",
                        },
                    });

                    if (existingBilling) {
                        results.details.push({
                            companyId: company.id,
                            companyName: company.name,
                            status: "sent",
                            error: "Already billed this month",
                        });
                        continue;
                    }

                    // Check if there are recipients
                    if (company.contacts.length === 0) {
                        results.details.push({
                            companyId: company.id,
                            companyName: company.name,
                            status: "no_recipients",
                            error: "No contacts marked as receivesInvoices",
                        });
                        
                        // Log in billing history
                        await prisma.billingHistory.create({
                            data: {
                                companyId: company.id,
                                workspaceId: workspace.id,
                                billingMonth: currentMonth,
                                billingYear: currentYear,
                                status: "FAILED",
                                errorMessage: "No hay contactos configurados para recibir facturas",
                                recipients: "[]",
                                subtotal: 0,
                                taxAmount: 0,
                                totalAmount: 0,
                            },
                        });
                        
                        results.failed++;
                        continue;
                    }

                    // Calculate billing items
                    const billing = company.subscriptionBilling;
                    if (!billing || billing.items.length === 0) {
                        results.details.push({
                            companyId: company.id,
                            companyName: company.name,
                            status: "failed",
                            error: "No subscription items configured",
                        });
                        results.failed++;
                        continue;
                    }

                    // Calculate quantities for each item
                    const activeProjects = company.projects.length;
                    const activeUsers = company.clientUsers.length;

                    const calculatedItems = billing.items.map((item) => {
                        let quantity = item.manualQuantity || 0;
                        
                        if (item.countType === "ACTIVE_PROJECTS") {
                            quantity = activeProjects;
                        } else if (item.countType === "ACTIVE_USERS") {
                            quantity = activeUsers;
                        } else if (item.countType === "CALCULATED") {
                            const base = item.calculatedBase === "USERS" 
                                ? activeUsers 
                                : activeProjects;
                            const subtract = item.calculatedSubtract || 0;
                            quantity = Math.max(0, base - subtract);
                        }

                        return {
                            ...item,
                            calculatedQuantity: quantity,
                            subtotal: Number(item.price) * quantity,
                        };
                    });

                    const subtotal = calculatedItems.reduce((sum, item) => sum + item.subtotal, 0);
                    const taxAmount = 0; // Assuming tax included or configured elsewhere
                    const total = subtotal + taxAmount;

                    // Create quote in ADMCloud - REQUIRED for automatic billing
                    let admCloudDocId: string | null = null;
                    let proformaNumber = `PRO-${currentYear}${String(currentMonth).padStart(2, "0")}-${company.id.slice(-6)}`;
                    const billingPeriodText = getBillingPeriodText(currentMonth, currentYear);
                    let pdfNotes = billingPeriodText;

                    // Check if ADMCloud is properly configured for this company
                    if (!admCloudClient) {
                        const errorMsg = "ADMCloud no está configurado en el workspace";
                        console.error(`${company.name}: ${errorMsg}`);
                        
                        await prisma.billingHistory.create({
                            data: {
                                companyId: company.id,
                                workspaceId: workspace.id,
                                billingMonth: currentMonth,
                                billingYear: currentYear,
                                status: "FAILED",
                                errorMessage: errorMsg,
                                recipients: JSON.stringify(company.contacts.map(c => c.email)),
                                subtotal,
                                taxAmount,
                                totalAmount: total,
                            },
                        });
                        
                        results.failed++;
                        results.details.push({
                            companyId: company.id,
                            companyName: company.name,
                            status: "failed",
                            error: errorMsg,
                        });
                        continue;
                    }

                    if (!company.admCloudRelationshipId) {
                        const errorMsg = "La empresa no tiene RelationshipID de ADMCloud configurado";
                        console.error(`${company.name}: ${errorMsg}`);
                        
                        await prisma.billingHistory.create({
                            data: {
                                companyId: company.id,
                                workspaceId: workspace.id,
                                billingMonth: currentMonth,
                                billingYear: currentYear,
                                status: "FAILED",
                                errorMessage: errorMsg,
                                recipients: JSON.stringify(company.contacts.map(c => c.email)),
                                subtotal,
                                taxAmount,
                                totalAmount: total,
                            },
                        });
                        
                        results.failed++;
                        results.details.push({
                            companyId: company.id,
                            companyName: company.name,
                            status: "failed",
                            error: errorMsg,
                        });
                        continue;
                    }

                    // Create quote in ADMCloud
                    const quoteRequest: AdmCloudQuoteRequest = {
                        RelationshipID: company.admCloudRelationshipId,
                        DocDate: today.toISOString(),
                        CurrencyID: "USD",
                        Notes: billingPeriodText,
                        // Términos de pago y etapa de ventas predeterminados
                        ...(workspace.admCloudDefaultPaymentTermId && { PaymentTermID: workspace.admCloudDefaultPaymentTermId }),
                        ...(workspace.admCloudDefaultSalesStageId && { SalesStageID: workspace.admCloudDefaultSalesStageId }),
                        // Items con orden preservado
                        Items: calculatedItems.map((item, index) => ({
                            ItemID: item.admCloudItemId,
                            Quantity: item.calculatedQuantity,
                            Price: Number(item.price),
                            RowOrder: index + 1,
                        })),
                    };

                    const quoteResult = await admCloudClient.createQuote(quoteRequest);
                    
                    if (quoteResult.success && quoteResult.data) {
                        const directObservation = extractAdmCloudObservation(quoteResult.data);
                        if (directObservation) {
                            pdfNotes = directObservation;
                        }
                        admCloudDocId = extractAdmCloudQuoteId(quoteResult.data);
                        const directDocNumber = extractAdmCloudDocNumber(quoteResult.data);
                        if (directDocNumber) {
                            proformaNumber = directDocNumber;
                        } else if (admCloudDocId) {
                            // Fallback: some create responses may omit DocID, request quote details by ID.
                            const quoteDetail = await admCloudClient.getQuote(admCloudDocId);
                            if (quoteDetail.success && quoteDetail.data) {
                                const detailObservation = extractAdmCloudObservation(quoteDetail.data);
                                if (detailObservation) {
                                    pdfNotes = detailObservation;
                                }
                                const detailDocNumber = extractAdmCloudDocNumber(quoteDetail.data);
                                if (detailDocNumber) {
                                    proformaNumber = detailDocNumber;
                                } else {
                                    const errorMsg = "ADMCloud creó la cotización/proforma pero no devolvió un número de documento válido (PRF...)";
                                    console.error(`${company.name}: ${errorMsg}`);

                                    await prisma.billingHistory.create({
                                        data: {
                                            companyId: company.id,
                                            workspaceId: workspace.id,
                                            billingMonth: currentMonth,
                                            billingYear: currentYear,
                                            status: "FAILED",
                                            errorMessage: errorMsg,
                                            recipients: JSON.stringify(company.contacts.map(c => c.email)),
                                            subtotal,
                                            taxAmount,
                                            totalAmount: total,
                                        },
                                    });

                                    results.failed++;
                                    results.details.push({
                                        companyId: company.id,
                                        companyName: company.name,
                                        status: "failed",
                                        error: errorMsg,
                                    });
                                    continue;
                                }
                            } else {
                                const errorMsg = quoteDetail.error || "No fue posible recuperar un número de documento válido (PRF...) desde ADMCloud";
                                console.error(`${company.name}: ${errorMsg}`);

                                await prisma.billingHistory.create({
                                    data: {
                                        companyId: company.id,
                                        workspaceId: workspace.id,
                                        billingMonth: currentMonth,
                                        billingYear: currentYear,
                                        status: "FAILED",
                                        errorMessage: errorMsg,
                                        recipients: JSON.stringify(company.contacts.map(c => c.email)),
                                        subtotal,
                                        taxAmount,
                                        totalAmount: total,
                                    },
                                });

                                results.failed++;
                                results.details.push({
                                    companyId: company.id,
                                    companyName: company.name,
                                    status: "failed",
                                    error: errorMsg,
                                });
                                continue;
                            }
                        } else {
                            const errorMsg = "ADMCloud no devolvió un número de documento válido (PRF...) para la cotización/proforma";
                            console.error(`${company.name}: ${errorMsg}`);

                            await prisma.billingHistory.create({
                                data: {
                                    companyId: company.id,
                                    workspaceId: workspace.id,
                                    billingMonth: currentMonth,
                                    billingYear: currentYear,
                                    status: "FAILED",
                                    errorMessage: errorMsg,
                                    recipients: JSON.stringify(company.contacts.map(c => c.email)),
                                    subtotal,
                                    taxAmount,
                                    totalAmount: total,
                                },
                            });

                            results.failed++;
                            results.details.push({
                                companyId: company.id,
                                companyName: company.name,
                                status: "failed",
                                error: errorMsg,
                            });
                            continue;
                        }
                    } else {
                        // ADMCloud creation failed - this is a critical error for automatic billing
                        const errorMsg = `Error al crear cotización en ADMCloud: ${quoteResult.error || "Error desconocido"}`;
                        console.error(`${company.name}: ${errorMsg}`);
                        
                        await prisma.billingHistory.create({
                            data: {
                                companyId: company.id,
                                workspaceId: workspace.id,
                                billingMonth: currentMonth,
                                billingYear: currentYear,
                                status: "FAILED",
                                errorMessage: errorMsg,
                                recipients: JSON.stringify(company.contacts.map(c => c.email)),
                                subtotal,
                                taxAmount,
                                totalAmount: total,
                            },
                        });
                        
                        results.failed++;
                        results.details.push({
                            companyId: company.id,
                            companyName: company.name,
                            status: "failed",
                            error: errorMsg,
                        });
                        continue;
                    }

                    // Generate PDF
                    const expirationDate = paymentTermConfig
                        ? paymentTermConfig.businessDays
                            ? addBusinessDays(today, paymentTermConfig.days)
                            : addCalendarDays(today, paymentTermConfig.days)
                        : addBusinessDays(today, 30);

                    const proformaData: ProformaData = {
                        documentNumber: proformaNumber,
                        documentDate: today,
                        expirationDate,
                        currency: "USD",
                        
                        providerName: workspace.legalName || workspace.name,
                        providerLogo: workspace.logoUrl || undefined,
                        providerAddress: workspace.address || "",
                        providerPhone: workspace.phone || "",
                        providerRNC: workspace.rnc || "",
                        
                        clientName: company.legalName || company.name,
                        clientRNC: company.taxId || "",
                        clientAddress: company.fiscalAddress || "",
                        clientContact: company.contacts[0]?.fullName || "",
                        
                        items: calculatedItems.map((item) => ({
                            name: item.description,
                            quantity: item.calculatedQuantity,
                            unitPrice: Number(item.price),
                            total: item.subtotal,
                        })),
                        
                        subtotal,
                        discount: 0,
                        taxAmount,
                        total,
                        exchangeRate: latestExchangeRate ? Number(latestExchangeRate.rate).toFixed(4) : undefined,
                        
                        notes: pdfNotes,
                        bankInfo: DEFAULT_BANK_INFO,
                    };

                    // Render PDF to buffer
                    const pdfDocument = createProformaPDF(proformaData);
                    const pdfBuffer = await renderToBuffer(pdfDocument);

                    // Upload PDF to Vercel Blob
                    const pdfBaseName = buildPdfBaseName(proformaNumber, company.name, currentMonth, currentYear);
                    const pdfFileName = `proformas/${workspace.id}/${company.id}/${pdfBaseName}.pdf`;
                    const blob = await put(pdfFileName, pdfBuffer, {
                        access: "public",
                        contentType: "application/pdf",
                    });

                    // Prepare email
                    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
                        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                    
                    const emailSubject = (workspace.billingEmailSubject || "Proforma mensual - {{EMPRESA}} - {{MES}} {{AÑO}}")
                        .replace(/\{\{EMPRESA\}\}/g, company.name)
                        .replace(/\{\{MES\}\}/g, monthNames[currentMonth - 1])
                        .replace(/\{\{AÑO\}\}/g, String(currentYear))
                        .replace(/\{\{NUMERO_PROFORMA\}\}/g, proformaNumber);

                    const emailBody = (workspace.billingEmailBody || `
                        <p>Estimado(a) cliente,</p>
                        <p>Adjunto encontrará la proforma correspondiente a su suscripción mensual de servicios.</p>
                        <p><strong>Empresa:</strong> {{EMPRESA}}<br/>
                        <strong>Período:</strong> {{MES}} {{AÑO}}<br/>
                        <strong>Número de documento:</strong> {{NUMERO_PROFORMA}}<br/>
                        <strong>Total:</strong> {{TOTAL}}</p>
                        <p>Favor realizar el pago según las instrucciones indicadas en el documento adjunto.</p>
                        <p>Saludos cordiales,<br/>{{PROVEEDOR_NOMBRE}}</p>
                    `)
                        .replace(/\{\{EMPRESA\}\}/g, company.name)
                        .replace(/\{\{MES\}\}/g, monthNames[currentMonth - 1])
                        .replace(/\{\{AÑO\}\}/g, String(currentYear))
                        .replace(/\{\{NUMERO_PROFORMA\}\}/g, proformaNumber)
                        .replace(/\{\{TOTAL\}\}/g, `USD ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`)
                        .replace(/\{\{PROVEEDOR_NOMBRE\}\}/g, workspace.legalName || workspace.name)
                        .replace(/\{\{CLIENTE_RNC\}\}/g, company.taxId || "");
                    const normalizedEmailBody = normalizeEmailBodyToHtml(emailBody);

                    // Send emails
                    const recipientEmails = company.contacts.map(c => c.email);
                    const ccEmails = workspace.billingEmailsCC?.split(",").map(e => e.trim()).filter(Boolean) || [];
                    const bccEmails = workspace.billingEmailsBCC?.split(",").map(e => e.trim()).filter(Boolean) || [];

                    // Send one email per company, including all recipients for that client.
                    const result = await sendEmail({
                        user: {
                            emailFromAddress: senderUser.emailFromAddress!,
                            emailFromName: senderUser.emailFromName || workspace.name,
                            emailPassword: senderUser.emailPassword!,
                        },
                        to: recipientEmails,
                        cc: ccEmails.length > 0 ? ccEmails : undefined,
                        bcc: bccEmails.length > 0 ? bccEmails : undefined,
                        subject: emailSubject,
                        body: normalizedEmailBody,
                        attachments: [{
                            filename: `${pdfBaseName}.pdf`,
                            path: blob.url,
                        }],
                    });
                    const emailSent = result.success;

                    // Record in billing history
                    await prisma.billingHistory.create({
                        data: {
                            companyId: company.id,
                            workspaceId: workspace.id,
                            admCloudDocId,
                            proformaNumber,
                            billingMonth: currentMonth,
                            billingYear: currentYear,
                            status: emailSent ? "SENT" : "FAILED",
                            sentAt: emailSent ? new Date() : null,
                            recipients: JSON.stringify(recipientEmails),
                            ccRecipients: ccEmails.length > 0 ? JSON.stringify(ccEmails) : null,
                            pdfUrl: blob.url,
                            subtotal,
                            taxAmount,
                            totalAmount: total,
                            currency: "USD",
                            itemsSnapshot: JSON.stringify(calculatedItems),
                            errorMessage: emailSent ? null : "Failed to send email to all recipients",
                        },
                    });

                    if (emailSent) {
                        results.sent++;
                        results.details.push({
                            companyId: company.id,
                            companyName: company.name,
                            status: "sent",
                        });
                    } else {
                        results.failed++;
                        results.details.push({
                            companyId: company.id,
                            companyName: company.name,
                            status: "failed",
                            error: "Email sending failed",
                        });
                    }
                } catch (error) {
                    console.error(`Error processing company ${company.id}:`, error);
                    results.failed++;
                    results.details.push({
                        companyId: company.id,
                        companyName: company.name,
                        status: "failed",
                        error: error instanceof Error ? error.message : "Unknown error",
                    });

                    // Log error in billing history
                    await prisma.billingHistory.create({
                        data: {
                            companyId: company.id,
                            workspaceId: workspace.id,
                            billingMonth: currentMonth,
                            billingYear: currentYear,
                            status: "FAILED",
                            errorMessage: error instanceof Error ? error.message : "Unknown error",
                            recipients: "[]",
                            subtotal: 0,
                            taxAmount: 0,
                            totalAmount: 0,
                        },
                    });
                }
            }
        }

        return NextResponse.json({
            success: true,
            date: today.toISOString(),
            day: currentDay,
            ...results,
        });
    } catch (error) {
        console.error("Billing cron job error:", error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        }, { status: 500 });
    }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
    return GET(request);
}
