/**
 * Decima Portal API Client
 *
 * Cliente para interactuar con la API del Portal de Décima
 * Documentación: /docs/external-orders-api.md
 *
 * La API usa API Key como Bearer token o header X-API-Key
 */

const DECIMA_BASE_URL = 'https://portal.decima.us/api/v1';

export interface DecimaConfig {
    apiKey: string;
}

export interface DecimaProduct {
    id: string;
    code: string;
    name: string;
    cost?: number;
    salePrice?: number;
    currency?: string;
    isActive?: boolean;
    [key: string]: unknown;
}

export interface DecimaOrderItem {
    productCode?: string;
    productId?: string;
    productName?: string;
    quantity: number;
    unitPrice?: number;
    total?: number;
    [key: string]: unknown;
}

export interface DecimaOrder {
    id: string;
    period: string;
    status: string;
    intent?: string;
    promoCode?: string | null;
    externalReference?: string | null;
    notes?: string | null;
    items?: DecimaOrderItem[];
    subtotal?: number;
    total?: number;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface DecimaApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface DecimaPromotionProduct {
    id: string;
    code: string;
    name: string;
    cost: number;
    salePrice: number;
    currency: string;
}

export interface DecimaPromotion {
    id: string;
    name: string;
    code: string;
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    validFrom: string;
    validTo: string;
    isActive: boolean;
    products: DecimaPromotionProduct[];
}

export interface DecimaCreateOrderRequest {
    period: string;            // "YYYY-MM"
    intent: 'DRAFT' | 'SUBMITTED';
    items: { productCode: string; quantity: number }[];
    promoCode?: string;
    externalReference?: string;
    notes?: string;
}

class DecimaClient {
    private config: DecimaConfig | null = null;

    setConfig(config: DecimaConfig) {
        this.config = config;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {},
        queryParams: Record<string, string> = {}
    ): Promise<DecimaApiResponse<T>> {
        if (!this.config) {
            return { success: false, error: 'Cliente Decima no configurado' };
        }

        try {
            const params = new URLSearchParams(queryParams).toString();
            const separator = endpoint.includes('?') ? '&' : '?';
            const url = params
                ? `${DECIMA_BASE_URL}${endpoint}${separator}${params}`
                : `${DECIMA_BASE_URL}${endpoint}`;

            console.log('[Decima] Request:', options.method || 'GET', endpoint);

            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'X-API-Key': this.config.apiKey,
                    ...options.headers,
                },
            });

            console.log('[Decima] Response status:', response.status);

            if (!response.ok) {
                const errorBody = await response.json().catch(() => null);
                const errorMessage = errorBody?.error?.message || `Error ${response.status}: ${response.statusText}`;
                return { success: false, error: errorMessage };
            }

            const payload = await response.json();

            // La API devuelve { data: ..., meta: ... } en éxito
            if (payload && typeof payload === 'object' && 'data' in payload) {
                return { success: true, data: payload.data };
            }

            return { success: true, data: payload };
        } catch (error) {
            console.error('[Decima] Exception:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Error desconocido',
            };
        }
    }

    /**
     * Obtener productos disponibles
     */
    async getProducts(): Promise<DecimaApiResponse<DecimaProduct[]>> {
        return this.request<DecimaProduct[]>('/products');
    }

    /**
     * Obtener lista de órdenes
     */
    async getOrders(filters?: {
        limit?: number;
        status?: string;
        period?: string;
    }): Promise<DecimaApiResponse<DecimaOrder[]>> {
        const queryParams: Record<string, string> = {};
        if (filters?.limit) queryParams.limit = String(filters.limit);
        if (filters?.status) queryParams.status = filters.status;
        if (filters?.period) queryParams.period = filters.period;

        return this.request<DecimaOrder[]>('/orders', {}, queryParams);
    }

    /**
     * Obtener detalle de una orden
     */
    async getOrder(orderId: string): Promise<DecimaApiResponse<DecimaOrder>> {
        return this.request<DecimaOrder>(`/orders/${orderId}`);
    }

    /**
     * Crear una nueva orden
     */
    async createOrder(data: DecimaCreateOrderRequest): Promise<DecimaApiResponse<DecimaOrder>> {
        return this.request<DecimaOrder>('/orders', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * Descargar factura PDF de una orden (disponible cuando la orden es aprobada/confirmada)
     */
    async getOrderInvoice(orderId: string): Promise<{ success: boolean; data?: Buffer; error?: string }> {
        if (!this.config) {
            return { success: false, error: 'Cliente Decima no configurado' };
        }

        try {
            const url = `${DECIMA_BASE_URL}/orders/${orderId}/invoice`;
            console.log('[Decima] Request: GET', `/orders/${orderId}/invoice`);

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'X-API-Key': this.config.apiKey,
                },
            });

            console.log('[Decima] Invoice response status:', response.status);

            if (!response.ok) {
                if (response.status === 404) {
                    return { success: false, error: 'Factura no disponible aún' };
                }
                return { success: false, error: `Error ${response.status}: ${response.statusText}` };
            }

            const arrayBuffer = await response.arrayBuffer();
            return { success: true, data: Buffer.from(arrayBuffer) };
        } catch (error) {
            console.error('[Decima] Invoice exception:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Error desconocido',
            };
        }
    }

    /**
     * Obtener promociones activas, opcionalmente filtradas por código de producto
     */
    async getPromotions(productCode?: string): Promise<DecimaApiResponse<DecimaPromotion[]>> {
        const queryParams: Record<string, string> = {};
        if (productCode) queryParams.productCode = productCode;
        return this.request<DecimaPromotion[]>('/promotions', {}, queryParams);
    }

    /**
     * Probar conexión con la API
     */
    async testConnection(): Promise<DecimaApiResponse<boolean>> {
        const result = await this.getProducts();
        return {
            success: result.success,
            data: result.success,
            error: result.error,
        };
    }
}

// Singleton instance
export const decimaClient = new DecimaClient();

/**
 * Crear cliente con configuración específica
 */
export function createDecimaClient(config: DecimaConfig): DecimaClient {
    const client = new DecimaClient();
    client.setConfig(config);
    return client;
}
