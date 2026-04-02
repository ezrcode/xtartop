import Link from "next/link";
import {
    ArrowUpRight,
    BriefcaseBusiness,
    Building2,
    CircleDollarSign,
    Compass,
    FolderOpen,
    Radar,
    Repeat2,
    Sparkles,
    Target,
    TrendingUp,
    Trophy,
    UserCheck,
    Users,
    Waypoints,
} from "lucide-react";

interface PipelineItem {
    status: string;
    label: string;
    count: number;
    value: number;
}

interface ExecutiveDashboardProps {
    firstName: string;
    stats: {
        allCompaniesCount: number;
        clientCompaniesCount: number;
        contactsCount: number;
        dealsCount: number;
        activeProjects: number;
        activeClientUsers: number;
        mrr: number;
        arr: number;
        pipeline: number;
    };
    pipeline: PipelineItem[];
}

const OPEN_STATUSES = ["PROSPECCION", "CALIFICACION", "NEGOCIACION", "FORMALIZACION"];

const STAGE_STYLES: Record<string, { background: string; border: string; text: string }> = {
    PROSPECCION: {
        background: "linear-gradient(155deg, rgba(71,85,105,0.90), rgba(15,23,42,0.92))",
        border: "rgba(148,163,184,0.26)",
        text: "#e2e8f0",
    },
    CALIFICACION: {
        background: "linear-gradient(155deg, rgba(29,78,216,0.90), rgba(15,23,42,0.92))",
        border: "rgba(96,165,250,0.32)",
        text: "#dbeafe",
    },
    NEGOCIACION: {
        background: "linear-gradient(155deg, rgba(234,88,12,0.88), rgba(15,23,42,0.94))",
        border: "rgba(251,146,60,0.34)",
        text: "#ffedd5",
    },
    FORMALIZACION: {
        background: "linear-gradient(155deg, rgba(109,40,217,0.90), rgba(15,23,42,0.94))",
        border: "rgba(196,181,253,0.34)",
        text: "#ede9fe",
    },
};

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

function SignalCard({
    label,
    value,
    footnote,
    icon: Icon,
    accent,
}: {
    label: string;
    value: string;
    footnote: string;
    icon: typeof Building2;
    accent: string;
}) {
    return (
        <article className="group relative overflow-hidden rounded-[30px] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition-transform duration-300 hover:-translate-y-1">
            <div
                className="absolute inset-x-0 top-0 h-1.5"
                style={{ background: accent }}
            />
            <div className="absolute right-[-22px] top-[-22px] h-28 w-28 rounded-full bg-white/5 blur-2xl" />
            <div className="relative flex items-start justify-between gap-4">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted-text)]">{label}</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">{value}</p>
                    <p className="mt-2 text-xs leading-5 text-[var(--muted-text)]">{footnote}</p>
                </div>
                <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-white shadow-sm"
                    style={{
                        background: accent,
                        borderColor: "rgba(255,255,255,0.16)",
                    }}
                >
                    <Icon size={20} />
                </div>
            </div>
        </article>
    );
}

