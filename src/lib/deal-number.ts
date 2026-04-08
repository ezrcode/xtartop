export const DEAL_NUMBER_PREFIX = "DEC";
export const DEAL_NUMBER_START = 1001;

export function formatDealNumber(number?: number | null) {
    if (typeof number !== "number" || !Number.isFinite(number)) return `${DEAL_NUMBER_PREFIX}-—`;
    return `${DEAL_NUMBER_PREFIX}-${number}`;
}

export function formatQuoteNumber(dealNumber?: number | null, quoteNumber?: number | null) {
    const dealCode = formatDealNumber(dealNumber);
    const quoteCode = typeof quoteNumber === "number" && Number.isFinite(quoteNumber)
        ? String(quoteNumber).padStart(3, "0")
        : "---";
    return `${dealCode}-${quoteCode}`;
}
