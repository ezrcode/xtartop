"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import {
    createProjectRateReference,
    deleteProjectRateReference,
    toggleProjectRateReferenceActive,
    updateProjectRateReference,
    type ProjectRateReferenceState,
} from "@/actions/project-rate-references";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type ProjectRateReferenceItem = {
    id: string;
    name: string;
    category?: string | null;
    description?: string | null;
    unit: "POR_HORA" | "POR_PROYECTO" | "PAQUETE";
    hourlyRate?: unknown;
    referenceHours?: number | null;
    fixedPrice?: unknown;
    notes?: string | null;
    isActive: boolean;
};

interface ProjectRateReferencesSectionProps {
    projectRateReferences: ProjectRateReferenceItem[];
}

function SubmitButton({ children }: { children: React.ReactNode }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} size="sm">
            {pending ? <Loader2 size={14} className="animate-spin" /> : children}
        </Button>
    );
}

function asMoney(value: unknown): string {
    const n = Number(value);
    if (!Number.isFinite(n)) return "-";
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n);
}

function unitLabel(unit: "POR_HORA" | "POR_PROYECTO" | "PAQUETE"): string {
    if (unit === "POR_HORA") return "Por hora";
    if (unit === "POR_PROYECTO") return "Por proyecto";
    return "Paquete";
}

