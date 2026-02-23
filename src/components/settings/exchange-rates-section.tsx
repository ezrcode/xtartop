"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import type { ExchangeRate } from "@prisma/client";
import {
    createExchangeRate,
    deleteExchangeRate,
    updateExchangeRate,
    type ExchangeRateState,
} from "@/actions/exchange-rates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface ExchangeRatesSectionProps {
    exchangeRates: ExchangeRate[];
}

function SubmitButton({ children }: { children: React.ReactNode }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} size="sm">
            {pending ? <Loader2 size={14} className="animate-spin" /> : children}
        </Button>
    );
}

function formatDateForInput(date: Date): string {
    return new Date(date).toISOString().split("T")[0];
}

function formatDateForDisplay(date: Date): string {
    return new Intl.DateTimeFormat("es-DO", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date(date));
}

function formatRate(rate: unknown): string {
    const n = Number(rate);
    if (!Number.isFinite(n)) return "-";
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

export function ExchangeRatesSection({ exchangeRates }: ExchangeRatesSectionProps) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const today = useMemo(() => new Date().toISOString().split("T")[0], []);

    const initialState: ExchangeRateState = { message: "", errors: {} };
    const [createState, createAction] = useFormState(createExchangeRate, initialState);

    const latestId = exchangeRates.length > 0 ? exchangeRates[0].id : null;

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        setDeleteError(null);
        const result = await deleteExchangeRate(id);
        if (!result.success) {
            setDeleteError(result.error || "Error al eliminar");
        }
        setDeletingId(null);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Tasa de Cambio</CardTitle>
                    {!showAddForm && (
                        <Button onClick={() => setShowAddForm(true)} size="sm" variant="outline">
                            <Plus size={14} />
                            <span className="hidden sm:inline ml-1">Agregar</span>
                        </Button>
                    )}
                </div>
                <p className="text-sm text-[var(--muted-text)] mt-1">
                    Define y administra tasas de cambio para usarlas en las proformas.
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {showAddForm && (
                    <form action={createAction} className="p-4 border border-[var(--card-border)] rounded-lg bg-[var(--hover-bg)] space-y-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-[var(--foreground)]">Nueva tasa</span>
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="text-[var(--muted-text)] hover:text-[var(--foreground)] p-1"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {createState?.message && !createState.message.includes("exitosamente") && (
                            <div className="p-2 rounded text-sm bg-error-red/10 text-error-red flex items-center gap-2">
                                <AlertCircle size={14} />
                                {createState.message}
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="date" className="text-sm">Fecha *</Label>
                                <Input type="date" name="date" id="date" defaultValue={today} required error={!!createState?.errors?.date} />
                                {createState?.errors?.date && <p className="text-xs text-error-red">{createState.errors.date}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="rate" className="text-sm">Tasa *</Label>
                                <Input type="number" name="rate" id="rate" step="0.0001" min="0.0001" placeholder="Ej: 61.5000" required error={!!createState?.errors?.rate} />
                                {createState?.errors?.rate && <p className="text-xs text-error-red">{createState.errors.rate}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes" className="text-sm">Observaciones</Label>
                            <textarea
                                name="notes"
                                id="notes"
                                rows={2}
                                placeholder="Notas opcionales sobre la tasa"
                                className="w-full px-3 py-2 text-sm border border-[var(--card-border)] rounded-lg bg-[var(--card-bg)] focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors resize-none"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                                Cancelar
                            </Button>
                            <SubmitButton>
                                <Check size={14} className="mr-1" />
                                Guardar
                            </SubmitButton>
                        </div>
                    </form>
                )}

                {deleteError && (
                    <div className="p-3 rounded-lg bg-error-red/10 text-error-red text-sm flex items-center gap-2">
                        <AlertCircle size={16} />
                        {deleteError}
                        <button onClick={() => setDeleteError(null)} className="ml-auto hover:bg-error-red/20 rounded p-1">
                            <X size={14} />
                        </button>
                    </div>
                )}

                {exchangeRates.length === 0 ? (
                    <div className="text-center py-8 text-[var(--muted-text)] text-sm">
                        No hay tasas registradas.
                        <br />
                        <span className="text-xs">Agrega una tasa para que se refleje en la proforma.</span>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {exchangeRates.map((rate) => (
                            <ExchangeRateItem
                                key={rate.id}
                                exchangeRate={rate}
                                isLatest={latestId === rate.id}
                                isEditing={editingId === rate.id}
                                isDeleting={deletingId === rate.id}
                                onEdit={() => setEditingId(rate.id)}
                                onCancelEdit={() => setEditingId(null)}
                                onDelete={() => handleDelete(rate.id)}
                            />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

interface ExchangeRateItemProps {
    exchangeRate: ExchangeRate;
    isLatest: boolean;
    isEditing: boolean;
    isDeleting: boolean;
    onEdit: () => void;
    onCancelEdit: () => void;
    onDelete: () => void;
}

function ExchangeRateItem({
    exchangeRate,
    isLatest,
    isEditing,
    isDeleting,
    onEdit,
    onCancelEdit,
    onDelete,
}: ExchangeRateItemProps) {
    const updateAction = updateExchangeRate.bind(null, exchangeRate.id);
    const initialState: ExchangeRateState = { message: "", errors: {} };
    const [state, action] = useFormState(updateAction, initialState);

    if (isEditing) {
        return (
            <form action={action} className="p-3 border border-nearby-accent rounded-lg bg-nearby-accent/5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <Label htmlFor={`edit-date-${exchangeRate.id}`} className="text-sm">Fecha *</Label>
                        <Input
                            type="date"
                            name="date"
                            id={`edit-date-${exchangeRate.id}`}
                            defaultValue={formatDateForInput(exchangeRate.date)}
                            required
                            error={!!state?.errors?.date}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`edit-rate-${exchangeRate.id}`} className="text-sm">Tasa *</Label>
                        <Input
                            type="number"
                            name="rate"
                            id={`edit-rate-${exchangeRate.id}`}
                            step="0.0001"
                            min="0.0001"
                            defaultValue={Number(exchangeRate.rate).toString()}
                            required
                            error={!!state?.errors?.rate}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor={`edit-notes-${exchangeRate.id}`} className="text-sm">Observaciones</Label>
                    <textarea
                        name="notes"
                        id={`edit-notes-${exchangeRate.id}`}
                        rows={2}
                        defaultValue={exchangeRate.notes || ""}
                        className="w-full px-3 py-2 text-sm border border-[var(--card-border)] rounded-lg bg-[var(--card-bg)] focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors resize-none"
                    />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={onCancelEdit}>
                        Cancelar
                    </Button>
                    <SubmitButton>
                        <Check size={14} className="mr-1" />
                        Guardar
                    </SubmitButton>
                </div>
            </form>
        );
    }

    return (
        <div className="flex items-start justify-between p-3 border border-[var(--card-border)] rounded-lg">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-[var(--foreground)]">
                        {formatDateForDisplay(exchangeRate.date)}
                    </span>
                    {isLatest && (
                        <Badge variant="success" className="text-xs">Más reciente</Badge>
                    )}
                </div>
                <p className="text-sm text-[var(--foreground)] mt-1">
                    Tasa: <span className="font-semibold">{formatRate(exchangeRate.rate)}</span>
                </p>
                {exchangeRate.notes && (
                    <p className="text-xs text-[var(--muted-text)] mt-1 break-words">
                        {exchangeRate.notes}
                    </p>
                )}
            </div>
            <div className="flex items-center gap-1 ml-2">
                <button
                    type="button"
                    onClick={onEdit}
                    className="p-1.5 text-[var(--muted-text)] hover:text-nearby-accent hover:bg-[var(--hover-bg)] rounded transition-colors"
                    title="Editar"
                >
                    <Pencil size={14} />
                </button>
                <button
                    type="button"
                    onClick={onDelete}
                    disabled={isDeleting}
                    className="p-1.5 text-[var(--muted-text)] hover:text-error-red hover:bg-error-red/10 rounded transition-colors disabled:opacity-50"
                    title="Eliminar"
                >
                    {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
            </div>
        </div>
    );
}
