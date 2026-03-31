"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createAdmCloudClient, type AdmCloudInvoice, type AdmCloudCustomer } from "@/lib/admcloud/client";
import { getCurrentWorkspace } from "./workspace";

/**
 * Obtener la configuración de AdmCloud del workspace actual
 */
async function getAdmCloudConfig() {
    const session = await auth();
    if (!session?.user?.email) {
        console.log('[getAdmCloudConfig] No session or email');
        return null;
    }

    // Primero obtener el usuario para conseguir el workspaceId
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: {
            ownedWorkspaces: {
                take: 1,
                select: { id: true }
            },
            memberships: {
                take: 1,
                select: { workspaceId: true }
            }
        }
    });

    const workspaceId = user?.ownedWorkspaces[0]?.id || user?.memberships[0]?.workspaceId;
    
    if (!workspaceId) {
        console.log('[getAdmCloudConfig] No workspaceId found');
        return null;
    }

    // Luego obtener el workspace con todos los campos de AdmCloud explícitamente
    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: {
            id: true,
            admCloudEnabled: true,
            admCloudAppId: true,
            admCloudUsername: true,
            admCloudPassword: true,
            admCloudCompany: true,
            admCloudRole: true,
        }
    });

    console.log('[getAdmCloudConfig] Workspace found:', {
        id: workspace?.id,
        enabled: workspace?.admCloudEnabled,
        hasAppId: !!workspace?.admCloudAppId,
        hasUsername: !!workspace?.admCloudUsername,
        hasPassword: !!workspace?.admCloudPassword,
        hasCompany: !!workspace?.admCloudCompany,
    });
    
    if (!workspace || !workspace.admCloudEnabled) {
        console.log('[getAdmCloudConfig] AdmCloud not enabled');
        return null;
    }

    if (!workspace.admCloudAppId || !workspace.admCloudUsername || !workspace.admCloudPassword || !workspace.admCloudCompany) {
        console.log('[getAdmCloudConfig] Missing required fields');
        return null;
    }

    return {
        workspaceId: workspace.id,
        config: {
            appId: workspace.admCloudAppId,
            username: workspace.admCloudUsername,
            password: workspace.admCloudPassword,
            company: workspace.admCloudCompany,
            role: workspace.admCloudRole || "Administradores",
        }
    };
}

export interface AdmCloudSettingsState {
    message: string;
    success?: boolean;
    errors?: {
        appId?: string;
        username?: string;
        password?: string;
        company?: string;
    };
}

/**
 * Guardar configuración de AdmCloud
 */
