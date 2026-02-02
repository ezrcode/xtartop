/**
 * Utilidades de formateo para números, monedas y fechas
 */

/**
 * Formatea un número como moneda con separador de miles
 * @param amount - El monto a formatear
 * @param currency - El código de moneda (default: USD)
 * @param locale - El locale para formateo (default: es-DO para República Dominicana)
 * @returns String formateado como moneda
 */
export function formatCurrency(
    amount: number | string,
    currency: string = "USD",
    locale: string = "en-US"
): string {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) return "$0.00";
    
    try {
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(numAmount);
    } catch {
        // Fallback si el currency no es válido
        return `${currency} ${formatNumber(numAmount, 2)}`;
    }
}

/**
 * Formatea un número con separador de miles
 * @param value - El número a formatear
 * @param decimals - Cantidad de decimales (default: 0)
 * @param locale - El locale para formateo (default: en-US)
 * @returns String formateado con separador de miles
 */
export function formatNumber(
    value: number | string,
    decimals: number = 0,
    locale: string = "en-US"
): string {
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    
    if (isNaN(numValue)) return "0";
    
    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(numValue);
}

/**
 * Formatea un monto simple con símbolo de dólar y separador de miles
 * @param amount - El monto a formatear
 * @returns String formateado como $X,XXX.XX
 */
export function formatMoney(amount: number | string): string {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) return "$0.00";
    
    return `$${formatNumber(numAmount, 2)}`;
}

/**
 * Formatea una cantidad entera con separador de miles
 * @param quantity - La cantidad a formatear
 * @returns String formateado con separador de miles
 */
export function formatQuantity(quantity: number | string): string {
    const numQuantity = typeof quantity === "string" ? parseInt(quantity) : quantity;
    
    if (isNaN(numQuantity)) return "0";
    
    return formatNumber(numQuantity, 0);
}
