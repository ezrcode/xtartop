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
import { createAdmCloudClient, type AdmCloudQuoteRequest } from "@/lib/admcloud/client";
import { renderToBuffer } from "@react-pdf/renderer";
import { createProformaPDF, addBusinessDays, DEFAULT_BANK_INFO, type ProformaData } from "@/lib/billing/pdf-generator";
import { sendEmail } from "@/lib/email/sender";
import { put } from "@vercel/blob";

// Verify cron secret for security
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

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
            if (admCloudEnabled) {
                admCloudClient = createAdmCloudClient({
                    appId: workspace.admCloudAppId!,
                    username: workspace.admCloudUsername!,
                    password: workspace.admCloudPassword!,
                    company: workspace.admCloudCompany || "",
                    role: workspace.admCloudRole || "Administradores",
                });
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

                    // Create quote in ADMCloud if enabled
                    let admCloudDocId: string | null = null;
                    let proformaNumber = `PRO-${currentYear}${String(currentMonth).padStart(2, "0")}-${company.id.slice(-6)}`;

                    if (admCloudClient && company.admCloudRelationshipId) {
                        const quoteRequest: AdmCloudQuoteRequest = {
                            RelationshipID: company.admCloudRelationshipId,
                            DocDate: today.toISOString(),
                            CurrencyID: "USD",
                            Notes: `Facturación mensual automática - ${currentMonth}/${currentYear}`,
                            Items: calculatedItems.map((item) => ({
                                ItemID: item.admCloudItemId,
                                Quantity: item.calculatedQuantity,
                                UnitPrice: Number(item.price),
                            })),
                        };

                        const quoteResult = await admCloudClient.createQuote(quoteRequest);
                        
                        if (quoteResult.success && quoteResult.data) {
                            admCloudDocId = quoteResult.data.ID;
                            proformaNumber = quoteResult.data.DocID || proformaNumber;
                        } else {
                            console.error(`Failed to create quote in ADMCloud for ${company.name}: ${quoteResult.error}`);
                        }
                    }

                    // Generate PDF
                    const proformaData: ProformaData = {
                        documentNumber: proformaNumber,
                        documentDate: today,
                        expirationDate: addBusinessDays(today, 30),
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
                        
                        notes: "",
                        bankInfo: DEFAULT_BANK_INFO,
                    };

                    // Render PDF to buffer
                    const pdfDocument = createProformaPDF(proformaData);
                    const pdfBuffer = await renderToBuffer(pdfDocument);

                    // Upload PDF to Vercel Blob
                    const pdfFileName = `proformas/${workspace.id}/${company.id}/${currentYear}-${String(currentMonth).padStart(2, "0")}.pdf`;
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

                    // Send emails
                    const recipientEmails = company.contacts.map(c => c.email);
                    const ccEmails = workspace.billingEmailsCC?.split(",").map(e => e.trim()).filter(Boolean) || [];

                    // Send to each recipient individually
                    let emailSent = false;
                    for (const recipientEmail of recipientEmails) {
                        const result = await sendEmail({
                            user: {
                                emailFromAddress: senderUser.emailFromAddress!,
                                emailFromName: senderUser.emailFromName || workspace.name,
                                emailPassword: senderUser.emailPassword!,
                            },
                            to: recipientEmail,
                            subject: emailSubject,
                            body: emailBody,
                            attachments: [{
                                filename: `Proforma_${proformaNumber.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
                                path: blob.url,
                            }],
                        });

                        if (result.success) {
                            emailSent = true;
                        }
                    }

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
