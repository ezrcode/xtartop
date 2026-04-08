const ALLOWED_TAGS = new Set([
    "p",
    "div",
    "span",
    "strong",
    "b",
    "em",
    "i",
    "ul",
    "ol",
    "li",
    "br",
    "img",
]);

const ALIGN_VALUES = new Set(["left", "center", "right", "justify"]);

function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function extractAttribute(attributes: string, name: string) {
    const pattern = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
    const match = attributes.match(pattern);
    return match?.[1] || match?.[2] || match?.[3] || "";
}

function sanitizeUrl(value: string) {
    const trimmed = value.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(trimmed)) return trimmed;
    return "";
}

function sanitizeAlign(value: string) {
    const normalized = value.trim().toLowerCase();
    return ALIGN_VALUES.has(normalized) ? normalized : "";
}

function extractTextAlign(attributes: string) {
    const align = sanitizeAlign(extractAttribute(attributes, "align"));
    if (align) return align;

    const style = extractAttribute(attributes, "style");
    const match = style.match(/text-align\s*:\s*(left|center|right|justify)/i);
    return match ? sanitizeAlign(match[1]) : "";
}

function extractImageStyle(attributes: string) {
    const style = extractAttribute(attributes, "style");
    const textAlign = extractTextAlign(attributes);
    const safeStyles: string[] = ["max-width: 100%", "height: auto"];

    if (/display\s*:\s*block/i.test(style)) {
        safeStyles.push("display: block");
    }

    if (textAlign === "center" || /margin-left\s*:\s*auto/i.test(style) && /margin-right\s*:\s*auto/i.test(style)) {
        safeStyles.push("display: block", "margin-left: auto", "margin-right: auto");
    } else if (textAlign === "right" || /margin-left\s*:\s*auto/i.test(style)) {
        safeStyles.push("display: block", "margin-left: auto", "margin-right: 0");
    } else if (textAlign === "left") {
        safeStyles.push("display: block", "margin-left: 0", "margin-right: auto");
    }

    const widthMatch = style.match(/(?:^|;)\s*width\s*:\s*(\d{1,3})px/i);
    if (widthMatch) {
        const width = Math.min(Math.max(Number(widthMatch[1]), 80), 640);
        safeStyles.push(`width: ${width}px`);
    }

    return Array.from(new Set(safeStyles)).join("; ");
}

export function sanitizeQuoteRichText(html?: string | null) {
    if (!html) return "";

    const withoutDangerousBlocks = html
        .replace(/<\s*(script|style|iframe|object|embed|link|meta)[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
        .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/?>/gi, "");

    return withoutDangerousBlocks.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (rawTag, rawTagName, attributes = "") => {
        const tagName = String(rawTagName).toLowerCase();
        const isClosing = /^<\s*\//.test(rawTag);

        if (!ALLOWED_TAGS.has(tagName)) return "";
        if (isClosing) return tagName === "br" || tagName === "img" ? "" : `</${tagName}>`;
        if (tagName === "br") return "<br />";

        if (tagName === "img") {
            const src = sanitizeUrl(extractAttribute(attributes, "src"));
            if (!src) return "";
            const alt = escapeHtml(extractAttribute(attributes, "alt") || "Imagen de propuesta");
            return `<img src="${escapeHtml(src)}" alt="${alt}" style="${extractImageStyle(attributes)}" />`;
        }

        const textAlign = extractTextAlign(attributes);
        const style = textAlign ? ` style="text-align: ${textAlign}"` : "";
        return `<${tagName}${style}>`;
    });
}

export function normalizeQuoteRichText(value?: string | null) {
    if (!value) return "";
    const hasHtml = /<\/?[a-z][\s\S]*>/i.test(value);
    if (hasHtml) return sanitizeQuoteRichText(value);

    return escapeHtml(value).replace(/\r?\n/g, "<br />");
}
