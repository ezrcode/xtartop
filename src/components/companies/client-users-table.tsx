"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Users, ChevronDown } from "lucide-react";
import { createClientUser, updateClientUserStatus } from "@/actions/client-users";
import type { ClientUser } from "@prisma/client";

interface ClientUsersTableProps {
    companyId: string;
    clientUsers: ClientUser[];
}

export function ClientUsersTable({ companyId, clientUsers: initialClientUsers }: ClientUsersTableProps) {
    const router = useRouter();
    // Local state for optimistic updates
    const [clientUsers, setClientUsers] = useState(initialClientUsers);
    const [showModal, setShowModal] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState<ClientUser | null>(null);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Sync with props when they change
    useEffect(() => {
        setClientUsers(initialClientUsers);
    }, [initialClientUsers]);

    const handleCreate = async () => {
        if (!fullName.trim()) {
            setError("El nombre es requerido");
            return;
        }
        if (!email.trim()) {
            setError("El correo es requerido");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await createClientUser(companyId, fullName.trim(), email.trim());

            if ("error" in result && result.error) {
                setError(result.error);
            } else if (result.clientUser) {
                // Optimistic update - add to local state immediately
                setClientUsers(prev => [result.clientUser!, ...prev]);
                setFullName("");
                setEmail("");
                setShowModal(false);
                // Also refresh to sync with server
                router.refresh();
            }
        } catch {
            setError("Error al crear el usuario");
        }

        setLoading(false);
    };

    const handleConfirmStatusChange = async () => {
        if (!showStatusModal) return;
        
        const clientUser = showStatusModal;
        const newStatus = clientUser.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        
        setUpdatingId(clientUser.id);
        setShowStatusModal(null);

        try {
            const result = await updateClientUserStatus(clientUser.id, companyId, newStatus);
            
            if (!("error" in result)) {
                // Optimistic update - update local state immediately
                setClientUsers(prev => 
                    prev.map(u => 
                        u.id === clientUser.id 
                            ? { ...u, status: newStatus } 
                            : u
                    )
                );
                // Also refresh to sync with server
                router.refresh();
            }
        } catch {
            console.error("Error updating client user status");
        }

        setUpdatingId(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-md font-semibold text-nearby-dark flex items-center gap-2">
                    <Users size={18} />
                    Usuarios
                </h3>
                <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-nearby-accent text-white hover:bg-nearby-dark transition-colors"
                >
                    <Plus size={16} />
                </button>
            </div>

            {/* Client Users Table */}
            <div className="border border-graphite-gray rounded-lg overflow-hidden">
                <div className="max-h-[220px] overflow-y-auto">
                    <table className="min-w-full divide-y divide-graphite-gray">
                        <thead className="bg-soft-gray sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-dark-slate uppercase tracking-wider">
                                    Nombre
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-dark-slate uppercase tracking-wider">
                                    Correo
                                </th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-dark-slate uppercase tracking-wider w-36">
                                    Estado
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-graphite-gray">
                            {clientUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                                        No hay usuarios registrados
                                    </td>
                                </tr>
                            ) : (
                                clientUsers.map((clientUser) => (
                                    <tr key={clientUser.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-dark-slate">
                                            {clientUser.fullName}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {clientUser.email}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                type="button"
                                                onClick={() => setShowStatusModal(clientUser)}
                                                disabled={updatingId === clientUser.id}
                                                className={`inline-flex items-center justify-between gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors min-w-[100px] border ${
                                                    clientUser.status === "ACTIVE"
                                                        ? "bg-success-green/10 text-success-green border-success-green/30"
                                                        : "bg-gray-50 text-gray-500 border-gray-200"
                                                }`}
                                            >
                                                {updatingId === clientUser.id ? (
                                                    <Loader2 size={14} className="animate-spin mx-auto" />
                                                ) : (
                                                    <>
                                                        <span>{clientUser.status === "ACTIVE" ? "Activo" : "Inactivo"}</span>
                                                        <ChevronDown size={14} />
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Client User Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-nearby-dark">Nuevo Usuario</h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowModal(false);
                                    setFullName("");
                                    setEmail("");
                                    setError(null);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {error && (
                            <div className="mb-4 bg-error-red/10 border border-error-red text-error-red px-3 py-2 rounded-md text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-dark-slate mb-1">
                                    Nombre completo <span className="text-error-red">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent text-sm"
                                    placeholder="Juan Pérez"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-dark-slate mb-1">
                                    Correo electrónico <span className="text-error-red">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !loading) {
                                            handleCreate();
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent text-sm"
                                    placeholder="juan@empresa.com"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setFullName("");
                                        setEmail("");
                                        setError(null);
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-dark-slate bg-white border border-graphite-gray rounded-md hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreate}
                                    disabled={loading}
                                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-nearby-accent rounded-md hover:bg-nearby-dark disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={16} className="mr-2 animate-spin" />
                                            Guardando...
                                        </>
                                    ) : (
                                        "Guardar"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Status Change Modal */}
            {showStatusModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
                        <h3 className="text-lg font-bold text-nearby-dark mb-2">
                            Cambiar Estado
                        </h3>
                        <p className="text-sm text-dark-slate mb-4">
                            ¿Estás seguro que deseas{" "}
                            <strong>
                                {showStatusModal.status === "ACTIVE" ? "inactivar" : "activar"}
                            </strong>{" "}
                            al usuario <strong>&quot;{showStatusModal.fullName}&quot;</strong>?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowStatusModal(null)}
                                className="px-4 py-2 text-sm font-medium text-dark-slate bg-white border border-graphite-gray rounded-md hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmStatusChange}
                                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                                    showStatusModal.status === "ACTIVE"
                                        ? "bg-warning-amber hover:bg-amber-600"
                                        : "bg-success-green hover:bg-green-600"
                                }`}
                            >
                                {showStatusModal.status === "ACTIVE" ? "Inactivar" : "Activar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