export function ProjectRateReferencesSection({ projectRateReferences }: ProjectRateReferencesSectionProps) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const initialState: ProjectRateReferenceState = { message: "", errors: {} };
    const [createState, createAction] = useFormState(createProjectRateReference, initialState);

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        setDeleteError(null);
        const result = await deleteProjectRateReference(id);
        if (!result.success) {
            setDeleteError(result.error || "Error al eliminar");
        }
        setDeletingId(null);
    };

    const handleToggle = async (id: string) => {
        setTogglingId(id);
        await toggleProjectRateReferenceActive(id);
        setTogglingId(null);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Tarifario Referencial</CardTitle>
                    {!showAddForm && (
                        <Button onClick={() => setShowAddForm(true)} size="sm" variant="outline">
                            <Plus size={14} />
                            <span className="hidden sm:inline ml-1">Agregar</span>
                        </Button>
                    )}
                </div>
                <p className="text-sm text-[var(--muted-text)] mt-1">
                    Catálogo referencial para ventas. Se muestra en cotizaciones como guía, sin reemplazar el texto libre de la propuesta.
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {showAddForm && (
                    <form action={createAction} className="p-4 border border-[var(--card-border)] rounded-lg bg-[var(--hover-bg)] space-y-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-[var(--foreground)]">Nueva referencia</span>
                            <button type="button" onClick={() => setShowAddForm(false)} className="text-[var(--muted-text)] hover:text-[var(--foreground)] p-1">
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
                                <Label htmlFor="ref-name" className="text-sm">Nombre *</Label>
                                <Input id="ref-name" name="name" type="text" placeholder="Proyecto de implementación estándar" required error={!!createState?.errors?.name} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ref-category" className="text-sm">Categoría</Label>
                                <Input id="ref-category" name="category" type="text" placeholder="Implementación, Soporte, Integración..." />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="ref-unit" className="text-sm">Unidad</Label>
                                <select id="ref-unit" name="unit" defaultValue="POR_HORA" className="w-full px-3 py-2 text-sm border border-[var(--card-border)] rounded-lg bg-[var(--card-bg)]">
                                    <option value="POR_HORA">Por hora</option>
                                    <option value="POR_PROYECTO">Por proyecto</option>
                                    <option value="PAQUETE">Paquete</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ref-hourlyRate" className="text-sm">Tarifa por hora (USD)</Label>
                                <Input id="ref-hourlyRate" name="hourlyRate" type="number" step="0.01" min="0" placeholder="35.00" error={!!createState?.errors?.hourlyRate} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ref-referenceHours" className="text-sm">Horas referenciales</Label>
                                <Input id="ref-referenceHours" name="referenceHours" type="number" step="1" min="0" placeholder="20" error={!!createState?.errors?.referenceHours} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="ref-fixedPrice" className="text-sm">Precio fijo (USD)</Label>
                                <Input id="ref-fixedPrice" name="fixedPrice" type="number" step="0.01" min="0" placeholder="700.00" error={!!createState?.errors?.fixedPrice} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ref-description" className="text-sm">Descripción</Label>
                                <Input id="ref-description" name="description" type="text" placeholder="Alcance comercial resumido" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="ref-notes" className="text-sm">Notas</Label>
                            <textarea id="ref-notes" name="notes" rows={2} placeholder="Supuestos, exclusiones o condiciones comerciales" className="w-full px-3 py-2 text-sm border border-[var(--card-border)] rounded-lg bg-[var(--card-bg)] resize-none" />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(false)}>Cancelar</Button>
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

                {projectRateReferences.length === 0 ? (
                    <div className="text-center py-8 text-[var(--muted-text)] text-sm">
                        No hay referencias configuradas.
                        <br />
                        <span className="text-xs">Agrega referencias para ayudar al equipo comercial a cotizar más rápido.</span>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {projectRateReferences.map((reference) => (
                            <ProjectRateReferenceItemRow
                                key={reference.id}
                                reference={reference}
                                isEditing={editingId === reference.id}
                                isDeleting={deletingId === reference.id}
                                isToggling={togglingId === reference.id}
                                onEdit={() => setEditingId(reference.id)}
                                onCancelEdit={() => setEditingId(null)}
                                onDelete={() => handleDelete(reference.id)}
                                onToggle={() => handleToggle(reference.id)}
                            />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function ProjectRateReferenceItemRow({
    reference,
    isEditing,
    isDeleting,
    isToggling,
    onEdit,
    onCancelEdit,
    onDelete,
    onToggle,
}: {
    reference: ProjectRateReferenceItem;
    isEditing: boolean;
    isDeleting: boolean;
    isToggling: boolean;
    onEdit: () => void;
    onCancelEdit: () => void;
    onDelete: () => void;
    onToggle: () => void;
}) {
    const updateAction = updateProjectRateReference.bind(null, reference.id);
    const initialState: ProjectRateReferenceState = { message: "", errors: {} };
    const [state, action] = useFormState(updateAction, initialState);

    if (isEditing) {
        return (
            <form action={action} className="p-3 border border-nearby-dark/30 rounded-lg bg-nearby-dark/5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <Label htmlFor={`edit-name-${reference.id}`} className="text-sm">Nombre *</Label>
                        <Input id={`edit-name-${reference.id}`} name="name" type="text" defaultValue={reference.name} required error={!!state?.errors?.name} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`edit-category-${reference.id}`} className="text-sm">Categoría</Label>
                        <Input id={`edit-category-${reference.id}`} name="category" type="text" defaultValue={reference.category || ""} />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-2">
                        <Label htmlFor={`edit-unit-${reference.id}`} className="text-sm">Unidad</Label>
                        <select id={`edit-unit-${reference.id}`} name="unit" defaultValue={reference.unit} className="w-full px-3 py-2 text-sm border border-[var(--card-border)] rounded-lg bg-[var(--card-bg)]">
                            <option value="POR_HORA">Por hora</option>
                            <option value="POR_PROYECTO">Por proyecto</option>
                            <option value="PAQUETE">Paquete</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`edit-hourlyRate-${reference.id}`} className="text-sm">Tarifa por hora (USD)</Label>
                        <Input id={`edit-hourlyRate-${reference.id}`} name="hourlyRate" type="number" step="0.01" min="0" defaultValue={reference.hourlyRate ? Number(reference.hourlyRate).toString() : ""} error={!!state?.errors?.hourlyRate} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`edit-referenceHours-${reference.id}`} className="text-sm">Horas referenciales</Label>
                        <Input id={`edit-referenceHours-${reference.id}`} name="referenceHours" type="number" step="1" min="0" defaultValue={reference.referenceHours || ""} error={!!state?.errors?.referenceHours} />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <Label htmlFor={`edit-fixedPrice-${reference.id}`} className="text-sm">Precio fijo (USD)</Label>
                        <Input id={`edit-fixedPrice-${reference.id}`} name="fixedPrice" type="number" step="0.01" min="0" defaultValue={reference.fixedPrice ? Number(reference.fixedPrice).toString() : ""} error={!!state?.errors?.fixedPrice} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`edit-description-${reference.id}`} className="text-sm">Descripción</Label>
                        <Input id={`edit-description-${reference.id}`} name="description" type="text" defaultValue={reference.description || ""} />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor={`edit-notes-${reference.id}`} className="text-sm">Notas</Label>
                    <textarea id={`edit-notes-${reference.id}`} name="notes" rows={2} defaultValue={reference.notes || ""} className="w-full px-3 py-2 text-sm border border-[var(--card-border)] rounded-lg bg-[var(--card-bg)] resize-none" />
                </div>

                <input type="hidden" name="isActive" value={reference.isActive ? "true" : "false"} />

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={onCancelEdit}>Cancelar</Button>
                    <SubmitButton>
                        <Check size={14} className="mr-1" />
                        Guardar
                    </SubmitButton>
                </div>
            </form>
        );
    }

    const hourlyRate = Number(reference.hourlyRate || 0);
    const hours = Number(reference.referenceHours || 0);
    const estimatedTotal = hourlyRate > 0 && hours > 0 ? hourlyRate * hours : null;

    return (
        <div className={`p-3 border border-[var(--card-border)] rounded-lg ${!reference.isActive ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-[var(--foreground)]">{reference.name}</span>
                        <Badge variant={reference.isActive ? "success" : "secondary"} className="text-xs">
                            {reference.isActive ? "Activa" : "Inactiva"}
                        </Badge>
                        <Badge variant="info" className="text-xs">{unitLabel(reference.unit)}</Badge>
                        {reference.category && <Badge variant="secondary" className="text-xs">{reference.category}</Badge>}
                    </div>
                    <div className="mt-1 text-xs text-[var(--muted-text)] space-y-0.5">
                        {reference.description && <p>{reference.description}</p>}
                        <p>
                            Tarifa/hora: <span className="font-medium text-[var(--foreground)]">{asMoney(reference.hourlyRate)}</span>
                            {" • "}
                            Horas ref.: <span className="font-medium text-[var(--foreground)]">{reference.referenceHours || "-"}</span>
                            {" • "}
                            Precio fijo: <span className="font-medium text-[var(--foreground)]">{asMoney(reference.fixedPrice)}</span>
                        </p>
                        {estimatedTotal !== null && (
                            <p>
                                Estimado ({hours}h):{" "}
                                <span className="font-semibold text-nearby-dark dark:text-nearby-dark-300">{asMoney(estimatedTotal)}</span>
                            </p>
                        )}
                        {reference.notes && <p>Notas: {reference.notes}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button type="button" onClick={onToggle} disabled={isToggling} className="p-1.5 text-[var(--muted-text)] hover:text-[var(--foreground)] hover:bg-[var(--hover-bg)] rounded transition-colors disabled:opacity-50" title={reference.isActive ? "Desactivar" : "Activar"}>
                        {isToggling ? <Loader2 size={14} className="animate-spin" /> : reference.isActive ? <X size={14} /> : <Check size={14} />}
                    </button>
                    <button type="button" onClick={onEdit} className="p-1.5 text-[var(--muted-text)] hover:text-[var(--foreground)] hover:bg-[var(--hover-bg)] rounded transition-colors" title="Editar">
                        <Pencil size={14} />
                    </button>
                    <button type="button" onClick={onDelete} disabled={isDeleting} className="p-1.5 text-[var(--muted-text)] hover:text-error-red hover:bg-error-red/10 rounded transition-colors disabled:opacity-50" title="Eliminar">
                        {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
