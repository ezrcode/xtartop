"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createAdmCloudClient, type AdmCloudInvoice, type AdmCloudCustomer } from "@/lib/admcloud/client";

/**
 * Obtener la configuración de AdmCloud del workspace actual
 */
async function getAdmCloudConfig() {
    const session = await auth();
    if (!session?.user?.email) {
        return null;
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: {
            ownedWorkspaces: {
                take: 1,
                select: {
                    id: true,
                    admCloudEnabled: true,
                    admCloudAppId: true,
                    admCloudUsername: true,
                    admCloudPassword: true,
                    admCloudCompany: true,
                    admCloudRole: true,
                }
            },
            memberships: {
                take: 1,
                include: {
                    workspace: {
                        select: {
                            id: true,
                            admCloudEnabled: true,
                            admCloudAppId: true,
                            admCloudUsername: true,
                            admCloudPassword: true,
                            admCloudCompany: true,
                            admCloudRole: true,
                        }
                    }
                }
            }
        }
    });

    const workspace = user?.ownedWorkspaces[0] || user?.memberships[0]?.workspace;
    
    if (!workspace || !workspace.admCloudEnabled) {
        return null;
    }

    if (!workspace.admCloudAppId || !workspace.admCloudUsername || !workspace.admCloudPassword || !workspace.admCloudCompany) {
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
    const admCloudConfig = await getAdmCloudConfig();
    
    if (!admCloudConfig) {
        return { 
            success: false, 
            error: "AdmCloud no está configurado",
            isConfigured: false 
        };
    }

    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { admCloudRelationshipId: true, taxId: true, name: true }
    });

    if (!company) {
        return { success: false, error: "Empresa no encontrada" };
    }

    const client = createAdmCloudClient(admCloudConfig.config);

    // Si no tiene RelationshipId, intentar buscar por RNC
    let relationshipId = company.admCloudRelationshipId;
    
    if (!relationshipId && company.taxId) {
        const customerResult = await client.findCustomerByTaxId(company.taxId);
        if (customerResult.success && customerResult.data) {
            relationshipId = customerResult.data.ID;
            
            // Guardar el RelationshipId para futuras consultas
            await prisma.company.update({
                where: { id: companyId },
                data: { 
                    admCloudRelationshipId: relationshipId,
                    admCloudLastSync: new Date()
                }
            });
        }
    }

    if (!relationshipId) {
        return { 
            success: false, 
            error: "Esta empresa no está vinculada a un cliente en AdmCloud. Verifique que el RNC coincida.",
            isConfigured: true
        };
    }

    const invoicesResult = await client.getAllInvoices(relationshipId);
    
    if (!invoicesResult.success) {
        return { success: false, error: invoicesResult.error, isConfigured: true };
    }

    return { 
        success: true, 
        invoices: invoicesResult.data || [],
        isConfigured: true
    };
}

/**
 * Sincronizar cliente de CRM con AdmCloud
 */
export async function syncCompanyWithAdmCloud(companyId: string): Promise<{
    success: boolean;
    customer?: AdmCloudCustomer;
    error?: string;
}> {
    const admCloudConfig = await getAdmCloudConfig();
    
    if (!admCloudConfig) {
        return { success: false, error: "AdmCloud no está configurado" };
    }

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

    const client = createAdmCloudClient(admCloudConfig.config);
    const customerResult = await client.findCustomerByTaxId(company.taxId);

    if (!customerResult.success) {
        return { success: false, error: customerResult.error };
    }

    if (!customerResult.data) {
        return { 
            success: false, 
            error: `No se encontró un cliente en AdmCloud con el RNC: ${company.taxId}` 
        };
    }

    // Actualizar la empresa con el RelationshipId
    await prisma.company.update({
        where: { id: companyId },
        data: {
            admCloudRelationshipId: customerResult.data.ID,
            admCloudLastSync: new Date()
        }
    });

    revalidatePath(`/app/companies/${companyId}`);

    return { success: true, customer: customerResult.data };
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
                select: {
                    admCloudEnabled: true,
                    admCloudAppId: true,
                    admCloudUsername: true,
                    admCloudPassword: true,
                    admCloudCompany: true,
                }
            },
            memberships: {
                take: 1,
                include: {
                    workspace: {
                        select: {
                            admCloudEnabled: true,
                            admCloudAppId: true,
                            admCloudUsername: true,
                            admCloudPassword: true,
                            admCloudCompany: true,
                        }
                    }
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
