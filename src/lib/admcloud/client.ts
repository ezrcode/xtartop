/**
 * AdmCloud API Client
 * 
 * Cliente para interactuar con la API de AdmCloud (sistema contable)
 * Documentación: https://api.admcloud.net/swagger/docs/v1
 * 
 * La API usa Basic Authentication con los parámetros como query strings:
 * - appid: ID de la aplicación
 * - company: ID de la compañía
 * - role: Rol del usuario
 */

const ADMCLOUD_BASE_URL = 'https://api.admcloud.net/api';

export interface AdmCloudConfig {
    appId: string;
    username: string;  // Usuario para Basic Auth
    password: string;  // Contraseña para Basic Auth
    company: string;
    role: string;
}

// Dirección de cliente en ADMCloud
export interface AdmCloudAddress {
    ID: string;
    RelationshipID?: string;
    Name?: string;
    Address1?: string;
    Address2?: string;
    City?: string;
    State?: string;
    PostalCode?: string;
    CountryID?: string;
    CountryName?: string;
    Phone1?: string;
    Phone2?: string;
    Contact?: string;
    DefaultBillingAddress?: boolean;
    DefaultShipppingAddress?: boolean;
    FullName?: string;
}

// Contacto de cliente en ADMCloud
export interface AdmCloudContact {
    ID: string;
    RelationshipID?: string;
    FirstName?: string;
    LastName?: string;
    FullName?: string;
    EMail?: string;
    Phone1?: string;
    Phone2?: string;
    Mobile?: string;
    Position?: string;
    IncludeInQuoteEMails?: boolean;
    IncludeInInvoiceEMails?: boolean;
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
    // Direcciones y contactos
    Addresses?: AdmCloudAddress[];
    Contacts?: AdmCloudContact[];
}

export interface AdmCloudInvoice {
    ID: string;
    TransactionNumber?: string;
    TransactionDate?: string;
    RelationshipID?: string;
    SubTotal?: number;
    TotalTaxes?: number;
    Total?: number;
    CurrencyCode?: string;
    Status?: string;
    Notes?: string;
    DueDate?: string;
    PaymentTerms?: string;
    Balance?: number;
    Items?: AdmCloudInvoiceItem[];

    // Campos alternos usados por CreditInvoices
    DocID?: string;
    DocDate?: string;
    DocDateString?: string;
    TotalAmount?: number | string;
    SubtotalAmount?: number | string;
    TotalLocal?: number | string;
    SubtotalAmountLocal?: number | string;
    CurrencyID?: string;
    PaymentTermName?: string;
    Reference?: string;
    CreationDate?: string;
    NCF?: string;
    DocumentTypeName?: string;
    Mailed?: boolean;
}

export interface AdmCloudInvoiceItem {
    ID?: string;
    Description?: string;
    Quantity?: number;
    UnitPrice?: number;
    Amount?: number;
    TaxAmount?: number;
}

export interface AdmCloudItemPrice {
    ID?: string;
    ItemID?: string;
    PriceListID?: string;
    PriceListName?: string;
    Price?: number;
    UnitPrice?: number;
    SalesPrice?: number;
    CurrencyID?: string;
    UOMID?: string;
    [key: string]: unknown;
}

export interface AdmCloudItem {
    ID?: string;
    Id?: string;
    id?: string;
    ItemID?: string;
    Code?: string;
    code?: string;
    ItemCode?: string;
    SKU?: string;
    Sku?: string;
    sku?: string;
    ProductCode?: string;
    Name?: string;
    name?: string;
    Description?: string;
    description?: string;
    Price?: number;
    price?: number;
    SalesPrice?: number;
    UnitPrice?: number;
    Cost?: number;
    PurchasePrice?: number;
    IsActive?: boolean;
    Inactive?: boolean;
    CategoryID?: string;
    CategoryName?: string;
    Prices?: AdmCloudItemPrice[];
    [key: string]: unknown; // Allow additional fields
}

export interface AdmCloudApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// Quote/Proforma interfaces
export interface AdmCloudQuoteItem {
    ItemID: string;           // ID del artículo
    Name?: string;            // Descripción/Nombre (opcional, se toma del artículo)
    Quantity: number;         // Cantidad
    Price?: number;           // Precio unitario (campo correcto según API ADMCloud)
    DiscountPercent?: number; // Descuento en porcentaje
    RowOrder?: number;        // Orden de la línea (para mantener orden de items)
}

export interface AdmCloudQuoteRequest {
    RelationshipID: string;   // ID del cliente
    DocDate?: string;         // Fecha del documento (ISO format)
    CurrencyID?: string;      // Moneda (USD, DOP, etc.)
    Notes?: string;           // Notas/Observaciones
    Reference?: string;       // Referencia (ej: tasa de cambio)
    PaymentTermID?: string;   // ID de términos de pago (campo correcto: PaymentTermID, no PaymentTermsID)
    SalesStageID?: string;    // ID de etapa de ventas
    SalesRepID?: string;      // ID del vendedor
    
    // Contacto (de ADMCloud)
    ContactID?: string;       // ID del contacto en ADMCloud
    
