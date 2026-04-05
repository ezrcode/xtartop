import type { ReactNode } from "react";
import {
    ArrowDownCircle,
    ArrowUpCircle,
    BanknoteArrowDown,
    BanknoteArrowUp,
    Building2,
    CircleAlert,
    CircleDollarSign,
    Coins,
    FileBadge2,
    Landmark,
    Radar,
    ReceiptText,
    ShieldCheck,
    WalletCards,
} from "lucide-react";

export interface CfoDashboardMetricItem {
    label: string;
    amount: number;
    share?: number;
    accent?: string;
    note?: string;
    isCurrent?: boolean;
}

export interface CfoDashboardReceivableItem {
    name: string;
    amount: number;
    typeLabel: string;
    note: string;
}

export interface CfoDashboardProps {
    firstName: string;
    selector?: ReactNode;
    admCloudConfigured: boolean;
    generatedAtLabel: string;
    monthLabel: string;
    previousMonthLabel: string;
    warnings: string[];
    crm: {
        contractualMrr: number;
        arr: number;
        subscriberClients: number;
        oneTimeClients: number;
        prospects: number;
        potentialClients: number;
        activeProjects: number;
        activeUsers: number;
    };
    finance: {
        billedGross: number;
        billedNet: number;
        collected: number;
        openReceivables: number;
        overdueReceivables: number;
        taxes: number;
        deposits: number;
        invoiceCount: number;
        receiptCount: number;
        creditNotes: number;
        debitNotes: number;
        openItems: number;
        collectibleRatio: number;
        billedDelta: number;
        collectedDelta: number;
        recurringBilled: number;
        recurringCollected: number;
        oneTimeBilled: number;
        subscriberReceivables: number;
        subscriberCompaniesWithOpenBalance: number;
        receivablesTop: CfoDashboardReceivableItem[];
        collectionTrend: CfoDashboardMetricItem[];
        paymentTerms: CfoDashboardMetricItem[];
        currencyMix: CfoDashboardMetricItem[];
    };
}

function money(value: number, compact = false) {
    if (compact) {
        if (Math.abs(value) >= 1_000_000) {
            return `US$${(value / 1_000_000).toFixed(1)}M`;
        }
        if (Math.abs(value) >= 1_000) {
            return `US$${(value / 1_000).toFixed(0)}K`;
        }
    }

    return `US$${value.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })}`;
}

function percent(value: number) {
    return `${Math.round(value)}%`;
}

function signedPercent(value: number) {
    const rounded = Math.round(value);
    if (rounded > 0) return `+${rounded}%`;
    return `${rounded}%`;
}

function HeroMetric({
    label,
    value,
    footnote,
    icon: Icon,
    accent,
}: {
    label: string;
    value: string;
    footnote: string;
    icon: typeof CircleDollarSign;
    accent: string;
}) {
    return (
        <article className="relative overflow-hidden rounded-[var(--radius-lg)] border border-white/10 bg-white/6 p-5 backdrop-blur-md">
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">{label}</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
                    <p className="mt-2 text-xs leading-5 text-white/62">{footnote}</p>
                </div>
                <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 text-white shadow-sm"
                    style={{ background: accent }}
                >
                    <Icon size={18} />
                </div>
            </div>
        </article>
    );
}

function MetricStrip({
    label,
    amount,
    reference,
    accent,
    note,
}: {
    label: string;
    amount: number;
    reference: number;
    accent: string;
    note: string;
}) {
    const width = reference > 0 ? Math.max(12, Math.min(100, (amount / reference) * 100)) : 12;

    return (
        <div className="rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted-text)]">{label}</p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{money(amount)}</p>
                    <p className="mt-1 text-xs text-[var(--muted-text)]">{note}</p>
                </div>
                <div className="min-w-[140px] flex-1">
                    <div className="h-3 rounded-full bg-[var(--surface-2)]">
                        <div className="h-3 rounded-full" style={{ width: `${width}%`, background: accent }} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function MixPill({
    item,
    accent,
}: {
    item: CfoDashboardMetricItem;
    accent: string;
}) {
    return (
        <div className="rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{item.label}</p>
                    <p className="mt-1 text-xs text-[var(--muted-text)]">{item.note || "Participación del universo actual"}</p>
                </div>
                <div
                    className="flex h-14 w-14 items-center justify-center rounded-full text-sm font-semibold"
                    style={{
                        background: `conic-gradient(${accent} ${Math.max(8, (item.share || 0) * 3.6)}deg, rgba(148,163,184,0.14) 0deg)`,
                    }}
                >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--card-bg)] text-[var(--foreground)]">
                        {percent(item.share || 0)}
                    </div>
                </div>
            </div>
            <p className="mt-3 text-lg font-semibold text-[var(--foreground)]">{money(item.amount)}</p>
        </div>
    );
}

