"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Users, ChevronDown, Pencil, Trash2, Search, Download, Filter } from "lucide-react";
import { createClientUser, updateClientUser, deleteClientUser, updateClientUserStatus } from "@/actions/client-users";
import type { ClientUser } from "@prisma/client";

type StatusFilter = "ACTIVE" | "INACTIVE" | "ALL";

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
    const [showDeleteModal, setShowDeleteModal] = useState<ClientUser | null>(null);
    const [editingUser, setEditingUser] = useState<ClientUser | null>(null);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE");

    // Count by status
    const counts = useMemo(() => {
        const total = clientUsers.length;
        const active = clientUsers.filter(u => u.status === "ACTIVE").length;
        const inactive = clientUsers.filter(u => u.status === "INACTIVE").length;
        return { total, active, inactive };
    }, [clientUsers]);

    // Filter users by search term and status
    const filteredUsers = useMemo(() => {
        return clientUsers.filter(user => {
            const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === "ALL" || user.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [clientUsers, searchTerm, statusFilter]);

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

        // Check for duplicate email
        const isDuplicate = clientUsers.some(
            u => u.email.toLowerCase() === email.trim().toLowerCase()
        );
        if (isDuplicate) {
            setError("Ya existe un usuario con este correo electrónico");
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

    const handleUpdate = async () => {
        if (!editingUser) return;
        
        if (!fullName.trim()) {
            setError("El nombre es requerido");
            return;
        }
        if (!email.trim()) {
            setError("El correo es requerido");
            return;
        }

        // Check for duplicate email (excluding current user)
        const isDuplicate = clientUsers.some(
            u => u.id !== editingUser.id && 
                 u.email.toLowerCase() === email.trim().toLowerCase()
        );
        if (isDuplicate) {
            setError("Ya existe un usuario con este correo electrónico");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await updateClientUser(editingUser.id, companyId, fullName.trim(), email.trim());

            if ("error" in result && result.error) {
                setError(result.error);
            } else if (result.clientUser) {
                // Optimistic update
                setClientUsers(prev => 
                    prev.map(u => u.id === editingUser.id ? result.clientUser! : u)
                );
                setFullName("");
                setEmail("");
                setEditingUser(null);
                router.refresh();
            }
        } catch {
            setError("Error al actualizar el usuario");
        }

        setLoading(false);
    };

    const handleDelete = async () => {
        if (!showDeleteModal) return;

        setDeletingId(showDeleteModal.id);
        setShowDeleteModal(null);

        try {
            const result = await deleteClientUser(showDeleteModal.id, companyId);

            if (!("error" in result)) {
                // Optimistic update - remove from local state
                setClientUsers(prev => prev.filter(u => u.id !== showDeleteModal.id));
                router.refresh();
            }
        } catch {
            console.error("Error deleting client user");
        }

        setDeletingId(null);
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

    const openEditModal = (user: ClientUser) => {
        setEditingUser(user);
        setFullName(user.fullName);
        setEmail(user.email);
        setError(null);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingUser(null);
        setFullName("");
        setEmail("");
        setError(null);
    };

    const handleExportExcel = () => {
        const headers = ["Nombre", "Correo", "Estado"];
        const rows = clientUsers.map(user => [
            `"${user.fullName.replace(/"/g, '""')}"`,
            `"${user.email.replace(/"/g, '""')}"`,
            user.status === "ACTIVE" ? "Activo" : "Inactivo"
        ]);

        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `usuarios_${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4">
            {/* Header with title and counts */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-md font-semibold text-[var(--foreground)] flex items-center gap-2">
                        <Users size={18} />
                        Usuarios
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-[var(--hover-bg)] text-[var(--muted-text)]">
                            Total: {counts.total}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-success-green/10 text-success-green">
                            Activos: {counts.active}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            Inactivos: {counts.inactive}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Status Filter */}
                    <div className="relative">
                        <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                            className="pl-8 pr-7 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-nearby-accent focus:border-nearby-accent appearance-none bg-white cursor-pointer"
                        >
                            <option value="ACTIVE">Activos</option>
                            <option value="INACTIVE">Inactivos</option>
                            <option value="ALL">Todos</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    {/* Search */}
                    <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar..."
                            className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-nearby-accent focus:border-nearby-accent w-32 sm:w-40"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleExportExcel}
                        disabled={clientUsers.length === 0}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                        title="Exportar a Excel"
                    >
                        <Download size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-nearby-accent text-white hover:bg-nearby-dark transition-colors"
                    >
                        <Plus size={16} />
                    </button>
                </div>
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
                                <th className="px-4 py-2 text-center text-xs font-medium text-dark-slate uppercase tracking-wider w-28">
                                    Estado
                                </th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-dark-slate uppercase tracking-wider w-20">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-graphite-gray">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                                        {searchTerm ? "No se encontraron usuarios" : "No hay usuarios registrados"}
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((clientUser) => (
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
                                                className={`inline-flex items-center justify-between gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors min-w-[85px] border ${
                                                    clientUser.status === "ACTIVE"
                                                        ? "bg-success-green/10 text-success-green border-success-green/30"
                                                        : "bg-gray-50 text-gray-500 border-gray-200"
                                                }`}
                                            >
                                                {updatingId === clientUser.id ? (
                                                    <Loader2 size={12} className="animate-spin mx-auto" />
                                                ) : (
                                                    <>
                                                        <span>{clientUser.status === "ACTIVE" ? "Activo" : "Inactivo"}</span>
                                                        <ChevronDown size={12} />
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(clientUser)}
                                                    className="p-1.5 text-gray-400 hover:text-nearby-accent hover:bg-gray-100 rounded transition-colors"
                                                    title="Editar"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowDeleteModal(clientUser)}
                                                    disabled={deletingId === clientUser.id}
                                                    className="p-1.5 text-gray-400 hover:text-error-red hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                                    title="Eliminar"
                                                >
                                                    {deletingId === clientUser.id ? (
                                                        <Loader2 size={14} className="animate-spin" />
                                                    ) : (
                                                        <Trash2 size={14} />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Client User Modal */}
            {(showModal || editingUser) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-nearby-dark">
                                {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
                            </h3>
                            <button
                                type="button"
                                onClick={closeModal}
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
                                            editingUser ? handleUpdate() : handleCreate();
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent text-sm"
                                    placeholder="juan@empresa.com"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-sm font-medium text-dark-slate bg-white border border-graphite-gray rounded-md hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={editingUser ? handleUpdate : handleCreate}
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

            {/* Confirm Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
                        <h3 className="text-lg font-bold text-nearby-dark mb-2">
                            Eliminar Usuario
                        </h3>
                        <p className="text-sm text-dark-slate mb-4">
                            ¿Estás seguro que deseas eliminar al usuario{" "}
                            <strong>&quot;{showDeleteModal.fullName}&quot;</strong>?
                            Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowDeleteModal(null)}
                                className="px-4 py-2 text-sm font-medium text-dark-slate bg-white border border-graphite-gray rounded-md hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="px-4 py-2 text-sm font-medium text-white bg-error-red rounded-md hover:bg-red-700"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