    // Dirección de facturación (de ADMCloud)
    BillToAddressID?: string;  // ID de la dirección
    BillToName?: string;
    BillToAddress1?: string;
    BillToAddress2?: string;
    BillToCity?: string;
    BillToState?: string;
    BillToPostalCode?: string;
    BillToPhone?: string;
    BillToContact?: string;
    BillToCountryID?: string;
    
    Items: AdmCloudQuoteItem[]; // Líneas de la cotización
}

// PaymentTerm interface
export interface AdmCloudPaymentTerm {
    ID: string;
    Name: string;
    Description?: string;
    Days?: number;
}

// SalesStage interface
export interface AdmCloudSalesStage {
    ID: string;
    Name: string;
    Description?: string;
    Order?: number;
}

export interface AdmCloudQuote {
    ID: string;
    DocID?: string;           // Número de documento (PRO-00123)
    DocDate?: string;
    DocDateString?: string;
    RelationshipID?: string;
    RelationshipName?: string;
    CurrencyID?: string;
    Reference?: string;       // Tasa de cambio
    Notes?: string;
    
    // Totales
    CalculatedSubTotalAmount?: number;
    CalculatedDiscountAmount?: number;
    CalculatedNetAmount?: number;
    CalculatedTaxAmount?: number;
    CalculatedTotalAmount?: number;
    SubtotalAmount?: number;
    TotalAmount?: number;
    
    // Items
    Items?: AdmCloudQuoteItemResponse[];
    
    // Additional metadata
    Status?: string;
    CreationDate?: string;
    PaymentTermsID?: string;
    PaymentTermName?: string;
    ExpirationDays?: number;
    
    // Nested objects that might be returned
    Relationship?: AdmCloudCustomer;
    [key: string]: unknown;
}

export interface AdmCloudQuoteItemResponse {
    ID?: string;
    ItemID?: string;
    ItemCode?: string;
    Name?: string;
    Description?: string;
    Quantity?: number;
    Price?: number;
    UnitPrice?: number;
    Extended?: number;        // Quantity * Price
    DiscountPercent?: number;
    DiscountAmount?: number;
    TaxAmount?: number;
}

class AdmCloudClient {
    private config: AdmCloudConfig | null = null;

    setConfig(config: AdmCloudConfig) {
        this.config = config;
    }

    /**
     * Construye los query params de autenticación
     */
    private getAuthParams(): string {
        if (!this.config) {
            throw new Error('AdmCloud client not configured');
        }
        const params = new URLSearchParams({
            appid: this.config.appId,
            company: this.config.company,
            role: this.config.role,
        });
        return params.toString();
    }