export async function saveAdmCloudSettings(
    prevState: AdmCloudSettingsState,
    formData: FormData
): Promise<AdmCloudSettingsState> {
    const session = await auth();
    if (!session?.user?.email) {
        return { message: "No autorizado" };
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { ownedWorkspaces: { take: 1 } }
    });

    const workspace = user?.ownedWorkspaces[0];
    if (!workspace) {
        return { message: "No se encontró el workspace" };
    }

    const enabled = formData.get("enabled") === "true";
    const appId = formData.get("appId")?.toString().trim() || "";
    const username = formData.get("username")?.toString().trim() || "";
    const password = formData.get("password")?.toString().trim() || "";
    const company = formData.get("company")?.toString().trim() || "";
    const role = formData.get("role")?.toString().trim() || "Administradores";
    const defaultPriceListId = formData.get("defaultPriceListId")?.toString().trim() || "";
    const defaultPriceListName = formData.get("defaultPriceListName")?.toString().trim() || "";
    const defaultPaymentTermId = formData.get("defaultPaymentTermId")?.toString().trim() || "";
    const defaultPaymentTermName = formData.get("defaultPaymentTermName")?.toString().trim() || "";
    const defaultSalesStageId = formData.get("defaultSalesStageId")?.toString().trim() || "";
    const defaultSalesStageNam = formData.get("defaultSalesStageNam")?.toString().trim() || "";

    // Validar campos si está habilitado
    if (enabled) {
        const errors: AdmCloudSettingsState["errors"] = {};
        if (!appId) errors.appId = "El App ID es requerido";
        if (!username) errors.username = "El usuario es requerido";
        if (!password) errors.password = "La contraseña es requerida";
        if (!company) errors.company = "El ID de Compañía es requerido";

        if (Object.keys(errors).length > 0) {
            return { message: "Complete todos los campos requeridos", errors };
        }

        // Probar la conexión
        const client = createAdmCloudClient({ appId, username, password, company, role });
        const testResult = await client.testConnection();
        
        if (!testResult.success) {
            return { 
                message: `Error de conexión con AdmCloud: ${testResult.error}`,
                success: false 
            };
        }
    }

    // Guardar configuración
    await prisma.workspace.update({
        where: { id: workspace.id },
        data: {
            admCloudEnabled: enabled,
            admCloudAppId: enabled ? appId : null,
            admCloudUsername: enabled ? username : null,
            admCloudPassword: enabled ? password : null,
            admCloudCompany: enabled ? company : null,
            admCloudRole: enabled ? role : null,
            admCloudDefaultPriceListId: enabled && defaultPriceListId ? defaultPriceListId : null,
            admCloudDefaultPriceListName: enabled && defaultPriceListName ? defaultPriceListName : null,
            admCloudDefaultPaymentTermId: enabled && defaultPaymentTermId ? defaultPaymentTermId : null,
            admCloudDefaultPaymentTermName: enabled && defaultPaymentTermName ? defaultPaymentTermName : null,
            admCloudDefaultSalesStageId: enabled && defaultSalesStageId ? defaultSalesStageId : null,
            admCloudDefaultStageName: enabled && defaultSalesStageNam ? defaultSalesStageNam : null,
        }
    });

    revalidatePath("/app/settings");
    
    return { 
        message: enabled 
            ? "Integración con AdmCloud configurada correctamente" 
            : "Integración con AdmCloud deshabilitada",
        success: true 
    };
}

/**
 * Obtener facturas de AdmCloud para una empresa
 */
