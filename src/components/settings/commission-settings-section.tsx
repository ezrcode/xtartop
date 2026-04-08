"use client";

import { useFormState } from "react-dom";
import { Percent, TrendingUp } from "lucide-react";
import { updateCommissionSettings, type CommissionSettingsState } from "@/actions/workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CommissionSettingsSectionProps {
    commissionMarginRate?: unknown;
}

function formatPercent(value: unknown) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "0%";
    return `${numeric.toLocaleString("es-DO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
}

export function CommissionSettingsSection({ commissionMarginRate }: CommissionSettingsSectionProps) {
    const initialState: CommissionSettingsState = { message: "", errors: {} };
    const [state, action] = useFormState(updateCommissionSettings, initialState);
    const currentMargin = Number(commissionMarginRate || 100);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Comisiones</CardTitle>
                <p className="text-sm text-[var(--muted-text)] mt-1">
                    Define qué porcentaje del monto de pago único se convierte en base comisionable al aprobar una cotización.
                </p>
            </CardHeader>
            <CardContent>
                <form action={action} className="space-y-6">
                    {state?.message && (
                        <div className={`rounded-lg px-4 py-3 text-sm ${state.message.includes("exitosamente") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                            {state.message}
                        </div>
                    )}

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.9fr)]">
                        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-nearby-dark/10 text-nearby-dark dark:text-nearby-dark-300">
                                    <Percent size={20} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-sm font-semibold text-[var(--foreground)]">Margen de ganancia para comisión</h3>
                                    <p className="mt-1 text-sm text-[var(--muted-text)]">
                                        La base comisionable se congela usando este porcentaje en el momento exacto en que la cotización pasa a <span className="font-medium text-[var(--foreground)]">Aprobada</span>.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-end">
                                <div className="space-y-2">
                                    <Label htmlFor="commissionMarginRate">Margen (%)</Label>
                                    <Input
                                        id="commissionMarginRate"
                                        name="commissionMarginRate"
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        defaultValue={currentMargin.toString()}
                                        error={!!state?.errors?.commissionMarginRate}
                                    />
                                    {state?.errors?.commissionMarginRate && (
                                        <p className="text-sm text-error-red">{state.errors.commissionMarginRate}</p>
                                    )}
                                </div>

                                <div className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--muted-text)]">
                                    Ejemplo: si una cotización aprobada tiene <span className="font-medium text-[var(--foreground)]">US$1,000</span> en ítems de pago único y el margen es <span className="font-medium text-[var(--foreground)]">40%</span>, la base comisionable congelada será <span className="font-medium text-[var(--foreground)]">US$400</span>.
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-5">
                            <div className="flex items-center gap-2 text-[var(--muted-text)]">
                                <TrendingUp size={16} />
                                <span className="text-xs font-semibold uppercase tracking-[0.16em]">Configuración actual</span>
                            </div>
                            <div className="mt-4">
                                <p className="text-4xl font-bold tracking-tight text-[var(--foreground)]">{formatPercent(currentMargin)}</p>
                                <p className="mt-2 text-sm text-[var(--muted-text)]">
                                    Este valor se usará para todas las aprobaciones nuevas. Las comisiones ya aprobadas conservan su base congelada anterior.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit">Guardar configuración</Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
