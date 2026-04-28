"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface CeoDashboardPdfExportProps {
    targetId: string;
}

function addPageNumbers(pdf: jsPDF) {
    const pageCount = pdf.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
        pdf.setPage(page);
        pdf.setFontSize(8);
        pdf.setTextColor(120, 130, 145);
        pdf.text(`Página ${page} de ${pageCount}`, 196, 290, { align: "right" });
    }
}

const UNSUPPORTED_COLOR_FUNCTIONS = ["oklab(", "oklch(", "lab(", "lch(", "color-mix("];
const COLOR_PROPERTIES = [
    "background",
    "backgroundColor",
    "borderColor",
    "borderTopColor",
    "borderRightColor",
    "borderBottomColor",
    "borderLeftColor",
    "boxShadow",
    "caretColor",
    "color",
    "columnRuleColor",
    "fill",
    "outlineColor",
    "stroke",
] as const;

function hasUnsupportedColor(value: string) {
    const normalized = value.toLowerCase();
    return UNSUPPORTED_COLOR_FUNCTIONS.some((colorFunction) => normalized.includes(colorFunction));
}

function sanitizeUnsupportedColors(sourceRoot: HTMLElement, clonedRoot: HTMLElement) {
    const sourceElements = [sourceRoot, ...Array.from(sourceRoot.querySelectorAll<HTMLElement>("*"))];
    const clonedElements = [clonedRoot, ...Array.from(clonedRoot.querySelectorAll<HTMLElement>("*"))];

    for (let index = 0; index < clonedElements.length; index += 1) {
        const sourceElement = sourceElements[index];
        const clonedElement = clonedElements[index];
        if (!sourceElement || !clonedElement) continue;

        const sourceStyles = window.getComputedStyle(sourceElement);

        for (const property of COLOR_PROPERTIES) {
            const value = sourceStyles[property];
            if (!value || !hasUnsupportedColor(value)) continue;

            if (property === "boxShadow") {
                clonedElement.style.boxShadow = "none";
                continue;
            }

            clonedElement.style[property] = property === "background"
                ? sourceStyles.backgroundColor || "transparent"
                : sourceStyles[property] || "transparent";
        }
    }
}

function prepareCloneForHtml2Canvas(clonedDocument: Document, clonedRoot: HTMLElement) {
    const safeStyle = clonedDocument.createElement("style");
    safeStyle.textContent = `
        .ceo-dashboard-pdf-safe,
        .ceo-dashboard-pdf-safe * {
            background-image: none !important;
            box-shadow: none !important;
            caret-color: #1f2937 !important;
            text-shadow: none !important;
        }

        .ceo-dashboard-pdf-safe *::before,
        .ceo-dashboard-pdf-safe *::after {
            background-image: none !important;
            box-shadow: none !important;
            color: inherit !important;
        }
    `;
    clonedDocument.head.appendChild(safeStyle);
    clonedRoot.classList.add("ceo-dashboard-pdf-safe");

    const allElements = [clonedRoot, ...Array.from(clonedRoot.querySelectorAll<HTMLElement>("*"))];
    const firstSection = clonedRoot.querySelector("section");

    clonedRoot.style.backgroundColor = "#f7f8fb";
    clonedRoot.style.color = "#1f2937";

    for (const element of allElements) {
        const isHeroElement = Boolean(firstSection && (element === firstSection || firstSection.contains(element)));
        const textColor = isHeroElement ? "#ffffff" : "#1f2937";
        const borderColor = isHeroElement ? "rgba(255,255,255,0.18)" : "#d8dee9";

        element.style.backgroundImage = "none";
        element.style.boxShadow = "none";
        element.style.textShadow = "none";
        element.style.color = textColor;
        element.style.borderColor = borderColor;
        element.style.outlineColor = borderColor;
        element.style.fill = "currentColor";
        element.style.stroke = "currentColor";

        if (element === clonedRoot) {
            element.style.backgroundColor = "#f7f8fb";
        } else if (element === firstSection) {
            element.style.backgroundColor = "#0b1420";
        } else {
            element.style.backgroundColor = "transparent";
        }
    }
}

export function CeoDashboardPdfExport({ targetId }: CeoDashboardPdfExportProps) {
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        const target = document.getElementById(targetId);
        if (!target) return;

        setExporting(true);

        try {
            const canvas = await html2canvas(target, {
                scale: 1.5,
                backgroundColor: "#f7f8fb",
                useCORS: true,
                windowWidth: target.scrollWidth,
                windowHeight: target.scrollHeight,
                onclone: (clonedDocument, clonedElement) => {
                    const clonedRoot = clonedElement as HTMLElement;
                    prepareCloneForHtml2Canvas(clonedDocument, clonedRoot);
                    sanitizeUnsupportedColors(target, clonedRoot);
                },
            });

            const imageData = canvas.toDataURL("image/png");
            const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const pageWidth = 210;
            const pageHeight = 297;
            const margin = 8;
            const imageWidth = pageWidth - margin * 2;
            const imageHeight = (canvas.height * imageWidth) / canvas.width;
            let position = margin;
            let heightLeft = imageHeight;

            pdf.addImage(imageData, "PNG", margin, position, imageWidth, imageHeight);
            heightLeft -= pageHeight - margin * 2;

            while (heightLeft > 0) {
                position = heightLeft - imageHeight + margin;
                pdf.addPage();
                pdf.addImage(imageData, "PNG", margin, position, imageWidth, imageHeight);
                heightLeft -= pageHeight - margin * 2;
            }

            addPageNumbers(pdf);
            pdf.save(`Dashboard_CEO_${new Date().toISOString().split("T")[0]}.pdf`);
        } catch (error) {
            console.error("Error exporting CEO dashboard PDF:", error);
            alert("No se pudo generar el PDF del dashboard. Intenta de nuevo.");
        } finally {
            setExporting(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-nearby-dark px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-nearby-dark-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {exporting ? "Generando PDF..." : "Exportar PDF"}
        </button>
    );
}
