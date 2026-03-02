import { PageHeader } from "@/components/ui/page-header";
import { BarChart3, FileSpreadsheet, ArrowRight } from "lucide-react";
import Link from "next/link";

const reports = [
    {
        title: "Documentos ADMCloud",
        description: "Consulta facturas a crédito y proformas desde ADMCloud con filtros avanzados, agrupación por cliente y exportación a Excel.",
        href: "/app/reports/admcloud-documents",
        icon: FileSpreadsheet,
        gradient: "from-ocean-blue/20 to-ocean-blue/5",
        iconColor: "text-ocean-blue",
    },
];

export default function ReportsPage() {
    return (
        <div className="min-h-screen bg-[var(--surface-0)] py-6 sm:py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <PageHeader
                    title="Reportes"
                    description="Consulta y exporta datos de tu operación"
                    icon={BarChart3}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reports.map((report) => (
                        <Link
                            key={report.href}
                            href={report.href}
                            className="group bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] p-5 hover:shadow-lg transition-all duration-300 hover:border-nearby-accent/30"
                        >
                            <div className="flex items-start gap-4">
                                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${report.gradient} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300`}>
                                    <report.icon size={20} className={report.iconColor} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1 flex items-center gap-2">
                                        {report.title}
                                        <ArrowRight size={14} className="text-[var(--muted-text)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                    </h3>
                                    <p className="text-xs text-[var(--muted-text)] leading-relaxed">
                                        {report.description}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