function EmptyFinanceState({ selector }: { selector?: ReactNode }) {
    return (
        <div className="min-h-screen bg-[var(--surface-0)] py-4 md:py-8">
            <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8 md:space-y-6">
                {selector}
                <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[linear-gradient(160deg,#0b1420,#111b2a)] p-8 text-white shadow-[0_35px_90px_rgba(15,23,42,0.18)]">
                    <div className="max-w-3xl">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/72">
                            <Landmark size={12} />
                            CFO dashboard
                        </span>
                        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                            La capa financiera aún no está conectada al ERP
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                            Esta vista se alimenta de ADMCloud para facturación fiscal, cartera, cobranza y caja.
                            Cuando la integración esté activa, aquí verás el puente entre el negocio SaaS de NEARBY y la realidad contable del ERP.
                        </p>
                        <div className="mt-8 grid gap-4 sm:grid-cols-3">
                            <div className="rounded-[var(--radius-lg)] border border-white/10 bg-white/6 p-4">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">Facturación</p>
                                <p className="mt-2 text-sm text-white/80">Crédito, contado, notas de crédito y débito.</p>
                            </div>
                            <div className="rounded-[var(--radius-lg)] border border-white/10 bg-white/6 p-4">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">Cobranza</p>
                                <p className="mt-2 text-sm text-white/80">Cash receipts, depósitos y resumen de collections.</p>
                            </div>
                            <div className="rounded-[var(--radius-lg)] border border-white/10 bg-white/6 p-4">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">Riesgo</p>
                                <p className="mt-2 text-sm text-white/80">AR abierto, vencido y exposición por cliente.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

export function CfoDashboard(props: CfoDashboardProps) {
    const {
        firstName,
        selector,
        admCloudConfigured,
        generatedAtLabel,
        monthLabel,
        previousMonthLabel,
        warnings,
        crm,
        finance,
    } = props;

    if (!admCloudConfigured) {
        return <EmptyFinanceState selector={selector} />;
    }

    const maxBridge = Math.max(
        crm.contractualMrr,
        finance.recurringBilled,
        finance.recurringCollected,
        finance.oneTimeBilled,
        1
    );
    const collectionReference = Math.max(...finance.collectionTrend.map((item) => item.amount), 1);

    return (
        <div className="min-h-screen bg-[var(--surface-0)] py-4 md:py-8">
            <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8 md:space-y-6">
                {selector}

                <section className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[#182334] bg-[#0a1320] text-white shadow-[0_35px_100px_rgba(15,23,42,0.24)]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_32%),radial-gradient(circle_at_82%_16%,rgba(20,184,166,0.18),transparent_25%),radial-gradient(circle_at_74%_78%,rgba(251,146,60,0.18),transparent_28%),linear-gradient(180deg,rgba(10,19,32,0.98),rgba(7,14,24,1))]" />
                    <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.08fr_0.92fr] lg:p-10">
                        <div className="space-y-6">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/72">
                                    <Landmark size={12} />
                                    CFO dashboard
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/16 bg-emerald-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-100">
                                    <ShieldCheck size={12} />
                                    ERP conectado
                                </span>
                            </div>

                            <div>
                                <p className="text-sm text-white/70">Hola, {firstName}</p>
                                <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                                    Sala de control para facturación, cobranza y exposición
                                </h1>
                                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/66 sm:text-base">
                                    Esta vista cruza el motor SaaS del CRM con la verdad fiscal de ADMCloud para responder
                                    cuánto estamos emitiendo, cuánto estamos convirtiendo en caja y dónde está el riesgo.
                                </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <HeroMetric
                                    label={`${monthLabel} · facturación neta`}
                                    value={money(finance.billedNet)}
                                    footnote={`${finance.invoiceCount} documentos emitidos · ${signedPercent(finance.billedDelta)} vs ${previousMonthLabel}`}
                                    icon={ReceiptText}
                                    accent="linear-gradient(145deg,#2563eb,#60a5fa)"
                                />
                                <HeroMetric
                                    label={`${monthLabel} · cobrado`}
                                    value={money(finance.collected)}
                                    footnote={`${finance.receiptCount} recibos · ${signedPercent(finance.collectedDelta)} vs ${previousMonthLabel}`}
                                    icon={BanknoteArrowDown}
                                    accent="linear-gradient(145deg,#0f766e,#2dd4bf)"
                                />
                                <HeroMetric
                                    label="AR abierto"
                                    value={money(finance.openReceivables)}
                                    footnote={`${finance.openItems} partidas abiertas · ${money(finance.subscriberReceivables, true)} en suscriptores`}
                                    icon={Radar}
                                    accent="linear-gradient(145deg,#c2410c,#fb923c)"
                                />
                                <HeroMetric
                                    label="AR vencido"
                                    value={money(finance.overdueReceivables)}
                                    footnote={`${finance.subscriberCompaniesWithOpenBalance} suscriptores con exposición abierta`}
                                    icon={CircleAlert}
                                    accent="linear-gradient(145deg,#b91c1c,#fb7185)"
                                />
                            </div>
                        </div>

                        <div className="grid gap-4">
                            <div className="rounded-[var(--radius-lg)] border border-white/10 bg-white/6 p-5 backdrop-blur-sm">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">Puente SaaS → ERP</p>
                                <div className="mt-4 space-y-3">
                                    <MetricStrip
                                        label="MRR contractual CRM"
                                        amount={crm.contractualMrr}
                                        reference={maxBridge}
                                        accent="linear-gradient(90deg,#60a5fa,#2563eb)"
                                        note="Lo que el negocio cree que debe facturarse en base contractual."
                                    />
                                    <MetricStrip
                                        label="Recurrente emitido"
                                        amount={finance.recurringBilled}
                                        reference={maxBridge}
                                        accent="linear-gradient(90deg,#f97316,#fb923c)"
                                        note="Lo efectivamente emitido en ADMCloud a clientes suscriptores."
                                    />
                                    <MetricStrip
                                        label="Recurrente cobrado"
                                        amount={finance.recurringCollected}
                                        reference={maxBridge}
                                        accent="linear-gradient(90deg,#14b8a6,#2dd4bf)"
                                        note="Conversión de la facturación recurrente en caja."
                                    />
                                    <MetricStrip
                                        label="One-time emitido"
                                        amount={finance.oneTimeBilled}
                                        reference={maxBridge}
                                        accent="linear-gradient(90deg,#a855f7,#c084fc)"
                                        note="Ingresos no recurrentes emitidos durante el período."
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="rounded-[var(--radius-lg)] border border-white/10 bg-white/6 p-4 backdrop-blur-sm">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">Impuestos facturados</p>
                                    <p className="mt-2 text-2xl font-semibold text-white">{money(finance.taxes)}</p>
                                    <p className="mt-1 text-xs text-white/56">Carga fiscal emitida en el mes</p>
                                </div>
                                <div className="rounded-[var(--radius-lg)] border border-white/10 bg-white/6 p-4 backdrop-blur-sm">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">Depósitos</p>
                                    <p className="mt-2 text-2xl font-semibold text-white">{money(finance.deposits)}</p>
                                    <p className="mt-1 text-xs text-white/56">Caja ya consolidada en bancos</p>
                                </div>
                                <div className="rounded-[var(--radius-lg)] border border-white/10 bg-white/6 p-4 backdrop-blur-sm">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">Efectividad de cobro</p>
                                    <p className="mt-2 text-2xl font-semibold text-white">{percent(finance.collectibleRatio)}</p>
                                    <p className="mt-1 text-xs text-white/56">Cobrado / facturación neta del período</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {warnings.length > 0 && (
                    <section className="rounded-[var(--radius-lg)] border border-amber-200/50 bg-amber-50/80 p-4 text-amber-900 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                        <div className="flex items-start gap-3">
                            <CircleAlert className="mt-0.5 shrink-0" size={18} />
                            <div>
                                <p className="text-sm font-semibold">Lectura financiera parcial</p>
                                <ul className="mt-2 space-y-1 text-sm leading-6">
                                    {warnings.map((warning) => (
                                        <li key={warning}>{warning}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </section>
                )}

                <section className="grid gap-5 lg:grid-cols-[1.18fr_0.82fr]">
                    <article className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[linear-gradient(180deg,var(--card-bg),var(--surface-1))] shadow-sm">
                        <div className="border-b border-[var(--card-border)] p-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted-text)]">Cobranza y liquidez</p>
                                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                                        Ritmo de caja y pulso de collections
                                    </h2>
                                </div>
                                <div className="rounded-full border border-[var(--card-border)] bg-[var(--surface-1)] px-3 py-1 text-xs text-[var(--muted-text)]">
                                    Corte: {generatedAtLabel}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 p-6">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                {finance.collectionTrend.map((item, index) => {
                                    const height = collectionReference > 0 ? Math.max(20, Math.round((item.amount / collectionReference) * 160)) : 20;
                                    const gradient = item.isCurrent
                                        ? "linear-gradient(180deg,#2dd4bf,#0f766e)"
                                        : "linear-gradient(180deg,#60a5fa,#1d4ed8)";

                                    return (
                                        <div key={item.label} className="rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--surface-1)] p-4">
                                            <div className="flex items-end justify-between gap-3">
                                                <div>
                                                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-text)]">{item.label}</p>
                                                    <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">{money(item.amount)}</p>
                                                </div>
                                                <div className="flex h-44 items-end">
                                                    <div
                                                        className="w-14 rounded-t-[24px]"
                                                        style={{
                                                            height,
                                                            background: gradient,
                                                            boxShadow: item.isCurrent
                                                                ? "0 20px 50px rgba(20,184,166,0.28)"
                                                                : "0 20px 50px rgba(37,99,235,0.22)",
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <p className="mt-3 text-xs text-[var(--muted-text)]">
                                                {index === finance.collectionTrend.length - 1 ? "Mes en curso" : "Mes consolidado"}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--surface-1)] p-4">
                                    <div className="flex items-center gap-2 text-[var(--foreground)]">
                                        <BanknoteArrowUp size={18} className="text-emerald-500" />
                                        <p className="text-sm font-medium">Notas de débito</p>
                                    </div>
                                    <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]">{finance.debitNotes}</p>
                                    <p className="mt-1 text-xs text-[var(--muted-text)]">Ajustes positivos emitidos en el período.</p>
                                </div>
                                <div className="rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--surface-1)] p-4">
                                    <div className="flex items-center gap-2 text-[var(--foreground)]">
                                        <ArrowDownCircle size={18} className="text-rose-500" />
                                        <p className="text-sm font-medium">Notas de crédito</p>
                                    </div>
                                    <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]">{finance.creditNotes}</p>
                                    <p className="mt-1 text-xs text-[var(--muted-text)]">Señales de reversa, ajuste o descuento fiscal.</p>
                                </div>
                                <div className="rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--surface-1)] p-4">
                                    <div className="flex items-center gap-2 text-[var(--foreground)]">
                                        <WalletCards size={18} className="text-sky-500" />
                                        <p className="text-sm font-medium">ARR contractual</p>
                                    </div>
                                    <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]">{money(crm.arr, true)}</p>
                                    <p className="mt-1 text-xs text-[var(--muted-text)]">Pulso anualizado del negocio suscriptor actual.</p>
                                </div>
                            </div>
                        </div>
                    </article>

                    <article className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[linear-gradient(180deg,var(--card-bg),var(--surface-1))] shadow-sm">
                        <div className="border-b border-[var(--card-border)] p-6">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted-text)]">Riesgo de cartera</p>
                            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                                Concentración y exposición
                            </h2>
                        </div>

                        <div className="space-y-4 p-6">
                            {finance.receivablesTop.length === 0 ? (
                                <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--card-border)] bg-[var(--surface-1)] p-6 text-sm text-[var(--muted-text)]">
                                    No se encontraron partidas abiertas con saldo al corte.
                                </div>
                            ) : (
                                finance.receivablesTop.map((item, index) => (
                                    <div key={`${item.name}-${index}`} className="rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--surface-1)] p-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-semibold text-[var(--foreground)]">{item.name}</p>
                                                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted-text)]">{item.typeLabel}</p>
                                                <p className="mt-2 text-xs text-[var(--muted-text)]">{item.note}</p>
                                            </div>
                                            <p className="text-lg font-semibold text-[var(--foreground)]">{money(item.amount)}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </article>
                </section>

                <section className="grid gap-5 lg:grid-cols-[0.98fr_1.02fr]">
                    <article className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[linear-gradient(180deg,var(--card-bg),var(--surface-1))] shadow-sm">
                        <div className="border-b border-[var(--card-border)] p-6">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted-text)]">Composición financiera</p>
                            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                                Términos de pago y mix de moneda
                            </h2>
                        </div>

                        <div className="grid gap-5 p-6">
                            <div>
                                <div className="mb-3 flex items-center gap-2">
                                    <Coins size={18} className="text-sky-500" />
                                    <p className="text-sm font-medium text-[var(--foreground)]">Monedas facturadas</p>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {finance.currencyMix.length === 0 ? (
                                        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--card-border)] bg-[var(--surface-1)] p-4 text-sm text-[var(--muted-text)]">
                                            Sin mezcla de moneda disponible.
                                        </div>
                                    ) : (
                                        finance.currencyMix.map((item, index) => (
                                            <MixPill key={`${item.label}-${index}`} item={item} accent={index % 2 === 0 ? "#2563eb" : "#14b8a6"} />
                                        ))
                                    )}
                                </div>
                            </div>

                            <div>
                                <div className="mb-3 flex items-center gap-2">
                                    <Building2 size={18} className="text-violet-500" />
                                    <p className="text-sm font-medium text-[var(--foreground)]">Términos de pago con saldo</p>
                                </div>
                                <div className="space-y-3">
                                    {finance.paymentTerms.length === 0 ? (
                                        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--card-border)] bg-[var(--surface-1)] p-4 text-sm text-[var(--muted-text)]">
                                            No hay balance abierto agrupable por término.
                                        </div>
                                    ) : (
                                        finance.paymentTerms.map((item, index) => (
                                            <div key={`${item.label}-${index}`} className="rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--surface-1)] p-4">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div>
                                                        <p className="text-sm font-medium text-[var(--foreground)]">{item.label}</p>
                                                        <p className="mt-1 text-xs text-[var(--muted-text)]">{percent(item.share || 0)} de la cartera abierta</p>
                                                    </div>
                                                    <p className="text-lg font-semibold text-[var(--foreground)]">{money(item.amount)}</p>
                                                </div>
                                                <div className="mt-3 h-2 rounded-full bg-[var(--surface-2)]">
                                                    <div
                                                        className="h-2 rounded-full bg-[linear-gradient(90deg,#8b5cf6,#c084fc)]"
                                                        style={{ width: `${Math.max(8, item.share || 0)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </article>

                    <article className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[linear-gradient(180deg,var(--card-bg),var(--surface-1))] shadow-sm">
                        <div className="border-b border-[var(--card-border)] p-6">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted-text)]">Disciplina operativa</p>
                            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                                Señales que debería seguir el CFO
                            </h2>
                        </div>

                        <div className="grid gap-4 p-6 sm:grid-cols-2">
                            <div className="rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--surface-1)] p-5">
                                <div className="flex items-center gap-2 text-[var(--foreground)]">
                                    <FileBadge2 size={18} className="text-sky-500" />
                                    <p className="text-sm font-medium">Actividad documental</p>
                                </div>
                                <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">{finance.invoiceCount}</p>
                                <p className="mt-1 text-xs text-[var(--muted-text)]">
                                    Facturas emitidas en {monthLabel}. Recibos: {finance.receiptCount}.
                                </p>
                            </div>
                            <div className="rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--surface-1)] p-5">
                                <div className="flex items-center gap-2 text-[var(--foreground)]">
                                    <Landmark size={18} className="text-emerald-500" />
                                    <p className="text-sm font-medium">Base SaaS actual</p>
                                </div>
                                <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">{crm.subscriberClients}</p>
                                <p className="mt-1 text-xs text-[var(--muted-text)]">
                                    Suscriptores · {crm.oneTimeClients} one-time · {crm.prospects + crm.potentialClients} futuros.
                                </p>
                            </div>
                            <div className="rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--surface-1)] p-5">
                                <div className="flex items-center gap-2 text-[var(--foreground)]">
                                    <ArrowUpCircle size={18} className="text-orange-500" />
                                    <p className="text-sm font-medium">Footprint licenciado</p>
                                </div>
                                <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">{crm.activeUsers + crm.activeProjects}</p>
                                <p className="mt-1 text-xs text-[var(--muted-text)]">
                                    {crm.activeUsers} usuarios activos · {crm.activeProjects} proyectos activos.
                                </p>
                            </div>
                            <div className="rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--surface-1)] p-5">
                                <div className="flex items-center gap-2 text-[var(--foreground)]">
                                    <BanknoteArrowDown size={18} className="text-emerald-500" />
                                    <p className="text-sm font-medium">Conversión del período</p>
                                </div>
                                <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">{percent(finance.collectibleRatio)}</p>
                                <p className="mt-1 text-xs text-[var(--muted-text)]">
                                    Qué proporción de lo emitido en {monthLabel} ya se convirtió en cobro.
                                </p>
                            </div>
                        </div>
                    </article>
                </section>
            </div>
        </div>
    );
}