export async function getCompanyInvoices(companyId: string): Promise<{
    success: boolean;
    invoices?: AdmCloudInvoice[];
    error?: string;
    isConfigured?: boolean;
}> {
    try {
        const admCloudConfig = await getAdmCloudConfig();
        
        if (!admCloudConfig) {
            return { 
                success: false, 
                error: "AdmCloud no está configurado",
                isConfigured: false 
            };
        }

        const links = await prisma.companyAdmCloudLink.findMany({
            where: { companyId },
        });

        // Fallback: if no links, try legacy field
        if (links.length === 0) {
            const company = await prisma.company.findUnique({
                where: { id: companyId },
                select: { admCloudRelationshipId: true, taxId: true }
            });
            if (company?.admCloudRelationshipId) {
                links.push({
                    id: "legacy",
                    companyId,
                    admCloudRelationshipId: company.admCloudRelationshipId,
                    name: "",
                    fiscalId: company.taxId,
                    isPrimary: true,
                    createdAt: new Date(),
                });
            }
        }

        if (links.length === 0) {
            return { 
                success: false, 
                error: "Esta empresa no está vinculada a un cliente en AdmCloud. Agregue un vínculo por RNC.",
                isConfigured: true
            };
        }

        const client = createAdmCloudClient(admCloudConfig.config);

        const allInvoices: AdmCloudInvoice[] = [];
        for (const link of links) {
            const invoicesResult = await client.getCreditInvoices(link.admCloudRelationshipId);
            if (invoicesResult.success && invoicesResult.data) {
                allInvoices.push(...invoicesResult.data);
            }
        }

        const getTime = (inv: AdmCloudInvoice) => {
            const v = inv.TransactionDate || inv.DocDate || inv.DocDateString || inv.CreationDate;
            if (!v) return 0;
            const t = new Date(v).getTime();
            return Number.isNaN(t) ? 0 : t;
        };
        allInvoices.sort((a, b) => getTime(b) - getTime(a));

        return { 
            success: true, 
            invoices: allInvoices,
            isConfigured: true
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Error in getCompanyInvoices:", message, error);
        return { 
            success: false, 
            error: `Error interno al obtener facturas: ${message}`,
            isConfigured: true
        };
    }
}

/**
 * Sincronizar cliente de CRM con AdmCloud
 */
export async function syncCompanyWithAdmCloud(companyId: string): Promise<{
    success: boolean;
    customer?: AdmCloudCustomer;
    error?: string;
}> {
    try {
        console.log('[syncCompanyWithAdmCloud] Starting sync for company:', companyId);
        
        const admCloudConfig = await getAdmCloudConfig();
        
        if (!admCloudConfig) {
            console.log('[syncCompanyWithAdmCloud] AdmCloud not configured');
            return { success: false, error: "AdmCloud no está configurado" };
        }
        
        console.log('[syncCompanyWithAdmCloud] Config found, appId:', admCloudConfig.config.appId?.substring(0, 8) + '...');

        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { taxId: true, name: true }
        });

        if (!company) {
            return { success: false, error: "Empresa no encontrada" };
        }

        if (!company.taxId) {
            return { success: false, error: "La empresa debe tener un RNC para sincronizar con AdmCloud" };
        }
        
        console.log('[syncCompanyWithAdmCloud] Looking for customer with taxId:', company.taxId);

        const client = createAdmCloudClient(admCloudConfig.config);
        const customerResult = await client.findCustomerByTaxId(company.taxId);
        
        console.log('[syncCompanyWithAdmCloud] Customer search result:', customerResult.success, customerResult.error);

        if (!customerResult.success) {
            return { success: false, error: customerResult.error };
        }

        if (!customerResult.data) {
            return { 
                success: false, 
                error: `No se encontró un cliente en AdmCloud con el RNC: ${company.taxId}` 
            };
        }

        const relId = customerResult.data.ID;
        const custName = customerResult.data.Name || company.name;
        const custFiscalId = customerResult.data.FiscalID || company.taxId;

        // Update legacy field
        await prisma.company.update({
            where: { id: companyId },
            data: {
                admCloudRelationshipId: relId,
                admCloudLastSync: new Date()
            }
        });

        // Upsert link: if one with this relId exists update it, else create
        const existingLink = await prisma.companyAdmCloudLink.findFirst({
            where: { companyId, admCloudRelationshipId: relId },
        });

        if (existingLink) {
            await prisma.companyAdmCloudLink.update({
                where: { id: existingLink.id },
                data: { name: custName, fiscalId: custFiscalId, isPrimary: true },
            });
        } else {
            // Set all existing as non-primary
            await prisma.companyAdmCloudLink.updateMany({
                where: { companyId, isPrimary: true },
                data: { isPrimary: false },
            });
            await prisma.companyAdmCloudLink.create({
                data: {
                    companyId,
                    admCloudRelationshipId: relId,
                    name: custName,
                    fiscalId: custFiscalId,
                    isPrimary: true,
                },
            });
        }

        revalidatePath(`/app/companies/${companyId}`);

        return { success: true, customer: customerResult.data };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Error in syncCompanyWithAdmCloud:", message, error);
        return { success: false, error: `Error interno al sincronizar con AdmCloud: ${message}` };
    }
}

/**
 * Verificar si AdmCloud está configurado
 */
export async function checkAdmCloudStatus(): Promise<{
    isConfigured: boolean;
    isEnabled: boolean;
}> {
    const session = await auth();
    if (!session?.user?.email) {
        return { isConfigured: false, isEnabled: false };
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: {
            ownedWorkspaces: {
                take: 1,
            },
            memberships: {
                take: 1,
                include: {
                    workspace: true
                }
            }
        }
    });

    const workspace = user?.ownedWorkspaces[0] || user?.memberships[0]?.workspace;
    
    if (!workspace) {
        return { isConfigured: false, isEnabled: false };
    }

    const isConfigured = !!(
        workspace.admCloudAppId && 
        workspace.admCloudUsername && 
        workspace.admCloudPassword &&
        workspace.admCloudCompany
    );

    return {
        isConfigured,
        isEnabled: workspace.admCloudEnabled && isConfigured
    };
}

// ─── Tax Groups CRUD ─────────────────────────────────────────────

export async function getAdmCloudTaxGroups() {
    const workspace = await getCurrentWorkspace();
    if (!workspace) return [];

    return prisma.admCloudTaxGroup.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: "asc" },
    });
}