    /**
     * Obtiene el header de Basic Authentication
     */
    private getBasicAuthHeader(): string {
        if (!this.config) {
            throw new Error('AdmCloud client not configured');
        }
        // Usar Buffer.from() para Node.js en lugar de btoa()
        const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
        return `Basic ${credentials}`;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {},
        extraParams: Record<string, string> = {}
    ): Promise<AdmCloudApiResponse<T>> {
        if (!this.config) {
            return { success: false, error: 'Cliente AdmCloud no configurado' };
        }

        try {
            // Construir URL con query params de autenticación
            const authParams = this.getAuthParams();
            const extraParamsStr = new URLSearchParams(extraParams).toString();
            const allParams = extraParamsStr ? `${authParams}&${extraParamsStr}` : authParams;
            
            // Determinar si el endpoint ya tiene query params
            const separator = endpoint.includes('?') ? '&' : '?';
            const url = `${ADMCLOUD_BASE_URL}${endpoint}${separator}${allParams}`;

            console.log('[AdmCloud] Request URL:', url.replace(/appid=[^&]+/, 'appid=***'));

            // Usar Basic Authentication como requiere la API
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.getBasicAuthHeader(),
                    ...options.headers,
                },
            });

            console.log('[AdmCloud] Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.log('[AdmCloud] Error response:', errorText.substring(0, 500));
                return {
                    success: false,
                    error: `Error ${response.status}: ${errorText || response.statusText}`,
                };
            }

            const payload = await response.json();
            if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
                if (!payload.success) {
                    return {
                        success: false,
                        error: payload.message || 'Error desconocido en respuesta de AdmCloud',
                    };
                }
                return { success: true, data: payload.data };
            }
            return { success: true, data: payload };
        } catch (error) {
            console.error('[AdmCloud] Exception:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Error desconocido',
            };
        }
    }

    private normalizeList<T>(data: T | T[] | null | undefined): T[] {
        if (!data) return [];
        return Array.isArray(data) ? data : [data];
    }

    /**
     * Obtener lista de clientes de AdmCloud
     */
    async getCustomers(): Promise<AdmCloudApiResponse<AdmCloudCustomer[]>> {
        return this.request<AdmCloudCustomer[]>('/Customers', {}, { skip: "0" });
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
        // Normalizar el taxId removiendo guiones y espacios
        const normalizedTaxId = taxId.replace(/[-\s]/g, '');

        // La API permite filtrar por FiscalID directamente
        const response = await this.request<AdmCloudCustomer | AdmCloudCustomer[]>('/Customers', {}, {
            FiscalID: normalizedTaxId,
        });

        if (!response.success) {
            return { success: false, error: response.error };
        }

        const customerList = this.normalizeList(response.data);

        const customer = customerList.find(c =>
            c.FiscalID?.replace(/[-\s]/g, '') === normalizedTaxId
        );

        return { success: true, data: customer || null };
    }

    /**
     * Obtener facturas de contado de un cliente
     */
    async getCashInvoices(relationshipId: string): Promise<AdmCloudApiResponse<AdmCloudInvoice[]>> {
        const response = await this.request<AdmCloudInvoice[] | AdmCloudInvoice>(
            '/CashInvoices',
            {},
            { RelationshipID: relationshipId, skip: "0" }
        );
        if (!response.success) {
            return { success: false, error: response.error };
        }
        return { success: true, data: this.normalizeList(response.data) };
    }

    /**
     * Obtener facturas a crédito de un cliente
     */
    async getCreditInvoices(relationshipId: string): Promise<AdmCloudApiResponse<AdmCloudInvoice[]>> {
        const response = await this.request<AdmCloudInvoice[] | AdmCloudInvoice>(
            '/CreditInvoices',
            {},
            { RelationshipID: relationshipId, skip: "0" }
        );
        if (!response.success) {
            return { success: false, error: response.error };
        }
        return { success: true, data: this.normalizeList(response.data) };
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
            ...this.normalizeList(cashResult.data),
            ...this.normalizeList(creditResult.data),
        ];

        // Ordenar por fecha (más reciente primero)
        const getSortTime = (invoice: AdmCloudInvoice) => {
            const value = invoice.TransactionDate || invoice.DocDate || invoice.DocDateString || invoice.CreationDate;
            if (!value) return 0;
            const time = new Date(value).getTime();
            return Number.isNaN(time) ? 0 : time;
        };
        allInvoices.sort((a, b) => getSortTime(b) - getSortTime(a));

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

    /**
     * Obtener lista de artículos/items de AdmCloud
     * Incluye Prices expandido para obtener los precios de venta
     */
    async getItems(): Promise<AdmCloudApiResponse<AdmCloudItem[]>> {
        const response = await this.request<AdmCloudItem[] | AdmCloudItem>(
            '/Items',
            {},
            { skip: "0", expand: "Prices" }
        );
        if (!response.success) {
            return { success: false, error: response.error };
        }
        return { success: true, data: this.normalizeList(response.data) };
    }

    /**
     * Obtener listas de precios de AdmCloud
     */
    async getPriceLists(): Promise<AdmCloudApiResponse<AdmCloudItemPrice[]>> {
        const response = await this.request<AdmCloudItemPrice[] | AdmCloudItemPrice>(
            '/PriceList',
            {},
            { skip: "0" }
        );
        if (!response.success) {
            return { success: false, error: response.error };
        }
        return { success: true, data: this.normalizeList(response.data) };
    }

    /**
     * Crear cotización/proforma en AdmCloud
     */
    async createQuote(data: AdmCloudQuoteRequest): Promise<AdmCloudApiResponse<AdmCloudQuote>> {
        const response = await this.request<AdmCloudQuote>(
            '/Quotes',
            {
                method: 'POST',
                body: JSON.stringify(data),
            }
        );
        return response;
    }

    /**
     * Obtener cotización por ID
     */
    async getQuote(id: string): Promise<AdmCloudApiResponse<AdmCloudQuote>> {
        const response = await this.request<AdmCloudQuote>(`/Quotes/${id}`);
        return response;
    }

    /**
     * Obtener cotizaciones de un cliente
     */
    async getQuotesByCustomer(relationshipId: string): Promise<AdmCloudApiResponse<AdmCloudQuote[]>> {
        const response = await this.request<AdmCloudQuote[] | AdmCloudQuote>(
            '/Quotes',
            {},
            { RelationshipID: relationshipId, skip: "0" }
        );
        if (!response.success) {
            return { success: false, error: response.error };
        }
        return { success: true, data: this.normalizeList(response.data) };
    }

    /**
     * Obtener términos de pago
     */
    async getPaymentTerms(): Promise<AdmCloudApiResponse<AdmCloudPaymentTerm[]>> {
        const response = await this.request<AdmCloudPaymentTerm[] | AdmCloudPaymentTerm>(
            '/PaymentTerms',
            {},
            { skip: "0" }
        );
        if (!response.success) {
            return { success: false, error: response.error };
        }
        return { success: true, data: this.normalizeList(response.data) };
    }

    /**
     * Obtener etapas de ventas
     */
    async getSalesStages(): Promise<AdmCloudApiResponse<AdmCloudSalesStage[]>> {
        const response = await this.request<AdmCloudSalesStage[] | AdmCloudSalesStage>(
            '/SalesStages',
            {},
            { skip: "0" }
        );
        if (!response.success) {
            return { success: false, error: response.error };
        }
        return { success: true, data: this.normalizeList(response.data) };
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
