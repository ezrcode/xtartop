"use client";

import { useState, useEffect } from "react";
import { Loader2, ExternalLink, AlertCircle, Ticket, Calendar, User, Save, Settings, RefreshCw } from "lucide-react";
import { getCompanyTickets, updateCompanyClickUpClientName, type ClickUpTicket } from "@/actions/clickup";

interface TicketsTabProps {
    companyId: string;
    companyName: string;
    clickUpClientName: string | null;
}

export function TicketsTab({ companyId, companyName, clickUpClientName: initialClientName }: TicketsTabProps) {
    const [tickets, setTickets] = useState<ClickUpTicket[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [clientName, setClientName] = useState(initialClientName || "");
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    const loadTickets = async (nameToSearch: string) => {
        if (!nameToSearch.trim()) {
            setError("Configura el nombre del cliente en ClickUp");
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            const result = await getCompanyTickets(nameToSearch);
            if (result.success && result.tickets) {
                setTickets(result.tickets);
                setHasLoaded(true);
            } else {
                setError(result.error || "Error al cargar los tickets");
            }
        } catch (err) {
            setError("Error al conectar con ClickUp");
            console.error("Error loading tickets:", err);
        }
        
        setLoading(false);
    };

    // Auto-load on mount if client name is set
    useEffect(() => {
        if (initialClientName && !hasLoaded) {
            loadTickets(initialClientName);
        }
    }, [initialClientName, hasLoaded]);

    const handleSaveClientName = async () => {
        setSaving(true);
        setSaveSuccess(false);
        
        try {
            const result = await updateCompanyClickUpClientName(companyId, clientName);
            if (result.success) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
                // Reload tickets with new name
                if (clientName.trim()) {
                    loadTickets(clientName);
                }
            } else {
                setError(result.error || "Error al guardar");
            }
        } catch (err) {
            setError("Error al guardar");
            console.error("Error saving client name:", err);
        }
        
        setSaving(false);
    };

    const formatDate = (date: Date | null) => {
        if (!date) return "-";
        return new Date(date).toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    // Show config section if no client name configured
    const showConfig = !initialClientName || !hasLoaded;

    return (
        <div className="space-y-6">
            {/* Client Name Configuration */}
            <div className={`bg-purple-50 border border-purple-200 rounded-lg p-4 ${showConfig ? "" : "hidden md:block"}`}>
                <div className="flex items-start gap-3">
                    <Settings className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <h4 className="text-sm font-medium text-purple-800 mb-2">
                            Nombre del cliente en ClickUp
                        </h4>
                        <p className="text-xs text-purple-600 mb-3">
                            Ingresa el valor exacto del campo &quot;Cliente&quot; en ClickUp para filtrar los tickets de esta empresa.
                            Este valor puede ser diferente al nombre de la empresa en el CRM.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="text"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                placeholder={companyName}
                                className="flex-1 px-3 py-2 border border-purple-300 rounded-md text-sm focus:ring-purple-500 focus:border-purple-500"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleSaveClientName}
                                    disabled={saving}
                                    className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {saving ? (
                                        <Loader2 size={16} className="mr-2 animate-spin" />
                                    ) : (
                                        <Save size={16} className="mr-2" />
                                    )}
                                    Guardar
                                </button>
                                {hasLoaded && (
                                    <button
                                        type="button"
                                        onClick={() => loadTickets(clientName)}
                                        disabled={loading || !clientName.trim()}
                                        className="inline-flex items-center px-3 py-2 border border-purple-300 text-purple-700 text-sm font-medium rounded-md hover:bg-purple-100 disabled:opacity-50"
                                    >
                                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                                    </button>
                                )}
                            </div>
                        </div>
                        {saveSuccess && (
                            <p className="text-xs text-green-600 mt-2">Guardado exitosamente</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Loading state */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                    <span className="ml-3 text-gray-500">Cargando tickets...</span>
                </div>
            )}

            {/* Error state */}
            {error && !loading && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
                    <p className="text-yellow-800 font-medium">{error}</p>
                    <p className="text-yellow-600 text-sm mt-2">
                        Verifica la configuración de ClickUp en Configuración → Integraciones
                    </p>
                </div>
            )}

            {/* No client name configured */}
            {!loading && !error && !clientName.trim() && !hasLoaded && (
                <div className="bg-gray-50 border border-graphite-gray rounded-lg p-8 text-center">
                    <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Configura el nombre del cliente</p>
                    <p className="text-gray-500 text-sm mt-2">
                        Ingresa el nombre del cliente en ClickUp para ver sus tickets
                    </p>
                </div>
            )}

            {/* Empty tickets */}
            {!loading && !error && hasLoaded && tickets.length === 0 && (
                <div className="bg-gray-50 border border-graphite-gray rounded-lg p-8 text-center">
                    <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">No hay tickets para esta empresa</p>
                    <p className="text-gray-500 text-sm mt-2">
                        No se encontraron tareas con el campo &quot;Cliente&quot; igual a &quot;{clientName || companyName}&quot;
                    </p>
                </div>
            )}

            {/* Tickets list */}
            {!loading && !error && tickets.length > 0 && (
                <>
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-nearby-dark">
                            Tickets ({tickets.length})
                        </h3>
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto bg-white border border-graphite-gray rounded-lg">
                        <table className="min-w-full divide-y divide-graphite-gray">
                            <thead className="bg-soft-gray">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-slate uppercase tracking-wider">
                                        ID
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-slate uppercase tracking-wider">
                                        Título
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-slate uppercase tracking-wider">
                                        Creación
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-slate uppercase tracking-wider">
                                        Vencimiento
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-slate uppercase tracking-wider">
                                        Tipo
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-slate uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-slate uppercase tracking-wider">
                                        Asignados
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-slate uppercase tracking-wider w-10">
                                        
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-graphite-gray">
                                {tickets.map((ticket) => (
                                    <tr key={ticket.id} className={`hover:bg-soft-gray ${ticket.isSubtask ? "bg-gray-50" : ""}`}>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="text-xs font-mono text-gray-500">
                                                {ticket.isSubtask && "↳ "}
                                                {ticket.customId || ticket.id.slice(0, 8)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm font-medium text-dark-slate">
                                                {ticket.name}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="text-sm text-gray-500">
                                                {formatDate(ticket.dateCreated)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`text-sm ${
                                                ticket.dueDate && new Date(ticket.dueDate) < new Date()
                                                    ? "text-error-red font-medium"
                                                    : "text-gray-500"
                                            }`}>
                                                {formatDate(ticket.dueDate)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="text-sm text-gray-600">
                                                {ticket.taskType || "-"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span
                                                className="px-2 py-1 text-xs font-medium rounded-full"
                                                style={{
                                                    backgroundColor: `${ticket.statusColor}20`,
                                                    color: ticket.statusColor,
                                                }}
                                            >
                                                {ticket.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex -space-x-2">
                                                {ticket.assignees.slice(0, 3).map((assignee) => (
                                                    <div
                                                        key={assignee.id}
                                                        className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium bg-purple-100 text-purple-700"
                                                        title={assignee.username}
                                                    >
                                                        {assignee.profilePicture ? (
                                                            <img
                                                                src={assignee.profilePicture}
                                                                alt={assignee.username}
                                                                className="w-full h-full rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            assignee.initials || assignee.username.slice(0, 2).toUpperCase()
                                                        )}
                                                    </div>
                                                ))}
                                                {ticket.assignees.length > 3 && (
                                                    <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-medium">
                                                        +{ticket.assignees.length - 3}
                                                    </div>
                                                )}
                                                {ticket.assignees.length === 0 && (
                                                    <span className="text-gray-400 text-sm">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <a
                                                href={ticket.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-purple-600 hover:text-purple-800"
                                                title="Abrir en ClickUp"
                                            >
                                                <ExternalLink size={16} />
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                        {tickets.map((ticket) => (
                            <div
                                key={ticket.id}
                                className={`bg-white border border-graphite-gray rounded-lg p-4 ${
                                    ticket.isSubtask ? "ml-4 border-l-4 border-l-purple-300" : ""
                                }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <span className="text-xs font-mono text-gray-400 block mb-1">
                                            {ticket.customId || ticket.id.slice(0, 8)}
                                        </span>
                                        <h4 className="text-sm font-medium text-dark-slate">
                                            {ticket.name}
                                        </h4>
                                    </div>
                                    <a
                                        href={ticket.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-2 text-purple-600"
                                    >
                                        <ExternalLink size={16} />
                                    </a>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                    <span
                                        className="px-2 py-0.5 text-xs font-medium rounded-full"
                                        style={{
                                            backgroundColor: `${ticket.statusColor}20`,
                                            color: ticket.statusColor,
                                        }}
                                    >
                                        {ticket.status}
                                    </span>
                                    {ticket.taskType && (
                                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                                            {ticket.taskType}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        <span>{formatDate(ticket.dateCreated)}</span>
                                        {ticket.dueDate && (
                                            <span className={`ml-2 ${
                                                new Date(ticket.dueDate) < new Date() ? "text-error-red" : ""
                                            }`}>
                                                → {formatDate(ticket.dueDate)}
                                            </span>
                                        )}
                                    </div>
                                    {ticket.assignees.length > 0 && (
                                        <div className="flex items-center gap-1">
                                            <User size={12} />
                                            <span>{ticket.assignees.map(a => a.username).join(", ")}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
