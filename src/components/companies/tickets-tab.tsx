"use client";

import { useState, useEffect } from "react";
import { Loader2, ExternalLink, AlertCircle, Ticket, Calendar, User } from "lucide-react";
import { getCompanyTickets, type ClickUpTicket } from "@/actions/clickup";

interface TicketsTabProps {
    companyName: string;
}

export function TicketsTab({ companyName }: TicketsTabProps) {
    const [tickets, setTickets] = useState<ClickUpTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadTickets() {
            setLoading(true);
            setError(null);
            
            try {
                const result = await getCompanyTickets(companyName);
                if (result.success && result.tickets) {
                    setTickets(result.tickets);
                } else {
                    setError(result.error || "Error al cargar los tickets");
                }
            } catch (err) {
                setError("Error al conectar con ClickUp");
                console.error("Error loading tickets:", err);
            }
            
            setLoading(false);
        }

        loadTickets();
    }, [companyName]);

    const formatDate = (date: Date | null) => {
        if (!date) return "-";
        return new Date(date).toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                <span className="ml-3 text-gray-500">Cargando tickets...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
                <p className="text-yellow-800 font-medium">{error}</p>
                <p className="text-yellow-600 text-sm mt-2">
                    Verifica la configuración de ClickUp en Configuración → Integraciones
                </p>
            </div>
        );
    }

    if (tickets.length === 0) {
        return (
            <div className="bg-gray-50 border border-graphite-gray rounded-lg p-8 text-center">
                <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No hay tickets para esta empresa</p>
                <p className="text-gray-500 text-sm mt-2">
                    Los tickets aparecerán aquí cuando el campo &quot;Cliente&quot; en ClickUp coincida con &quot;{companyName}&quot;
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
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
        </div>
    );
}
