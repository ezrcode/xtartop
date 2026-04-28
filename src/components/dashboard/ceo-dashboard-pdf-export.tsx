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
                onclone: (_, clonedElement) => {
                    sanitizeUnsupportedColors(target, clonedElement as HTMLElement);
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
