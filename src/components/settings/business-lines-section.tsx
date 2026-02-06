"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus, Pencil, Trash2, X, Loader2, Check, AlertCircle } from "lucide-react";
import { 
    createBusinessLine, 
    updateBusinessLine, 
    deleteBusinessLine,
    toggleBusinessLineActive,
    BusinessLineState 
} from "@/actions/business-lines";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { BusinessLine } from "@prisma/client";

interface BusinessLinesSectionProps {
    businessLines: BusinessLine[];
}

function SubmitButton({ children }: { children: React.ReactNode }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} size="sm">
            {pending ? <Loader2 size={14} className="animate-spin" /> : children}
        </Button>
    );
}

export function BusinessLinesSection({ businessLines }: BusinessLinesSectionProps) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const initialState: BusinessLineState = { message: "", errors: {} };
    const [createState, createAction] = useFormState(createBusinessLine, initialState);

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        setDeleteError(null);
        const result = await deleteBusinessLine(id);
        if (!result.success) {
            setDeleteError(result.error || "Error al eliminar");
        }
        setDeletingId(null);
    };

    const handleToggle = async (id: string) => {
        setTogglingId(id);
        await toggleBusinessLineActive(id);
        setTogglingId(null);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Líneas de Negocio</CardTitle>
                    {!showAddForm && (
                        <Button
                            onClick={() => setShowAddForm(true)}
                            size="sm"
                            variant="outline"
                        >
                            <Plus size={14} />
                            <span className="hidden sm:inline ml-1">Agregar</span>
                        </Button>
                    )}
                </div>
                <p className="text-sm text-[var(--muted-text)] mt-1">
                    Las líneas de negocio permiten categorizar los negocios (deals) por tipo de servicio o producto.
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Add Form */}
                {showAddForm && (
                    <form action={createAction} className="p-4 border border-[var(--card-border)] rounded-lg bg-[var(--hover-bg)] space-y-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-[var(--foreground)]">Nueva Línea de Negocio</span>
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

                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm">Nombre *</Label>
                            <Input
                                type="text"
                                name="name"
                                id="name"
                                placeholder="Ej: Consultoría, Desarrollo, Soporte"
                                required
                                error={!!createState?.errors?.name}
                            />
                            {createState?.errors?.name && (
                                <p className="text-xs text-error-red">{createState.errors.name}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-sm">Descripción</Label>
                            <textarea
                                name="description"
                                id="description"
                                rows={2}
                                placeholder="Descripción opcional de esta línea de negocio"
                                className="w-full px-3 py-2 text-sm border border-[var(--card-border)] rounded-lg bg-[var(--card-bg)] focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors resize-none"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAddForm(false)}
                            >
                                Cancelar
                            </Button>
                            <SubmitButton>
                                <Check size={14} className="mr-1" />
                                Guardar
                            </SubmitButton>
                        </div>
                    </form>
                )}

                {/* Error message for delete */}
                {deleteError && (
                    <div className="p-3 rounded-lg bg-error-red/10 text-error-red text-sm flex items-center gap-2">
                        <AlertCircle size={16} />
                        {deleteError}
                        <button 
                            onClick={() => setDeleteError(null)}
                            className="ml-auto hover:bg-error-red/20 rounded p-1"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* List */}
                {businessLines.length === 0 ? (
                    <div className="text-center py-8 text-[var(--muted-text)] text-sm">
                        No hay líneas de negocio configuradas.
                        <br />
                        <span className="text-xs">Agrega una para comenzar a categorizar tus negocios.</span>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {businessLines.map((bl) => (
                            <BusinessLineItem
                                key={bl.id}
                                businessLine={bl}
                                isEditing={editingId === bl.id}
                                isDeleting={deletingId === bl.id}
                                isToggling={togglingId === bl.id}
                                onEdit={() => setEditingId(bl.id)}
                                onCancelEdit={() => setEditingId(null)}
                                onDelete={() => handleDelete(bl.id)}
                                onToggle={() => handleToggle(bl.id)}
                            />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

interface BusinessLineItemProps {
    businessLine: BusinessLine;
    isEditing: boolean;
    isDeleting: boolean;
    isToggling: boolean;
    onEdit: () => void;
    onCancelEdit: () => void;
    onDelete: () => void;
    onToggle: () => void;
}

function BusinessLineItem({ 
    businessLine, 
    isEditing, 
    isDeleting,
    isToggling,
    onEdit, 
    onCancelEdit, 
    onDelete,
    onToggle,
}: BusinessLineItemProps) {
    const updateAction = updateBusinessLine.bind(null, businessLine.id);
    const initialState: BusinessLineState = { message: "", errors: {} };
    const [state, action] = useFormState(updateAction, initialState);

    if (isEditing) {
        return (
            <form action={action} className="p-3 border border-nearby-accent rounded-lg bg-nearby-accent/5 space-y-3">
                <div className="space-y-2">
                    <Label htmlFor={`edit-name-${businessLine.id}`} className="text-sm">Nombre *</Label>
                    <Input
                        type="text"
                        name="name"
                        id={`edit-name-${businessLine.id}`}
                        defaultValue={businessLine.name}
                        required
                        error={!!state?.errors?.name}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor={`edit-desc-${businessLine.id}`} className="text-sm">Descripción</Label>
                    <textarea
                        name="description"
                        id={`edit-desc-${businessLine.id}`}
                        rows={2}
                        defaultValue={businessLine.description || ""}
                        className="w-full px-3 py-2 text-sm border border-[var(--card-border)] rounded-lg bg-[var(--card-bg)] focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors resize-none"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <input 
                        type="hidden" 
                        name="isActive" 
                        value={businessLine.isActive ? "true" : "false"} 
                    />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onCancelEdit}
                    >
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
        <div className={`flex items-center justify-between p-3 border border-[var(--card-border)] rounded-lg ${!businessLine.isActive ? 'opacity-60' : ''}`}>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--foreground)] truncate">
                        {businessLine.name}
                    </span>
                    <Badge 
                        variant={businessLine.isActive ? "success" : "secondary"}
                        className="text-xs"
                    >
                        {businessLine.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                </div>
                {businessLine.description && (
                    <p className="text-xs text-[var(--muted-text)] mt-0.5 truncate">
                        {businessLine.description}
                    </p>
                )}
            </div>
            <div className="flex items-center gap-1 ml-2">
                <button
                    type="button"
                    onClick={onToggle}
                    disabled={isToggling}
                    className="p-1.5 text-[var(--muted-text)] hover:text-[var(--foreground)] hover:bg-[var(--hover-bg)] rounded transition-colors disabled:opacity-50"
                    title={businessLine.isActive ? "Desactivar" : "Activar"}
                >
                    {isToggling ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : businessLine.isActive ? (
                        <X size={14} />
                    ) : (
                        <Check size={14} />
                    )}
                </button>
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
                    {isDeleting ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : (
                        <Trash2 size={14} />
                    )}
                </button>
            </div>
        </div>
    );
}
