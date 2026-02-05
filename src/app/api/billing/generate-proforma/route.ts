/**
 * API para generar proforma manual
 * 
 * Genera una proforma en ADMCloud y el PDF correspondiente
 * sin enviar email (solo genera y retorna la URL del PDF)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAdmCloudClient, type AdmCloudQuoteRequest } from "@/lib/admcloud/client";
import { renderToBuffer } from "@react-pdf/renderer";
import { createProformaPDF, addBusinessDays, DEFAULT_BANK_INFO, type ProformaData } from "@/lib/billing/pdf-generator";
import { put } from "@vercel/blob";

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

        // Get user and workspace
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                memberships: {
                    include: {
                        workspace: true,
                    },
                    take: 1,
                },
            },
        });

        if (!user || user.memberships.length === 0) {
            return NextResponse.json({ error: "Usuario sin workspace" }, { status: 400 });
        }

        const workspace = user.memberships[0].workspace;

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
        const taxAmount = 0;
        const total = subtotal + taxAmount;

        // Create quote in ADMCloud if enabled
        const admCloudEnabled = workspace.admCloudEnabled && 
            workspace.admCloudAppId && 
            workspace.admCloudUsername && 
            workspace.admCloudPassword;

        let admCloudDocId: string | null = null;
        let proformaNumber = `PRO-${currentYear}${String(currentMonth).padStart(2, "0")}-${company.id.slice(-6)}-M`;

        if (admCloudEnabled) {
            const admCloudClient = createAdmCloudClient({
                appId: workspace.admCloudAppId!,
                username: workspace.admCloudUsername!,
                password: workspace.admCloudPassword!,
                company: workspace.admCloudCompany || "",
                role: workspace.admCloudRole || "Administradores",
            });

            if (company.admCloudRelationshipId) {
                const quoteRequest: AdmCloudQuoteRequest = {
                    RelationshipID: company.admCloudRelationshipId,
                    DocDate: today.toISOString(),
                    CurrencyID: "USD",
                    Notes: `Proforma manual - ${currentMonth}/${currentYear}`,
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
                    console.error(`Failed to create quote in ADMCloud: ${quoteResult.error}`);
                    // Continue anyway - we'll still generate the PDF locally
                }
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
        const timestamp = Date.now();
        const pdfFileName = `proformas/${workspace.id}/${company.id}/${currentYear}-${String(currentMonth).padStart(2, "0")}-manual-${timestamp}.pdf`;
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
                billingMonth: currentMonth,
                billingYear: currentYear,
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
