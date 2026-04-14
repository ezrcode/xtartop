import { PageHeader } from "@/components/ui/page-header";
import { BarChart3, FileSpreadsheet, ArrowRight, LifeBuoy, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { getUserWorkspaceRole } from "@/actions/workspace";

type ReportCard = {
    title: string;
    description: string;
    href: string;
    icon: LucideIcon;
    gradient: string;
    iconColor: string;
};

type ReportGroup = {
    key: "sales" | "customer-success";
    title: string;
    description: string;
    reports: ReportCard[];
};

const reportGroups: ReportGroup[] = [
    {
        key: "sales",
        title: "Administración / Ventas",
        description: "Indicadores y análisis de facturación, cotizaciones y desempeño comercial.",
        reports: [
            {
                title: "Facturación con Detalle",
                description:
                    "Consulta facturas a crédito y proformas desde ADMCloud con filtros avanzados, agrupación por cliente y exportación a Excel.",
                href: "/app/reports/admcloud-documents",
                icon: FileSpreadsheet,
                gradient: "from-ocean-blue/20 to-ocean-blue/5",
                iconColor: "text-ocean-blue",
            },
            {
                title: "Compra de licencias",
                description:
                    "Consulta facturas de proveedor desde ADMCloud por rango de fechas, con tasa de cambio, monto USD/DOP y exportación ejecutiva a Excel.",
                href: "/app/reports/admcloud-license-purchases",
                icon: ShoppingBag,
                gradient: "from-nearby-dark/15 to-nearby-dark/5",
                iconColor: "text-nearby-dark",
            },
        ],
    },
    {
        key: "customer-success",
        title: "Customer Success",
        description: "Analiza operación de soporte, cumplimiento y productividad por cliente y equipo.",
        reports: [
            {
                title: "Activación de licencias",
                description:
                    "Línea de tiempo de activaciones y desactivaciones de usuarios y proyectos por cliente, con resumen ejecutivo y exportación en PDF.",
                href: "/app/reports/customer-success-user-lifecycle",
                icon: LifeBuoy,
                gradient: "from-ocean-blue/20 to-ocean-blue/5",
                iconColor: "text-ocean-blue",
            },
            {
                title: "Tickets Cerrados (ClickUp)",
                description:
                    "Resumen gráfico de tickets cerrados en estado completado, con filtros por fecha, cliente y asignado, y exportación en PDF.",
                href: "/app/reports/customer-success-tickets",
                icon: LifeBuoy,
                gradient: "from-success-green/25 to-success-green/5",
                iconColor: "text-success-green",
            },
        ],
    },
];

export default async function ReportsPage() {
    const userRole = await getUserWorkspaceRole();
    const isMember = userRole?.role === "MEMBER";
    const visibleGroups = reportGroups.filter((group) => !(isMember && group.key === "sales"));

    return (
        <div className="min-h-screen bg-[var(--surface-0)] py-6 sm:py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <PageHeader
                    title="Reportes"
                    description="Consulta y exporta datos de tu operación"
                    icon={BarChart3}
                />

                <div className="space-y-6 sm:space-y-8">
                    {visibleGroups.map((group) => (
                        <section
                            key={group.key}
                            className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4 sm:p-5"
                        >
                            <div className="mb-4">
                                <h2 className="text-base sm:text-lg font-semibold text-[var(--foreground)]">
                                    {group.title}
                                </h2>
                                <p className="text-sm text-[var(--muted-text)] mt-1">{group.description}</p>
                            </div>

                            {group.reports.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {group.reports.map((report) => (
                                        <Link
                                            key={report.href}
                                            href={report.href}
                                            className="group bg-[var(--surface-1)] rounded-lg border border-[var(--card-border)] p-5 hover:shadow-lg transition-all duration-300 hover:border-nearby-dark/30"
                                        >
                                            <div className="flex items-start gap-4">
                                                <div
                                                    className={`w-11 h-11 rounded-lg bg-gradient-to-br ${report.gradient} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300`}
                                                >
                                                    <report.icon size={20} className={report.iconColor} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1 flex items-center gap-2">
                                                        {report.title}
                                                        <ArrowRight
                                                            size={14}
                                                            className="text-[var(--muted-text)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                                                        />
                                                    </h3>
                                                    <p className="text-xs text-[var(--muted-text)] leading-relaxed">
                                                        {report.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed border-[var(--card-border)] bg-[var(--surface-1)] p-4 sm:p-5">
                                    <p className="text-sm text-[var(--muted-text)]">
                                        Próximamente agregaremos informes en este grupo.
                                    </p>
                                </div>
                            )}
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}
