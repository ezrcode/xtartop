/**
 * API para generar proforma manual
 * 
 * Genera una proforma en ADMCloud y el PDF correspondiente
 * sin enviar email (solo genera y retorna la URL del PDF)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAdmCloudClient, type AdmCloudPaymentTerm, type AdmCloudQuoteRequest } from "@/lib/admcloud/client";
import { renderToBuffer } from "@react-pdf/renderer";
import { createProformaPDF, addBusinessDays, DEFAULT_BANK_INFO, type ProformaData } from "@/lib/billing/pdf-generator";
import { put } from "@vercel/blob";
import { getCurrentWorkspace } from "@/actions/workspace";

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

function applyMonthOffset(month: number, year: number, offset: number): { month: number; year: number } {
    const total = month - 1 + offset;
    const y = year + Math.floor(total / 12);
    const m = ((total % 12) + 12) % 12 + 1;
    return { month: m, year: y };
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

export async function POST(request: NextRequest) {
    // Verify authentication
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { companyId } = body;

        if (!companyId) {
            return NextResponse.json({ error: "companyId es requerido" }, { status: 400 });
        }

        // Get workspace using the existing helper
        const workspace = await getCurrentWorkspace();

        if (!workspace) {
            return NextResponse.json({ error: "Workspace no encontrado" }, { status: 400 });
        }

        const latestExchangeRate = await prisma.exchangeRate.findFirst({
            where: { workspaceId: workspace.id },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        });

        // Get company with billing data
        const company = await prisma.company.findFirst({
            where: {
                id: companyId,
                workspaceId: workspace.id,
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
        });

        if (!company) {
            return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
        }

        const billing = company.subscriptionBilling;
        if (!billing || billing.items.length === 0) {
            return NextResponse.json({ error: "No hay artículos de suscripción configurados" }, { status: 400 });
        }

        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();
        const monthOffset = billing?.billingMonthOffset ?? 0;
        const { month: targetMonth, year: targetYear } = applyMonthOffset(currentMonth, currentYear, monthOffset);

        // Calculate quantities for each item
        const activeProjects = company.projects.length;
        const activeUsers = company.clientUsers.length;

        const calculatedItems = billing.items
            .map((item) => {
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
            })
            .filter((item) => item.calculatedQuantity > 0);

        if (calculatedItems.length === 0) {
            return NextResponse.json({
                error: "No hay líneas facturables: todos los ítems tienen cantidad 0",
            }, { status: 400 });
        }

        const subtotal = calculatedItems.reduce((sum, item) => sum + item.subtotal, 0);
        let taxAmount = 0;
        let total = subtotal;

        // Create quote in ADMCloud if enabled
        const admCloudEnabled = workspace.admCloudEnabled && 
            workspace.admCloudAppId && 
            workspace.admCloudUsername && 
            workspace.admCloudPassword;

        let admCloudDocId: string | null = null;
        let admCloudCreated = false;
        let admCloudError: string | null = null;
        let proformaNumber = `PRO-${targetYear}${String(targetMonth).padStart(2, "0")}-${company.id.slice(-6)}-M`;
        const billingPeriodText = getBillingPeriodText(targetMonth, targetYear);
        let pdfNotes = billingPeriodText;
        let paymentTermConfig = resolvePaymentTermConfig(
            workspace.admCloudDefaultPaymentTermName
                ? { Name: workspace.admCloudDefaultPaymentTermName, Description: undefined, Days: undefined }
                : null
        );

        if (admCloudEnabled) {
            if (!company.admCloudRelationshipId) {
                admCloudError = "La empresa no tiene RelationshipID de ADMCloud configurado";
            } else {
                const admCloudClient = createAdmCloudClient({
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

                // Obtener datos del cliente de ADMCloud (direcciones y contactos)
                const customerResult = await admCloudClient.getCustomer(company.admCloudRelationshipId);
                const admCloudCustomer = customerResult.success ? customerResult.data : null;
                
                // Obtener dirección de facturación predeterminada
                const billingAddress = admCloudCustomer?.Addresses?.find(a => a.DefaultBillingAddress) 
                    || admCloudCustomer?.Addresses?.[0];
                
                // Obtener primer contacto (o el que tiene IncludeInQuoteEMails)
                const contact = admCloudCustomer?.Contacts?.find(c => c.IncludeInQuoteEMails) 
                    || admCloudCustomer?.Contacts?.[0];

                const quoteRequest: AdmCloudQuoteRequest = {
                    RelationshipID: company.admCloudRelationshipId,
                    DocDate: today.toISOString(),
                    CurrencyID: "USD",
                    Notes: billingPeriodText,
                    Reference: latestExchangeRate ? Number(latestExchangeRate.rate).toFixed(2) : undefined,
                    // Términos de pago y etapa de ventas predeterminados
                    ...(workspace.admCloudDefaultPaymentTermId && { PaymentTermID: workspace.admCloudDefaultPaymentTermId }),
                    ...(workspace.admCloudDefaultSalesStageId && { SalesStageID: workspace.admCloudDefaultSalesStageId }),
                    // Contacto de ADMCloud
                    ...(contact?.ID && { ContactID: contact.ID }),
                    // Dirección de facturación de ADMCloud
                    ...(billingAddress && {
                        BillToAddressID: billingAddress.ID,
                        BillToName: billingAddress.Name || admCloudCustomer?.Name,
                        BillToAddress1: billingAddress.Address1,
                        BillToAddress2: billingAddress.Address2,
                        BillToCity: billingAddress.City,
                        BillToState: billingAddress.State,
                        BillToPostalCode: billingAddress.PostalCode,
                        BillToPhone: billingAddress.Phone1,
                        BillToContact: billingAddress.Contact || contact?.FullName,
                        BillToCountryID: billingAddress.CountryID,
                    }),
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
                    const directTax = Number(quoteResult.data.CalculatedTaxAmount) || 0;
                    if (directTax > 0) {
                        taxAmount = directTax;
                        total = subtotal + taxAmount;
                    }
                    admCloudDocId = extractAdmCloudQuoteId(quoteResult.data);
                    const directDocNumber = extractAdmCloudDocNumber(quoteResult.data);
                    if (directDocNumber) {
                        proformaNumber = directDocNumber;
                    } else if (admCloudDocId) {
                        // Fallback: some ADMCloud responses omit DocID on create, fetch full quote by ID.
                        const quoteDetail = await admCloudClient.getQuote(admCloudDocId);
                        if (quoteDetail.success && quoteDetail.data) {
                            const detailObservation = extractAdmCloudObservation(quoteDetail.data);
                            if (detailObservation) {
                                pdfNotes = detailObservation;
                            }
                            const detailTax = Number(quoteDetail.data.CalculatedTaxAmount) || 0;
                            if (detailTax > 0) {
                                taxAmount = detailTax;
                                total = subtotal + taxAmount;
                            }
                            const detailDocNumber = extractAdmCloudDocNumber(quoteDetail.data);
                            if (detailDocNumber) {
                                proformaNumber = detailDocNumber;
                            } else {
                                admCloudError = "ADMCloud creó la proforma pero no devolvió un número de documento válido (PRF...)";
                            }
                        } else {
                            admCloudError = quoteDetail.error || "No fue posible recuperar un número de documento válido (PRF...) desde ADMCloud";
                        }
                    } else {
                        admCloudError = "ADMCloud no devolvió un número de documento válido (PRF...) para la proforma";
                    }
                    admCloudCreated = true;
                } else {
                    admCloudError = quoteResult.error || "Error desconocido al crear cotización";
                    console.error(`Failed to create quote in ADMCloud: ${admCloudError}`);
                }
            }
        } else {
            admCloudError = "ADMCloud no está configurado en el workspace";
        }

        if (!admCloudCreated || admCloudError) {
            return NextResponse.json({
                success: false,
                error: admCloudError || "No fue posible obtener el número de documento desde ADMCloud",
            }, { status: 400 });
        }

        const expirationDate = paymentTermConfig
            ? paymentTermConfig.businessDays
                ? addBusinessDays(today, paymentTermConfig.days)
                : addCalendarDays(today, paymentTermConfig.days)
            : addBusinessDays(today, 30);

        // Generate PDF
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
        let pdfBuffer: Buffer;
        try {
            const pdfDocument = createProformaPDF(proformaData);
            pdfBuffer = await renderToBuffer(pdfDocument);
        } catch (pdfError) {
            console.error("Error generating PDF:", pdfError);
            return NextResponse.json({
                success: false,
                error: `Error al generar PDF: ${pdfError instanceof Error ? pdfError.message : "Error desconocido"}`,
            }, { status: 500 });
        }

        // Upload PDF to Vercel Blob
        const pdfBaseName = buildPdfBaseName(proformaNumber, company.name, targetMonth, targetYear);
        const pdfFileName = `proformas/${workspace.id}/${company.id}/${pdfBaseName}.pdf`;
        const blob = await put(pdfFileName, pdfBuffer, {
            access: "public",
            contentType: "application/pdf",
        });

        // Record in billing history as manual generation (PENDING status)
        const recipientEmails = company.contacts.map(c => c.email);
        
        await prisma.billingHistory.create({
            data: {
                companyId: company.id,
                workspaceId: workspace.id,
                admCloudDocId,
                proformaNumber,
                billingMonth: targetMonth,
                billingYear: targetYear,
                status: "PENDING", // Not sent, just generated
                recipients: JSON.stringify(recipientEmails),
                pdfUrl: blob.url,
                subtotal,
                taxAmount,
                totalAmount: total,
                currency: "USD",
                itemsSnapshot: JSON.stringify(calculatedItems),
            },
        });

        return NextResponse.json({
            success: true,
            proformaNumber,
            admCloudDocId,
            admCloudCreated,
            admCloudError,
            pdfUrl: blob.url,
            total,
            itemsCount: calculatedItems.length,
        });
    } catch (error) {
        console.error("Error generating proforma:", error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : "Error desconocido",
        }, { status: 500 });
    }
}
