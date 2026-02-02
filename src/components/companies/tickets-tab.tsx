"use client";

import { useState, useEffect, useMemo } from "react";
import { 
    Loader2, 
    ExternalLink, 
    AlertCircle, 
    Ticket, 
    Calendar, 
    User, 
    Save, 
    Settings, 
    RefreshCw,
    Download,
    Filter,
    Clock,
    CheckCircle2,
    ChevronDown,
    ChevronRight
} from "lucide-react";
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
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [configExpanded, setConfigExpanded] = useState(!initialClientName);

    // Get unique statuses from tickets
    const uniqueStatuses = useMemo(() => {
        const statuses = new Set<string>();
        tickets.forEach(t => statuses.add(t.status));
        return Array.from(statuses).sort();
    }, [tickets]);

    // Filter tickets by status
    const filteredTickets = useMemo(() => {
        if (statusFilter === "all") return tickets;
        return tickets.filter(t => t.status === statusFilter);
    }, [tickets, statusFilter]);

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
        if (!date) return null;
        return new Date(date).toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const isOverdue = (date: Date | null) => {
        if (!date) return false;
        return new Date(date) < new Date();
    };

    // Export to Excel (CSV)
    const handleExportExcel = () => {
        if (filteredTickets.length === 0) return;

        const headers = ["ID", "Título", "Fecha Creación", "Fecha Vencimiento", "Tipo", "Estado", "Asignados", "URL"];
        const rows = filteredTickets.map(ticket => [
            ticket.customId || ticket.id,
            `"${ticket.name.replace(/"/g, '""')}"`,
            formatDate(ticket.dateCreated) || "",
            formatDate(ticket.dueDate) || "",
            ticket.taskType || "",
            ticket.status,
            `"${ticket.assignees.map(a => a.username).join(", ")}"`,
            ticket.url
        ]);

        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `tickets-${companyName.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Show config section if no client name configured
    const showConfig = !initialClientName || !hasLoaded;

    return (
        <div className="space-y-4">
            {/* Client Name Configuration - Collapsible when configured */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg overflow-hidden">
                {/* Header - Always visible, clickable when configured */}
                <button
                    type="button"
                    onClick={() => initialClientName && setConfigExpanded(!configExpanded)}
                    className={`w-full flex items-center justify-between p-3 text-left ${
                        initialClientName ? "cursor-pointer hover:bg-purple-100" : "cursor-default"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-800">
                            Cliente en ClickUp
                        </span>
                        {initialClientName && !configExpanded && (
                            <span className="text-sm text-purple-600 font-normal">
                                : {clientName || initialClientName}
                            </span>
                        )}
                    </div>
                    {initialClientName && (
                        configExpanded ? (
                            <ChevronDown size={16} className="text-purple-600" />
                        ) : (
                            <ChevronRight size={16} className="text-purple-600" />
                        )
                    )}
                </button>

                {/* Expandable Content */}
                {(configExpanded || !initialClientName) && (
                    <div className="px-3 pb-3 pt-0">
                        <p className="text-xs text-purple-600 mb-3 ml-6">
                            Ingresa el valor exacto del campo &quot;Cliente&quot; en ClickUp para filtrar los tickets.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 ml-6">
                            <input
                                type="text"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                placeholder={companyName}
                                className="flex-1 px-3 py-2 border border-purple-300 rounded-md text-sm focus:ring-purple-500 focus:border-purple-500 bg-white"
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
                            <p className="text-xs text-green-600 mt-2 ml-6">Guardado exitosamente</p>
                        )}
                    </div>
                )}
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
                <div className="space-y-4">
                    {/* Header with filters and export */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Ticket className="w-5 h-5 text-purple-600" />
                            <h3 className="text-lg font-semibold text-nearby-dark">
                                Tickets
                            </h3>
                            <span className="text-sm text-gray-500">
                                ({filteredTickets.length}{statusFilter !== "all" ? ` de ${tickets.length}` : ""})
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {/* Status Filter */}
                            <div className="relative">
                                <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="pl-8 pr-8 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 appearance-none bg-white"
                                >
                                    <option value="all">Todos los estados</option>
                                    {uniqueStatuses.map(status => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Export Button */}
                            <button
                                type="button"
                                onClick={handleExportExcel}
                                disabled={filteredTickets.length === 0}
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                            >
                                <Download size={14} className="mr-1.5" />
                                Excel
                            </button>

                            {/* Refresh Button */}
                            <button
                                type="button"
                                onClick={() => loadTickets(clientName)}
                                disabled={loading}
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                            >
                                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                            </button>
                        </div>
                    </div>

                    {/* Tickets Cards */}
                    <div className="space-y-3">
                        {filteredTickets.map((ticket) => (
                            <div 
                                key={ticket.id} 
                                className={`bg-white border border-graphite-gray rounded-lg p-4 hover:shadow-sm transition-shadow ${
                                    ticket.isSubtask ? "ml-4 border-l-4 border-l-purple-300" : ""
                                }`}
                            >
                                {/* Header Row */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <Ticket className="text-gray-400 flex-shrink-0" size={18} />
                                        <span className="text-xs font-mono text-gray-500 flex-shrink-0">
                                            {ticket.isSubtask && "↳ "}
                                            #{ticket.customId || ticket.id.slice(0, 8)}
                                        </span>
                                        <h4 className="font-medium text-dark-slate truncate">
                                            {ticket.name}
                                        </h4>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                        <span
                                            className="px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap"
                                            style={{
                                                backgroundColor: `${ticket.statusColor}20`,
                                                color: ticket.statusColor,
                                            }}
                                        >
                                            {ticket.status}
                                        </span>
                                        <a
                                            href={ticket.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-purple-600 hover:text-purple-800 p-1"
                                            title="Abrir en ClickUp"
                                        >
                                            <ExternalLink size={16} />
                                        </a>
                                    </div>
                                </div>

                                {/* Details Row */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                    {/* Creation Date */}
                                    <div className="flex items-center gap-1.5 text-gray-600">
                                        <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                                        <span className="truncate">{formatDate(ticket.dateCreated) || "N/A"}</span>
                                    </div>

                                    {/* Due Date */}
                                    <div className={`flex items-center gap-1.5 ${
                                        isOverdue(ticket.dueDate) ? "text-error-red font-medium" : "text-gray-600"
                                    }`}>
                                        <Clock size={14} className={`flex-shrink-0 ${isOverdue(ticket.dueDate) ? "text-error-red" : "text-gray-400"}`} />
                                        <span className="truncate">
                                            {formatDate(ticket.dueDate) || "Sin fecha"}
                                        </span>
                                    </div>

                                    {/* Task Type */}
                                    <div className="flex items-center gap-1.5 text-gray-600">
                                        <CheckCircle2 size={14} className="text-gray-400 flex-shrink-0" />
                                        <span className="truncate">{ticket.taskType || "Sin tipo"}</span>
                                    </div>

                                    {/* Assignees */}
                                    <div className="flex items-center gap-1.5 text-gray-600">
                                        <User size={14} className="text-gray-400 flex-shrink-0" />
                                        {ticket.assignees.length > 0 ? (
                                            <div className="flex items-center gap-1">
                                                <div className="flex -space-x-1">
                                                    {ticket.assignees.slice(0, 3).map((assignee) => (
                                                        <div
                                                            key={assignee.id}
                                                            className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-[10px] font-medium bg-purple-100 text-purple-700"
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
                                                </div>
                                                {ticket.assignees.length > 3 && (
                                                    <span className="text-xs text-gray-500">+{ticket.assignees.length - 3}</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 truncate">Sin asignar</span>
                                        )}
                                    </div>
                                </div>

                                {/* Priority badge if exists */}
                                {ticket.priority && (
                                    <div className="mt-2 pt-2 border-t border-gray-100">
                                        <span 
                                            className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded"
                                            style={{
                                                backgroundColor: `${ticket.priorityColor || "#666"}20`,
                                                color: ticket.priorityColor || "#666",
                                            }}
                                        >
                                            Prioridad: {ticket.priority}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
