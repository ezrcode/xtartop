"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";

interface PipelineItem {
    status: string;
    label: string;
    count: number;
    value: number;
}

interface CeoDashboardStats {
    clientCompaniesCount: number;
    oneTimeClientsCount: number;
    prospectsCount: number;
    potentialClientsCount: number;
    contactsCount: number;
    activeProjects: number;
    activeClientUsers: number;
    mrr: number;
    arr: number;
    pipeline: number;
}

interface CeoDashboardPdfExportProps {
    firstName: string;
    stats: CeoDashboardStats;
    pipeline: PipelineItem[];
}

const OPEN_STATUSES = ["PROSPECCION", "CALIFICACION", "NEGOCIACION", "FORMALIZACION"];

function formatCurrency(value: number, compact = false) {
    if (compact) {
        if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
        if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    }

    return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatMetric(value: number) {
    if (!Number.isFinite(value)) return "0.0";
    if (value >= 100) return value.toFixed(0);
    return value.toFixed(1);
}

function formatRatio(value: number) {
    if (!Number.isFinite(value)) return "0.0x";
    return `${value.toFixed(value >= 10 ? 1 : 2)}x`;
}

function formatPercent(value: number) {
    if (!Number.isFinite(value)) return "0%";
    return `${Math.round(value)}%`;
}

function formatDateTime(date: Date) {
    return date.toLocaleString("es-DO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
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

function addHeader(pdf: jsPDF, title: string, subtitle: string) {
    pdf.setFillColor(11, 20, 32);
    pdf.rect(0, 0, 210, 28, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.text(title, 14, 13);
    pdf.setFontSize(9);
    pdf.setTextColor(210, 220, 235);
    pdf.text(subtitle, 14, 21);
}

function addSectionTitle(pdf: jsPDF, title: string, y: number) {
    pdf.setTextColor(31, 41, 55);
    pdf.setFontSize(12);
    pdf.text(title, 14, y);
    pdf.setDrawColor(216, 222, 233);
    pdf.line(14, y + 3, 196, y + 3);
}

function addMetricCard(pdf: jsPDF, x: number, y: number, width: number, label: string, value: string, note: string) {
    pdf.setFillColor(247, 248, 251);
    pdf.setDrawColor(216, 222, 233);
    pdf.roundedRect(x, y, width, 24, 2, 2, "FD");
    pdf.setTextColor(95, 110, 130);
    pdf.setFontSize(7);
    pdf.text(label.toUpperCase(), x + 4, y + 7);
    pdf.setTextColor(31, 41, 55);
    pdf.setFontSize(13);
    pdf.text(value, x + 4, y + 15);
    pdf.setTextColor(95, 110, 130);
    pdf.setFontSize(7);
    pdf.text(note.slice(0, 44), x + 4, y + 21);
}

function addTableRow(pdf: jsPDF, y: number, values: string[], widths: number[], header = false) {
    let x = 14;
    if (header) {
        pdf.setFillColor(237, 241, 247);
        pdf.rect(14, y - 5, 182, 8, "F");
        pdf.setTextColor(31, 41, 55);
        pdf.setFontSize(8);
    } else {
        pdf.setTextColor(75, 85, 99);
        pdf.setFontSize(8);
    }

    values.forEach((value, index) => {
        pdf.text(value, x, y);
        x += widths[index];
    });
}

export function CeoDashboardPdfExport({ firstName, stats, pipeline }: CeoDashboardPdfExportProps) {
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);

        try {
            const generatedAt = new Date();
            const subscriberBase = stats.clientCompaniesCount || 0;
            const clientBase = stats.clientCompaniesCount + stats.oneTimeClientsCount;
            const futureClientPool = stats.prospectsCount + stats.potentialClientsCount;
            const openPipeline = pipeline.filter((item) => OPEN_STATUSES.includes(item.status));
            const wonStage = pipeline.find((item) => item.status === "CIERRE_GANADO");
            const lostStage = pipeline.find((item) => item.status === "CIERRE_PERDIDO");
            const openOpportunityCount = openPipeline.reduce((acc, item) => acc + item.count, 0);
            const lateStageValue = openPipeline
                .filter((item) => item.status === "NEGOCIACION" || item.status === "FORMALIZACION")
                .reduce((acc, item) => acc + item.value, 0);
            const lateStageCount = openPipeline
                .filter((item) => item.status === "NEGOCIACION" || item.status === "FORMALIZACION")
                .reduce((acc, item) => acc + item.count, 0);
            const closeUniverse = (wonStage?.count || 0) + (lostStage?.count || 0);
            const winRate = closeUniverse > 0 ? ((wonStage?.count || 0) / closeUniverse) * 100 : 0;
            const lateStageShare = stats.pipeline > 0 ? (lateStageValue / stats.pipeline) * 100 : 0;
            const subscriberShare = clientBase > 0 ? (stats.clientCompaniesCount / clientBase) * 100 : 0;
            const oneTimeShare = clientBase > 0 ? (stats.oneTimeClientsCount / clientBase) * 100 : 0;
            const revenuePerSubscriber = subscriberBase > 0 ? stats.mrr / subscriberBase : 0;
            const usersPerSubscriber = subscriberBase > 0 ? stats.activeClientUsers / subscriberBase : 0;
            const projectsPerSubscriber = subscriberBase > 0 ? stats.activeProjects / subscriberBase : 0;
            const contactsPerSubscriber = subscriberBase > 0 ? stats.contactsCount / subscriberBase : 0;
            const licenseFootprint = stats.activeProjects + stats.activeClientUsers;
            const revenuePerLicense = licenseFootprint > 0 ? stats.mrr / licenseFootprint : 0;
            const pipelineCoverage = stats.mrr > 0 ? stats.pipeline / stats.mrr : 0;
            const futureCoverage = clientBase > 0 ? futureClientPool / clientBase : 0;
            const projectMix = licenseFootprint > 0 ? (stats.activeProjects / licenseFootprint) * 100 : 0;
            const userMix = licenseFootprint > 0 ? (stats.activeClientUsers / licenseFootprint) * 100 : 0;
            const focusStages = [...openPipeline].sort((a, b) => b.value - a.value || b.count - a.count);

            const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            addHeader(pdf, "Dashboard CEO", `Hola, ${firstName} · Generado ${formatDateTime(generatedAt)}`);

            addSectionTitle(pdf, "Resumen ejecutivo", 40);
            addMetricCard(pdf, 14, 48, 56, "MRR consolidado", formatCurrency(stats.mrr), "Ingreso recurrente mensual");
            addMetricCard(pdf, 77, 48, 56, "ARR", formatCurrency(stats.arr, true), "Ritmo anualizado actual");
            addMetricCard(pdf, 140, 48, 56, "Pipeline abierto", formatCurrency(stats.pipeline, true), `${openOpportunityCount} oportunidades abiertas`);
            addMetricCard(pdf, 14, 78, 56, "Base de clientes", clientBase.toLocaleString(), `${stats.clientCompaniesCount} recurrentes · ${stats.oneTimeClientsCount} one-time`);
            addMetricCard(pdf, 77, 78, 56, "Win rate", formatPercent(winRate), "Ganados sobre ganados + perdidos");
            addMetricCard(pdf, 140, 78, 56, "Cobertura pipeline", formatRatio(pipelineCoverage), "Pipeline abierto / MRR");

            addSectionTitle(pdf, "Base activa y monetización", 116);
            addMetricCard(pdf, 14, 124, 56, "Clientes suscriptores", stats.clientCompaniesCount.toLocaleString(), `${formatPercent(subscriberShare)} de la base`);
            addMetricCard(pdf, 77, 124, 56, "Proyectos activos", stats.activeProjects.toLocaleString(), `${formatMetric(projectsPerSubscriber)} por suscriptor`);
            addMetricCard(pdf, 140, 124, 56, "Usuarios activos", stats.activeClientUsers.toLocaleString(), `${formatMetric(usersPerSubscriber)} por suscriptor`);
            addMetricCard(pdf, 14, 154, 56, "MRR por cliente", formatCurrency(revenuePerSubscriber), "Ticket medio recurrente");
            addMetricCard(pdf, 77, 154, 56, "Ingreso por licencia", formatCurrency(revenuePerLicense), "MRR / usuarios + proyectos");
            addMetricCard(pdf, 140, 154, 56, "Huella licenciada", licenseFootprint.toLocaleString(), `${formatPercent(userMix)} usuarios · ${formatPercent(projectMix)} proyectos`);

            addSectionTitle(pdf, "Cartera futura", 192);
            addMetricCard(pdf, 14, 200, 56, "Prospectos", stats.prospectsCount.toLocaleString(), "Entrada temprana del embudo");
            addMetricCard(pdf, 77, 200, 56, "Potenciales", stats.potentialClientsCount.toLocaleString(), "Más cerca de convertirse");
            addMetricCard(pdf, 140, 200, 56, "Cobertura futura", formatRatio(futureCoverage), "Prospectos + potenciales / clientes");
            addMetricCard(pdf, 14, 230, 56, "Capital relacional", stats.contactsCount.toLocaleString(), `${formatMetric(contactsPerSubscriber)} contactos por suscriptor`);
            addMetricCard(pdf, 77, 230, 56, "Clientes one-time", stats.oneTimeClientsCount.toLocaleString(), `${formatPercent(oneTimeShare)} de la base`);
            addMetricCard(pdf, 140, 230, 56, "Cartera futura", futureClientPool.toLocaleString(), "Prospectos + potenciales");

            pdf.addPage();
            addHeader(pdf, "Dashboard CEO", "Pipeline comercial y señales de cierre");
            addSectionTitle(pdf, "Pipeline por etapa abierta", 40);
            addTableRow(pdf, 52, ["Etapa", "Oportunidades", "Valor", "% pipeline"], [62, 38, 42, 30], true);

            let y = 64;
            for (const stage of focusStages) {
                const share = stats.pipeline > 0 ? (stage.value / stats.pipeline) * 100 : 0;
                addTableRow(pdf, y, [
                    stage.label,
                    stage.count.toLocaleString(),
                    formatCurrency(stage.value, true),
                    formatPercent(share),
                ], [62, 38, 42, 30]);
                y += 10;
            }

            if (focusStages.length === 0) {
                pdf.setTextColor(95, 110, 130);
                pdf.setFontSize(9);
                pdf.text("No hay pipeline abierto en este momento.", 14, y);
                y += 10;
            }

            addSectionTitle(pdf, "Pulso de cierre", Math.max(y + 10, 118));
            const closeY = Math.max(y + 18, 126);
            addMetricCard(pdf, 14, closeY, 56, "Ganados", String(wonStage?.count || 0), formatCurrency(wonStage?.value || 0, true));
            addMetricCard(pdf, 77, closeY, 56, "Perdidos", String(lostStage?.count || 0), formatCurrency(lostStage?.value || 0, true));
            addMetricCard(pdf, 140, closeY, 56, "Late-stage share", formatPercent(lateStageShare), `${lateStageCount} negocios en tramo final`);

            addSectionTitle(pdf, "Lectura ejecutiva", closeY + 44);
            pdf.setFontSize(9);
            pdf.setTextColor(75, 85, 99);
            const notes = [
                subscriberBase > 0
                    ? `${stats.clientCompaniesCount} clientes suscriptores sostienen ${formatCurrency(stats.mrr)} de MRR con un ticket medio de ${formatCurrency(revenuePerSubscriber)}.`
                    : "Todavía no hay base suscriptora activa para medir ingresos recurrentes.",
                licenseFootprint > 0
                    ? `La huella activa es de ${licenseFootprint.toLocaleString()} licencias: ${formatPercent(userMix)} usuarios y ${formatPercent(projectMix)} proyectos.`
                    : "Aún no hay licencias activas para analizar la huella operativa.",
                futureClientPool > 0
                    ? `${futureClientPool} empresas están en prospecto o potencial, mientras el pipeline abierto suma ${formatCurrency(stats.pipeline, true)}.`
                    : stats.pipeline > 0
                        ? `El pipeline abierto suma ${formatCurrency(stats.pipeline, true)} y el ${formatPercent(lateStageShare)} ya está en negociación o formalización.`
                        : "No hay prospectos, potenciales ni pipeline abierto; conviene concentrar la vista en expansión de la base existente.",
            ];
            let noteY = closeY + 56;
            for (const note of notes) {
                const lines = pdf.splitTextToSize(note, 178);
                pdf.text(lines, 14, noteY);
                noteY += lines.length * 5 + 4;
            }

            addPageNumbers(pdf);
            pdf.save(`Dashboard_CEO_${generatedAt.toISOString().split("T")[0]}.pdf`);
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