function HaloPanel({
    label,
    value,
    accent,
    detail,
}: {
    label: string;
    value: number;
    accent: string;
    detail: string;
}) {
    const safeValue = Math.max(0, Math.min(100, value));

    return (
        <div className="rounded-[28px] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-text)]">{label}</p>
                    <p className="mt-2 max-w-[14rem] text-sm leading-6 text-[var(--muted-text)]">{detail}</p>
                </div>
                <div
                    className="relative flex h-28 w-28 items-center justify-center rounded-full"
                    style={{
                        background: `conic-gradient(${accent} ${safeValue * 3.6}deg, rgba(148,163,184,0.12) 0deg)`,
                    }}
                >
                    <div className="absolute inset-[10px] rounded-full bg-[var(--card-bg)]" />
                    <div className="relative text-center">
                        <p className="text-2xl font-semibold text-[var(--foreground)]">{Math.round(safeValue)}%</p>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted-text)]">Score</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function ExecutiveDashboard({ firstName, stats, pipeline }: ExecutiveDashboardProps) {
    const subscriberBase = stats.clientCompaniesCount || 0;
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
    const subscriberShare = stats.allCompaniesCount > 0 ? (stats.clientCompaniesCount / stats.allCompaniesCount) * 100 : 0;
    const revenuePerSubscriber = subscriberBase > 0 ? stats.mrr / subscriberBase : 0;
    const usersPerSubscriber = subscriberBase > 0 ? stats.activeClientUsers / subscriberBase : 0;
    const projectsPerSubscriber = subscriberBase > 0 ? stats.activeProjects / subscriberBase : 0;
    const contactsPerSubscriber = subscriberBase > 0 ? stats.contactsCount / subscriberBase : 0;
    const dealsPerSubscriber = subscriberBase > 0 ? stats.dealsCount / subscriberBase : 0;
    const licenseFootprint = stats.activeProjects + stats.activeClientUsers;
    const revenuePerLicense = licenseFootprint > 0 ? stats.mrr / licenseFootprint : 0;
    const pipelineCoverage = stats.mrr > 0 ? stats.pipeline / stats.mrr : 0;
    const projectMix = licenseFootprint > 0 ? (stats.activeProjects / licenseFootprint) * 100 : 0;
    const userMix = licenseFootprint > 0 ? (stats.activeClientUsers / licenseFootprint) * 100 : 0;
    const focusStages = [...openPipeline].sort((a, b) => b.value - a.value || b.count - a.count);

    return (
        <div className="min-h-screen bg-[var(--surface-0)] py-4 md:py-8">
            <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8 md:space-y-6">
                <section className="relative overflow-hidden rounded-[36px] border border-[#1a2430] bg-[#0b1420] text-white shadow-[0_35px_100px_rgba(15,23,42,0.28)]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(252,90,52,0.24),transparent_32%),radial-gradient(circle_at_84%_18%,rgba(59,130,246,0.24),transparent_28%),radial-gradient(circle_at_78%_82%,rgba(20,184,166,0.22),transparent_26%),linear-gradient(180deg,rgba(11,20,32,0.98),rgba(8,13,22,0.98))]" />
                    <div className="absolute left-1/2 top-[12%] h-64 w-64 -translate-x-1/2 rounded-full border border-white/6 bg-white/5 blur-3xl" />
                    <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.08fr_0.92fr] lg:p-10">
                        <div className="space-y-6">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/76">
                                    <Sparkles size={12} />
                                    CEO / CFO dashboard
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/16 bg-emerald-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-100">
                                    <CircleDollarSign size={12} />
                                    Recurrent business
                                </span>
                            </div>

                            <div>
                                <p className="text-sm text-white/70">Hola, {firstName}</p>
                                <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                                    Centro de mando para ingresos, base activa y cierres
                                </h1>
                                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/66 sm:text-base">
                                    Una lectura de socios sobre la operación que ya paga, la capacidad de expansión de la cartera
                                    y la calidad del pipeline que debería convertirse en ingresos futuros.
                                </p>
                            </div>

                            <div>
                                <p className="text-[11px] uppercase tracking-[0.22em] text-white/52">MRR consolidado</p>
                                <div className="mt-3 flex items-end gap-3">
                                    <span className="text-5xl font-semibold tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                                        {formatCurrency(stats.mrr)}
                                    </span>
                                    <span className="pb-2 text-sm text-white/58">ingreso recurrente mensual</span>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-4 backdrop-blur-sm">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">ARR</p>
                                    <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(stats.arr, true)}</p>
                                    <p className="mt-1 text-xs text-white/56">ritmo anualizado actual</p>
                                </div>
                                <div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-4 backdrop-blur-sm">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">Pipeline abierto</p>
                                    <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(stats.pipeline, true)}</p>
                                    <p className="mt-1 text-xs text-white/56">{openOpportunityCount} frentes comerciales abiertos</p>
                                </div>
                                <div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-4 backdrop-blur-sm">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">Penetración suscriptora</p>
                                    <p className="mt-2 text-2xl font-semibold text-white">{Math.round(subscriberShare)}%</p>
                                    <p className="mt-1 text-xs text-white/56">{stats.clientCompaniesCount} de {stats.allCompaniesCount} empresas</p>
                                </div>
                            </div>
                        </div>

                        <div className="relative flex min-h-[320px] items-center justify-center lg:min-h-[360px]">
                            <div className="relative h-[320px] w-[320px] sm:h-[360px] sm:w-[360px]">
                                <div className="absolute inset-0 rounded-full border border-white/10 bg-[conic-gradient(from_120deg,rgba(252,90,52,0.28),rgba(59,130,246,0.18),rgba(20,184,166,0.18),rgba(252,90,52,0.28))] blur-[1px]" />
                                <div className="absolute inset-[18px] rounded-full border border-white/10 bg-[#0c1623]" />
                                <div className="absolute inset-[52px] rounded-full border border-white/8" />
                                <div className="absolute inset-[88px] flex flex-col items-center justify-center rounded-full bg-[#09121d] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/48">Cadencia anual</p>
                                    <p className="mt-3 text-4xl font-semibold text-white">{formatCurrency(stats.arr, true)}</p>
                                    <p className="mt-2 text-xs text-white/54">motor recurrente actual</p>
                                </div>

                                <div className="absolute left-[-8px] top-[22px] rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
                                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">MRR por cliente</p>
                                    <p className="mt-1 text-xl font-semibold text-white">{formatCurrency(revenuePerSubscriber)}</p>
                                </div>
                                <div className="absolute right-[-6px] top-[90px] rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
                                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">Win rate</p>
                                    <p className="mt-1 text-xl font-semibold text-white">{Math.round(winRate)}%</p>
                                </div>
                                <div className="absolute left-[18px] bottom-[18px] rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
                                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">Cobertura pipeline</p>
                                    <p className="mt-1 text-xl font-semibold text-white">{formatRatio(pipelineCoverage)}</p>
                                    <p className="mt-1 text-[11px] text-white/52">pipeline / MRR</p>
                                </div>
                                <div className="absolute right-[18px] bottom-[14px] rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
                                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">Capital relacional</p>
                                    <p className="mt-1 text-xl font-semibold text-white">{stats.contactsCount.toLocaleString()}</p>
                                    <p className="mt-1 text-[11px] text-white/52">contactos en cartera</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <SignalCard
                        label="Clientes suscriptores"
                        value={stats.clientCompaniesCount.toLocaleString()}
                        footnote={`${Math.round(subscriberShare)}% de la base empresarial ya es recurrente`}
                        icon={Building2}
                        accent="linear-gradient(145deg,#2d3e50,#42576f)"
                    />
                    <SignalCard
                        label="Proyectos activos"
                        value={stats.activeProjects.toLocaleString()}
                        footnote={`${formatMetric(projectsPerSubscriber)} proyectos por cliente suscriptor`}
                        icon={FolderOpen}
                        accent="linear-gradient(145deg,#1d4ed8,#60a5fa)"
                    />
                    <SignalCard
                        label="Usuarios activos"
                        value={stats.activeClientUsers.toLocaleString()}
                        footnote={`${formatMetric(usersPerSubscriber)} usuarios por cliente suscriptor`}
                        icon={UserCheck}
                        accent="linear-gradient(145deg,#0f766e,#2dd4bf)"
                    />
                    <SignalCard
                        label="MRR"
                        value={formatCurrency(stats.mrr)}
                        footnote={`${formatCurrency(revenuePerSubscriber)} por cliente recurrente`}
                        icon={Repeat2}
                        accent="linear-gradient(145deg,#fc5a34,#fb923c)"
                    />
                </section>

                <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                    <div className="rounded-[32px] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm sm:p-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-text)]">Executive posture</p>
                                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                                    Captura, densidad y monetización de la cartera
                                </h2>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-text)]">
                                    Señales compuestas para entender cuánto de la base ya se monetiza, cuánta profundidad tiene la relación con clientes y qué tan eficiente es el ingreso sobre la huella licenciada.
                                </p>
                            </div>
                            <Link
                                href="/app/companies"
                                className="inline-flex items-center gap-2 self-start rounded-full border border-[var(--card-border)] bg-[var(--surface-1)] px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm"
                            >
                                Ver clientes
                                <ArrowUpRight size={16} />
                            </Link>
                        </div>

                        <div className="mt-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                            <div className="rounded-[28px] border border-[var(--card-border)] bg-[linear-gradient(155deg,var(--surface-1),var(--surface-2))] p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-text)]">Base monetizada</p>
                                        <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]">Penetración suscriptora</h3>
                                    </div>
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-nearby-dark/10 text-nearby-dark dark:bg-nearby-dark-300/10 dark:text-nearby-dark-300">
                                        <Compass size={18} />
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
                                    <div
                                        className="relative flex h-36 w-36 items-center justify-center rounded-full"
                                        style={{
                                            background: `conic-gradient(#fc5a34 ${subscriberShare * 3.6}deg, rgba(148,163,184,0.14) 0deg)`,
                                        }}
                                    >
                                        <div className="absolute inset-[12px] rounded-full bg-[var(--card-bg)]" />
                                        <div className="relative text-center">
                                            <p className="text-3xl font-semibold text-[var(--foreground)]">{Math.round(subscriberShare)}%</p>
                                            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted-text)]">suscrita</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="rounded-[22px] border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-4">
                                            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted-text)]">Empresas recurrentes</p>
                                            <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{stats.clientCompaniesCount}</p>
                                        </div>
                                        <div className="rounded-[22px] border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-4">
                                            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted-text)]">Base total de empresas</p>
                                            <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{stats.allCompaniesCount}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="rounded-[28px] border border-[var(--card-border)] bg-[var(--surface-1)] p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-text)]">Capital comercial</p>
                                            <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]">Capilaridad de cartera</h3>
                                        </div>
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500">
                                            <Users size={18} />
                                        </div>
                                    </div>
                                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                        <div className="rounded-[22px] border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-4">
                                            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted-text)]">Contactos</p>
                                            <p className="mt-1 text-3xl font-semibold text-[var(--foreground)]">{stats.contactsCount.toLocaleString()}</p>
                                            <p className="mt-1 text-xs text-[var(--muted-text)]">{formatMetric(contactsPerSubscriber)} por cliente suscriptor</p>
                                        </div>
                                        <div className="rounded-[22px] border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-4">
                                            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted-text)]">Negocios</p>
                                            <p className="mt-1 text-3xl font-semibold text-[var(--foreground)]">{stats.dealsCount.toLocaleString()}</p>
                                            <p className="mt-1 text-xs text-[var(--muted-text)]">{formatMetric(dealsPerSubscriber)} por cliente suscriptor</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-[28px] border border-[var(--card-border)] bg-[linear-gradient(155deg,var(--surface-1),var(--surface-2))] p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-text)]">Unit economics</p>
                                            <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]">Palanca de monetización</h3>
                                        </div>
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                                            <Target size={18} />
                                        </div>
                                    </div>
                                    <div className="mt-5 space-y-3">
                                        <div className="flex items-center justify-between rounded-[22px] border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-4">
                                            <div>
                                                <p className="text-sm font-medium text-[var(--foreground)]">Ingreso por licencia activa</p>
                                                <p className="text-xs text-[var(--muted-text)]">MRR distribuido sobre usuarios + proyectos</p>
                                            </div>
                                            <span className="text-xl font-semibold text-[var(--foreground)]">{formatCurrency(revenuePerLicense)}</span>
                                        </div>
                                        <div className="flex items-center justify-between rounded-[22px] border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-4">
                                            <div>
                                                <p className="text-sm font-medium text-[var(--foreground)]">Huella licenciada por cliente</p>
                                                <p className="text-xs text-[var(--muted-text)]">Promedio de activos en cartera suscriptora</p>
                                            </div>
                                            <span className="text-xl font-semibold text-[var(--foreground)]">{formatMetric(usersPerSubscriber + projectsPerSubscriber)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <HaloPanel
                            label="Win rate"
                            value={winRate}
                            accent="#10b981"
                            detail="Relación entre cierres ganados y perdidos dentro del histórico comercial." 
                        />
                        <HaloPanel
                            label="Late-stage share"
                            value={lateStageShare}
                            accent="#fc5a34"
                            detail="Peso de negociación y formalización dentro del pipeline actualmente abierto." 
                        />

                        <div className="rounded-[30px] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm sm:p-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500">
                                    <Waypoints size={20} />
                                </div>
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-text)]">Mix activo</p>
                                    <h3 className="text-xl font-semibold text-[var(--foreground)]">Composición de licencias</h3>
                                </div>
                            </div>
                            <div className="mt-5 space-y-4">
                                <div>
                                    <div className="mb-2 flex items-center justify-between text-sm text-[var(--foreground)]">
                                        <span>Usuarios</span>
                                        <span>{stats.activeClientUsers.toLocaleString()}</span>
                                    </div>
                                    <div className="h-3 overflow-hidden rounded-full bg-[var(--surface-1)]">
                                        <div
                                            className="h-full rounded-full bg-[linear-gradient(90deg,#14b8a6,#5eead4)]"
                                            style={{ width: `${licenseFootprint > 0 ? Math.max(userMix, 8) : 0}%` }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <div className="mb-2 flex items-center justify-between text-sm text-[var(--foreground)]">
                                        <span>Proyectos</span>
                                        <span>{stats.activeProjects.toLocaleString()}</span>
                                    </div>
                                    <div className="h-3 overflow-hidden rounded-full bg-[var(--surface-1)]">
                                        <div
                                            className="h-full rounded-full bg-[linear-gradient(90deg,#3b82f6,#93c5fd)]"
                                            style={{ width: `${licenseFootprint > 0 ? Math.max(projectMix, 8) : 0}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-5 grid grid-cols-2 gap-3">
                                <div className="rounded-[22px] border border-[var(--card-border)] bg-[var(--surface-1)] px-4 py-4">
                                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted-text)]">Usuarios / cliente</p>
                                    <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{formatMetric(usersPerSubscriber)}</p>
                                </div>
                                <div className="rounded-[22px] border border-[var(--card-border)] bg-[var(--surface-1)] px-4 py-4">
                                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted-text)]">Proyectos / cliente</p>
                                    <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{formatMetric(projectsPerSubscriber)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid gap-5 lg:grid-cols-[1.16fr_0.84fr]">
                    <div className="rounded-[32px] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm sm:p-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-text)]">Pipeline theater</p>
                                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Dónde está la energía comercial real</h2>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-text)]">
                                    Lectura no lineal del pipeline abierto, priorizando peso económico, concentración de valor y cercanía de cierre.
                                </p>
                            </div>
                            <Link
                                href="/app/deals"
                                className="inline-flex items-center gap-2 self-start rounded-full border border-[var(--card-border)] bg-[var(--surface-1)] px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm"
                            >
                                Ver negocios
                                <ArrowUpRight size={16} />
                            </Link>
                        </div>

                        <div className="mt-6 grid gap-3 md:grid-cols-2">
                            {focusStages.length === 0 ? (
                                <div className="md:col-span-2 rounded-[26px] border border-dashed border-[var(--card-border)] bg-[var(--surface-1)] px-5 py-12 text-center text-sm text-[var(--muted-text)]">
                                    No hay pipeline abierto en este momento.
                                </div>
                            ) : (
                                focusStages.map((stage, index) => {
                                    const share = stats.pipeline > 0 ? (stage.value / stats.pipeline) * 100 : 0;
                                    const style = STAGE_STYLES[stage.status] || STAGE_STYLES.PROSPECCION;

                                    return (
                                        <article
                                            key={stage.status}
                                            className={`relative overflow-hidden rounded-[28px] border p-5 shadow-[0_20px_36px_rgba(15,23,42,0.18)] ${
                                                index === 0 ? "min-h-[220px] md:col-span-2" : "min-h-[176px]"
                                            }`}
                                            style={{
                                                background: style.background,
                                                borderColor: style.border,
                                                color: style.text,
                                            }}
                                        >
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_30%)]" />
                                            <div className="relative flex h-full flex-col justify-between gap-5">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/58">{stage.label}</p>
                                                        <p className="mt-3 text-3xl font-semibold text-white">
                                                            {formatCurrency(stage.value, true)}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-2xl border border-white/12 bg-black/10 px-3 py-2 text-right backdrop-blur-sm">
                                                        <p className="text-[10px] uppercase tracking-[0.16em] text-white/48">Frentes</p>
                                                        <p className="mt-1 text-xl font-semibold text-white">{stage.count}</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="h-2.5 overflow-hidden rounded-full bg-black/14">
                                                        <div className="h-full rounded-full bg-white/90" style={{ width: `${Math.max(share, 6)}%` }} />
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs text-white/66">
                                                        <span>{Math.round(share)}% del pipeline abierto</span>
                                                        <span>{stage.count === 1 ? "1 oportunidad" : `${stage.count} oportunidades`}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="rounded-[32px] border border-[var(--card-border)] bg-[linear-gradient(155deg,var(--surface-1),var(--surface-2))] p-5 shadow-sm sm:p-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-nearby-accent/10 text-nearby-accent">
                                    <Radar size={20} />
                                </div>
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-text)]">Board signals</p>
                                    <h3 className="text-xl font-semibold text-[var(--foreground)]">Pulso de cierre</h3>
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-2 gap-3">
                                <div className="rounded-[22px] border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-4">
                                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted-text)]">Ganados</p>
                                    <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{wonStage?.count || 0}</p>
                                    <p className="mt-1 text-xs text-[var(--muted-text)]">{formatCurrency(wonStage?.value || 0, true)}</p>
                                </div>
                                <div className="rounded-[22px] border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-4">
                                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted-text)]">Perdidos</p>
                                    <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{lostStage?.count || 0}</p>
                                    <p className="mt-1 text-xs text-[var(--muted-text)]">{formatCurrency(lostStage?.value || 0, true)}</p>
                                </div>
                            </div>

                            <div className="mt-4 space-y-3">
                                <div className="rounded-[22px] border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-medium text-[var(--foreground)]">Presión de cierre</p>
                                            <p className="text-xs text-[var(--muted-text)]">
                                                {lateStageCount > 0
                                                    ? `${lateStageCount} negocios concentran ${formatCurrency(lateStageValue, true)} en tramo final.`
                                                    : "No hay negocios en negociación o formalización todavía."}
                                            </p>
                                        </div>
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-warning-amber/10 text-warning-amber">
                                            <TrendingUp size={18} />
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-[22px] border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-medium text-[var(--foreground)]">Cobertura comercial</p>
                                            <p className="text-xs text-[var(--muted-text)]">
                                                {openOpportunityCount > 0
                                                    ? `${openOpportunityCount} oportunidades sostienen una cobertura de ${formatRatio(pipelineCoverage)} sobre el MRR actual.`
                                                    : "Sin pipeline activo en este momento."}
                                            </p>
                                        </div>
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-success-green/10 text-success-green">
                                            <BriefcaseBusiness size={18} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-[32px] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm sm:p-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                                    <Trophy size={20} />
                                </div>
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-text)]">Partner takeaway</p>
                                    <h3 className="text-xl font-semibold text-[var(--foreground)]">Lo que importa mirar</h3>
                                </div>
                            </div>
                            <div className="mt-5 space-y-3">
                                <div className="rounded-[22px] border border-[var(--card-border)] bg-[var(--surface-1)] px-4 py-4">
                                    <p className="text-sm font-medium text-[var(--foreground)]">Motor recurrente</p>
                                    <p className="mt-1 text-xs leading-6 text-[var(--muted-text)]">
                                        {subscriberBase > 0
                                            ? `${stats.clientCompaniesCount} clientes sostienen ${formatCurrency(stats.mrr)} de MRR con un ticket medio de ${formatCurrency(revenuePerSubscriber)}.`
                                            : "Todavía no hay base suscriptora activa para medir ingresos recurrentes."}
                                    </p>
                                </div>
                                <div className="rounded-[22px] border border-[var(--card-border)] bg-[var(--surface-1)] px-4 py-4">
                                    <p className="text-sm font-medium text-[var(--foreground)]">Escala operativa</p>
                                    <p className="mt-1 text-xs leading-6 text-[var(--muted-text)]">
                                        {licenseFootprint > 0
                                            ? `La huella activa es de ${licenseFootprint.toLocaleString()} licencias, con ${Math.round(userMix)}% concentrado en usuarios y ${Math.round(projectMix)}% en proyectos.`
                                            : "Aún no hay licencias activas para analizar la huella operativa."}
                                    </p>
                                </div>
                                <div className="rounded-[22px] border border-[var(--card-border)] bg-[var(--surface-1)] px-4 py-4">
                                    <p className="text-sm font-medium text-[var(--foreground)]">Tensión comercial</p>
                                    <p className="mt-1 text-xs leading-6 text-[var(--muted-text)]">
                                        {stats.pipeline > 0
                                            ? `El pipeline abierto suma ${formatCurrency(stats.pipeline, true)} y el ${Math.round(lateStageShare)}% ya está en negociación o formalización.`
                                            : "No hay pipeline abierto; conviene concentrar la vista en expansión de la base existente."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
