"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  createTax,
  deleteTax,
  toggleTaxActive,
  updateTax,
  type TaxState,
} from "@/actions/taxes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type TaxItem = {
  id: string;
  name: string;
  rate: unknown;
  isActive: boolean;
};

interface TaxesSectionProps {
  taxes: TaxItem[];
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm">
      {pending ? <Loader2 size={14} className="animate-spin" /> : children}
    </Button>
  );
}

function formatRate(rate: unknown) {
  const value = Number(rate);
  if (!Number.isFinite(value)) return "-";
  return `${value.toLocaleString("es-DO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
}

export function TaxesSection({ taxes }: TaxesSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const initialState: TaxState = { message: "", errors: {} };
  const [createState, createAction] = useFormState(createTax, initialState);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setDeleteError(null);
    const result = await deleteTax(id);
    if (!result.success) {
      setDeleteError(result.error || "Error al eliminar");
    }
    setDeletingId(null);
  };

  const handleToggle = async (id: string) => {
    setTogglingId(id);
    await toggleTaxActive(id);
    setTogglingId(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Impuestos</CardTitle>
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} size="sm" variant="outline">
              <Plus size={14} />
              <span className="hidden sm:inline ml-1">Agregar</span>
            </Button>
          )}
        </div>
        <p className="text-sm text-[var(--muted-text)] mt-1">
          Configura los impuestos disponibles para usarlos en cotizaciones con desglose fiscal en pantalla y PDF.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAddForm && (
          <form action={createAction} className="p-4 border border-[var(--card-border)] rounded-lg bg-[var(--hover-bg)] space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--foreground)]">Nuevo impuesto</span>
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
                <Label htmlFor="tax-name" className="text-sm">Nombre *</Label>
                <Input id="tax-name" name="name" type="text" placeholder="ITBIS" required error={!!createState?.errors?.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax-rate" className="text-sm">Porcentaje *</Label>
                <Input id="tax-rate" name="rate" type="number" step="0.01" min="0.01" placeholder="18" required error={!!createState?.errors?.rate} />
              </div>
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

        {taxes.length === 0 ? (
          <div className="text-center py-8 text-[var(--muted-text)] text-sm">
            No hay impuestos configurados.
            <br />
            <span className="text-xs">Agrega al menos uno para habilitar el desglose fiscal en cotizaciones.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {taxes.map((tax) => (
              <TaxItemRow
                key={tax.id}
                tax={tax}
                isEditing={editingId === tax.id}
                isDeleting={deletingId === tax.id}
                isToggling={togglingId === tax.id}
                onEdit={() => setEditingId(tax.id)}
                onCancelEdit={() => setEditingId(null)}
                onDelete={() => handleDelete(tax.id)}
                onToggle={() => handleToggle(tax.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TaxItemRow({
  tax,
  isEditing,
  isDeleting,
  isToggling,
  onEdit,
  onCancelEdit,
  onDelete,
  onToggle,
}: {
  tax: TaxItem;
  isEditing: boolean;
  isDeleting: boolean;
  isToggling: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const updateAction = updateTax.bind(null, tax.id);
  const initialState: TaxState = { message: "", errors: {} };
  const [state, action] = useFormState(updateAction, initialState);

  if (isEditing) {
    return (
      <form action={action} className="p-3 border border-nearby-dark/30 rounded-lg bg-nearby-dark/5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`edit-tax-name-${tax.id}`} className="text-sm">Nombre *</Label>
            <Input id={`edit-tax-name-${tax.id}`} name="name" type="text" defaultValue={tax.name} required error={!!state?.errors?.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-tax-rate-${tax.id}`} className="text-sm">Porcentaje *</Label>
            <Input id={`edit-tax-rate-${tax.id}`} name="rate" type="number" step="0.01" min="0.01" defaultValue={Number(tax.rate).toString()} required error={!!state?.errors?.rate} />
          </div>
        </div>

        <input type="hidden" name="isActive" value={tax.isActive ? "true" : "false"} />

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
    <div className="p-3 border border-[var(--card-border)] rounded-lg bg-[var(--card-bg)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-[var(--foreground)]">{tax.name}</p>
            <Badge variant={tax.isActive ? "default" : "secondary"}>
              {tax.isActive ? "Activo" : "Inactivo"}
            </Badge>
          </div>
          <p className="text-sm text-[var(--muted-text)] mt-1">
            Se cobrará <span className="font-semibold text-[var(--foreground)]">{formatRate(tax.rate)}</span> sobre la base imponible incluida en la cotización.
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" onClick={onToggle} disabled={isToggling} className="h-8 w-8">
            {isToggling ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8">
            <Pencil size={14} />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onDelete} disabled={isDeleting} className="h-8 w-8 text-error-red hover:text-error-red">
            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
