"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Star, Loader2, Link2, Search } from "lucide-react";
import {
    getCompanyAdmCloudLinks,
    addCompanyAdmCloudLink,
    setCompanyAdmCloudLinkPrimary,
    deleteCompanyAdmCloudLink,
} from "@/actions/admcloud";

interface AdmCloudLink {
    id: string;
    admCloudRelationshipId: string;
    name: string;
    fiscalId: string | null;
    isPrimary: boolean;
}

interface Props {
    companyId: string;
}

export function AdmCloudLinksSection({ companyId }: Props) {
    const [links, setLinks] = useState<AdmCloudLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newRnc, setNewRnc] = useState("");
    const [error, setError] = useState<string | null>(null);

    const loadLinks = async () => {
        try {
            setLoading(true);
            const data = await getCompanyAdmCloudLinks(companyId);
            setLinks(data);
        } catch {
            console.error("Error loading links");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companyId]);

    const handleAdd = async () => {
        if (!newRnc.trim()) return;
        setAdding(true);
        setError(null);
        try {
            const result = await addCompanyAdmCloudLink(companyId, newRnc.trim());
            if (!result.success) {
                setError(result.error || "Error al vincular");
            } else {
                setNewRnc("");
                setShowAddForm(false);
                await loadLinks();
            }
        } catch {
            setError("Error de conexión");
        } finally {
            setAdding(false);
        }
    };

    const handleSetPrimary = async (linkId: string) => {
        await setCompanyAdmCloudLinkPrimary(companyId, linkId);
        await loadLinks();
    };

    const handleDelete = async (linkId: string) => {
        await deleteCompanyAdmCloudLink(companyId, linkId);
        await loadLinks();
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 py-3 text-sm text-gray-400">
                <Loader2 size={14} className="animate-spin" />
                Cargando vínculos ADMCloud...
            </div>
        );
    }

    return (
        <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Link2 size={14} className="text-gray-400" />
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Empresas relacionadas en ADMCloud
                    </h4>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="text-xs text-nearby-accent hover:text-nearby-accent-600 flex items-center gap-1"
                >
                    <Plus size={12} />
                    Agregar
                </button>
            </div>

            {links.length > 0 && (
                <div className="space-y-1.5 mb-2">
                    {links.map((link) => (
                        <div
                            key={link.id}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${
                                link.isPrimary
                                    ? "bg-nearby-accent/5 border-nearby-accent/20"
                                    : "bg-gray-50 border-gray-200"
                            }`}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                {link.isPrimary && (
                                    <Star size={12} className="text-nearby-accent shrink-0" fill="currentColor" />
                                )}
                                <span className="font-medium text-gray-800 truncate">{link.name}</span>
                                {link.fiscalId && (
                                    <span className="text-[10px] font-mono text-gray-400 shrink-0">
                                        {link.fiscalId}
                                    </span>
                                )}
                                {link.isPrimary && (
                                    <span className="text-[10px] text-nearby-accent font-medium">Principal</span>
                                )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                {!link.isPrimary && (
                                    <button
                                        onClick={() => handleSetPrimary(link.id)}
                                        title="Marcar como principal"
                                        className="p-1 text-gray-400 hover:text-nearby-accent transition-colors"
                                    >
                                        <Star size={12} />
                                    </button>
                                )}
                                {links.length > 1 && (
                                    <button
                                        onClick={() => handleDelete(link.id)}
                                        title="Eliminar vínculo"
                                        className="p-1 text-gray-400 hover:text-error-red transition-colors"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {links.length === 0 && !showAddForm && (
                <p className="text-xs text-gray-400 mb-2">
                    No hay vínculos configurados. Agrega uno buscando por RNC.
                </p>
            )}

            {showAddForm && (
                <div className="flex items-end gap-2 mt-2">
                    <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">RNC del cliente en ADMCloud</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={newRnc}
                                onChange={(e) => setNewRnc(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                                placeholder="Ej: 132351584"
                                className="w-full px-3 py-1.5 pl-8 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent"
                            />
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>
                    <button
                        onClick={handleAdd}
                        disabled={adding || !newRnc.trim()}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-nearby-dark rounded-md hover:bg-nearby-dark-600 disabled:opacity-50 transition-colors"
                    >
                        {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                        Buscar y vincular
                    </button>
                    <button
                        onClick={() => { setShowAddForm(false); setError(null); }}
                        className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                    >
                        Cancelar
                    </button>
                </div>
            )}

            {error && (
                <p className="text-xs text-error-red mt-1">{error}</p>
            )}
        </div>
    );
}