export async function createAdmCloudTaxGroup(name: string, taxScheduleId: string) {
    const workspace = await getCurrentWorkspace();
    if (!workspace) throw new Error("Workspace no encontrado");

    const trimmedName = name.trim();
    const trimmedId = taxScheduleId.trim();
    if (!trimmedName || !trimmedId) throw new Error("Nombre y TaxScheduleID son requeridos");

    const group = await prisma.admCloudTaxGroup.create({
        data: {
            workspaceId: workspace.id,
            name: trimmedName,
            taxScheduleId: trimmedId,
        },
    });

    revalidatePath("/app/settings");
    return group;
}

export async function deleteAdmCloudTaxGroup(id: string) {
    const workspace = await getCurrentWorkspace();
    if (!workspace) throw new Error("Workspace no encontrado");

    await prisma.admCloudTaxGroup.delete({
        where: { id, workspaceId: workspace.id },
    });

    revalidatePath("/app/settings");
    return { success: true };
}

// ─── Company ADMCloud Links ──────────────────────────────────────

export async function getCompanyAdmCloudLinks(companyId: string) {
    return prisma.companyAdmCloudLink.findMany({
        where: { companyId },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });
}

export async function addCompanyAdmCloudLink(
    companyId: string,
    taxId: string
): Promise<{ success: boolean; error?: string }> {
    const admCloudConfig = await getAdmCloudConfig();
    if (!admCloudConfig) return { success: false, error: "ADMCloud no está configurado" };

    const client = createAdmCloudClient(admCloudConfig.config);
    const result = await client.findCustomerByTaxId(taxId);

    if (!result.success || !result.data) {
        return { success: false, error: `No se encontró un cliente en ADMCloud con el RNC: ${taxId}` };
    }

    const relId = result.data.ID;

    const existing = await prisma.companyAdmCloudLink.findFirst({
        where: { companyId, admCloudRelationshipId: relId },
    });
    if (existing) {
        return { success: false, error: "Esta empresa de ADMCloud ya está vinculada" };
    }

    const hasLinks = await prisma.companyAdmCloudLink.count({ where: { companyId } });

    await prisma.companyAdmCloudLink.create({
        data: {
            companyId,
            admCloudRelationshipId: relId,
            name: result.data.Name || "",
            fiscalId: result.data.FiscalID || taxId,
            isPrimary: hasLinks === 0,
        },
    });

    // Keep legacy field in sync with primary
    if (hasLinks === 0) {
        await prisma.company.update({
            where: { id: companyId },
            data: { admCloudRelationshipId: relId, admCloudLastSync: new Date() },
        });
    }

    revalidatePath(`/app/companies/${companyId}`);
    return { success: true };
}

export async function setCompanyAdmCloudLinkPrimary(companyId: string, linkId: string) {
    await prisma.companyAdmCloudLink.updateMany({
        where: { companyId, isPrimary: true },
        data: { isPrimary: false },
    });
    const link = await prisma.companyAdmCloudLink.update({
        where: { id: linkId },
        data: { isPrimary: true },
    });

    // Keep legacy field in sync
    await prisma.company.update({
        where: { id: companyId },
        data: { admCloudRelationshipId: link.admCloudRelationshipId, admCloudLastSync: new Date() },
    });

    revalidatePath(`/app/companies/${companyId}`);
    return { success: true };
}

export async function deleteCompanyAdmCloudLink(companyId: string, linkId: string) {
    const link = await prisma.companyAdmCloudLink.findUnique({ where: { id: linkId } });
    if (!link) return { success: false };

    await prisma.companyAdmCloudLink.delete({ where: { id: linkId } });

    // If deleted the primary, promote the next one
    if (link.isPrimary) {
        const next = await prisma.companyAdmCloudLink.findFirst({
            where: { companyId },
            orderBy: { createdAt: "asc" },
        });
        if (next) {
            await prisma.companyAdmCloudLink.update({ where: { id: next.id }, data: { isPrimary: true } });
            await prisma.company.update({
                where: { id: companyId },
                data: { admCloudRelationshipId: next.admCloudRelationshipId },
            });
        } else {
            await prisma.company.update({
                where: { id: companyId },
                data: { admCloudRelationshipId: null, admCloudLastSync: null },
            });
        }
    }

    revalidatePath(`/app/companies/${companyId}`);
    return { success: true };
}
