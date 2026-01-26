/**
 * AdmCloud API Client
 * 
 * Cliente para interactuar con la API de AdmCloud (sistema contable)
 * Documentación: https://api.admcloud.net/swagger/docs/v1
 */

const ADMCLOUD_BASE_URL = 'https://api.admcloud.net/api';

export interface AdmCloudConfig {
    appId: string;
    token: string;
    company: string;
    role: string;
}

export interface AdmCloudCustomer {
    ID: string;
    FiscalID: string;
    Name: string;
    EMail: string | null;
    Address1?: string;
    Address2?: string;
    City?: string;
    Country?: string;
    Phone?: string;
    CellPhone?: string;
    Fax?: string;
    ContactPerson?: string;
    WebSite?: string;
    IsActive?: boolean;
    CreationDate?: string;
}

export interface AdmCloudInvoice {
    ID: string;
    TransactionNumber: string;
    TransactionDate: string;
    RelationshipID: string;
    SubTotal: number;
    TotalTaxes: number;
    Total: number;
    CurrencyCode: string;
    Status: string;
    Notes?: string;
    DueDate?: string;
    PaymentTerms?: string;
    Balance?: number;
    Items?: AdmCloudInvoiceItem[];
}

export interface AdmCloudInvoiceItem {
    ID?: string;
    Description?: string;
    Quantity?: number;
    UnitPrice?: number;
    Amount?: number;
    TaxAmount?: number;
}

export interface AdmCloudApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

class AdmCloudClient {
    private config: AdmCloudConfig | null = null;

    setConfig(config: AdmCloudConfig) {
        this.config = config;
    }

    private getHeaders(): HeadersInit {
        if (!this.config) {
            throw new Error('AdmCloud client not configured');
        }
        return {
            'Content-Type': 'application/json',
            'appid': this.config.appId,
            'token': this.config.token,
            'company': this.config.company,
            'role': this.config.role,
        };
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<AdmCloudApiResponse<T>> {
        if (!this.config) {
            return { success: false, error: 'Cliente AdmCloud no configurado' };
        }

        try {
            const response = await fetch(`${ADMCLOUD_BASE_URL}${endpoint}`, {
                ...options,
                headers: {
                    ...this.getHeaders(),
                    ...options.headers,
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                return {
                    success: false,
                    error: `Error ${response.status}: ${errorText || response.statusText}`,
                };
            }

            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Error desconocido',
            };
        }
    }

    /**
     * Obtener lista de clientes de AdmCloud
     */
    async getCustomers(): Promise<AdmCloudApiResponse<AdmCloudCustomer[]>> {
        return this.request<AdmCloudCustomer[]>('/Customers');
    }

    /**
     * Obtener un cliente específico por ID
     */
    async getCustomer(relationshipId: string): Promise<AdmCloudApiResponse<AdmCloudCustomer>> {
        return this.request<AdmCloudCustomer>(`/Customers/${relationshipId}`);
    }

    /**
     * Buscar cliente por RNC (FiscalID)
     */
    async findCustomerByTaxId(taxId: string): Promise<AdmCloudApiResponse<AdmCloudCustomer | null>> {
        const customers = await this.getCustomers();
        if (!customers.success || !customers.data) {
            return { success: false, error: customers.error };
        }
        
        // Normalizar el taxId removiendo guiones y espacios
        const normalizedTaxId = taxId.replace(/[-\s]/g, '');
        const customer = customers.data.find(c => 
            c.FiscalID?.replace(/[-\s]/g, '') === normalizedTaxId
        );
        
        return { success: true, data: customer || null };
    }

    /**
     * Obtener facturas de contado de un cliente
     */
    async getCashInvoices(relationshipId: string): Promise<AdmCloudApiResponse<AdmCloudInvoice[]>> {
        return this.request<AdmCloudInvoice[]>(`/CashInvoices?RelationshipID=${relationshipId}`);
    }

    /**
     * Obtener facturas a crédito de un cliente
     */
    async getCreditInvoices(relationshipId: string): Promise<AdmCloudApiResponse<AdmCloudInvoice[]>> {
        return this.request<AdmCloudInvoice[]>(`/CreditInvoices?RelationshipID=${relationshipId}`);
    }

    /**
     * Obtener todas las facturas de un cliente (contado + crédito)
     */
    async getAllInvoices(relationshipId: string): Promise<AdmCloudApiResponse<AdmCloudInvoice[]>> {
        const [cashResult, creditResult] = await Promise.all([
            this.getCashInvoices(relationshipId),
            this.getCreditInvoices(relationshipId),
        ]);

        if (!cashResult.success && !creditResult.success) {
            return { success: false, error: cashResult.error || creditResult.error };
        }

        const allInvoices = [
            ...(cashResult.data || []),
            ...(creditResult.data || []),
        ];

        // Ordenar por fecha (más reciente primero)
        allInvoices.sort((a, b) => 
            new Date(b.TransactionDate).getTime() - new Date(a.TransactionDate).getTime()
        );

        return { success: true, data: allInvoices };
    }

    /**
     * Probar la conexión con AdmCloud
     */
    async testConnection(): Promise<AdmCloudApiResponse<boolean>> {
        const result = await this.getCustomers();
        return {
            success: result.success,
            data: result.success,
            error: result.error,
        };
    }
}

// Singleton instance
export const admCloudClient = new AdmCloudClient();

/**
 * Crear cliente con configuración específica
 */
export function createAdmCloudClient(config: AdmCloudConfig): AdmCloudClient {
    const client = new AdmCloudClient();
    client.setConfig(config);
    return client;
}
