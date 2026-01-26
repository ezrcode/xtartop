"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
    Plus, 
    Mail, 
    CheckCircle, 
    XCircle, 
    Clock, 
    Send, 
    FileText,
    Trash2,
    Loader2,
    AlertCircle,
    UserPlus,
    FolderOpen,
    User as UserIcon,
    StickyNote,
    Filter
} from "lucide-react";
import { ComposeEmailModal } from "./compose-email-modal";
import { sendClientInvitation, revokeInvitation } from "@/actions/client-invitation";
import { createNote } from "@/actions/notes";
import type { Activity, User, Contact } from "@prisma/client";

type ActivityWithUser = Activity & {
    createdBy: Pick<User, 'name' | 'email' | 'photoUrl'>;
};

interface ClientInvitationData {
    id: string;
    contactId: string;
    status: string;
    createdAt: Date;
    expiresAt: Date;
    contact: { fullName: string; email: string };
}

interface ContractStatus {
    termsAccepted: boolean;
    termsAcceptedAt: Date | null;
    termsAcceptedByName: string | null;
    termsVersion: string | null;
}

interface CompanyActivitiesSectionProps {
    activities: ActivityWithUser[];
    companyId: string;
    defaultEmail?: string;
    clientInvitations: ClientInvitationData[];
    contractStatus: ContractStatus;
    companyContacts: Contact[];
}

export function CompanyActivitiesSection({
    activities,
    companyId,
    defaultEmail = "",
    clientInvitations,
    contractStatus,
    companyContacts,
}: CompanyActivitiesSectionProps) {
    const router = useRouter();
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [showNoteForm, setShowNoteForm] = useState(false);
    const [noteContent, setNoteContent] = useState("");
    const [filter, setFilter] = useState<"all" | "EMAIL" | "PROJECT" | "CLIENT_USER" | "NOTE">("all");
    
    // Invitation state
    const [selectedContactId, setSelectedContactId] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [cancelingId, setCancelingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleNewEmail = () => {
        setShowMenu(false);
        setShowEmailModal(true);
    };

    const handleNewNote = () => {
        setShowMenu(false);
        setShowNoteForm(true);
    };

    const handleSaveNote = async () => {
        if (!noteContent.trim()) {
            setError("Escribe una nota");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await createNote(companyId, noteContent.trim());

            if ("error" in result && result.error) {
                setError(result.error);
            } else {
                setNoteContent("");
                setShowNoteForm(false);
                router.refresh();
            }
        } catch {
            setError("Error al crear la nota");
        }

        setLoading(false);
    };

    const handleNewInvitation = () => {
        setShowMenu(false);
        setShowInviteForm(true);
    };

    const handleSendInvitation = async () => {
        if (!selectedContactId) {
            setError("Selecciona un contacto");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const result = await sendClientInvitation(companyId, selectedContactId);

            if ("error" in result && result.error) {
                setError(result.error);
            } else {
                setSuccess("Invitación enviada exitosamente");
                setSelectedContactId("");
                setShowInviteForm(false);
                router.refresh();
            }
        } catch {
            setError("Ocurrió un error al enviar la invitación");
        }

        setLoading(false);
    };

    const handleCancelInvitation = async (invitationId: string) => {
        setCancelingId(invitationId);
        setError(null);

        try {
            const result = await revokeInvitation(invitationId);

            if ("error" in result && result.error) {
                setError(result.error);
            } else {
                router.refresh();
            }
        } catch {
            setError("Ocurrió un error al cancelar la invitación");
        }

        setCancelingId(null);
    };

    // Format relative time
    const formatRelativeTime = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Ahora";
        if (diffMins < 60) return `Hace ${diffMins}m`;
        if (diffHours < 24) return `Hace ${diffHours}h`;
        if (diffDays < 7) return `Hace ${diffDays}d`;
        return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
    };

    // Combine and sort all timeline items
    const timelineItems: Array<{
        type: "activity" | "invitation" | "contract";
        date: Date;
        data: ActivityWithUser | ClientInvitationData | ContractStatus;
    }> = [];

    // Add activities
    activities.forEach((activity) => {
        timelineItems.push({
            type: "activity",
            date: new Date(activity.createdAt),
            data: activity,
        });
    });

    // Add invitations
    clientInvitations.forEach((invitation) => {
        timelineItems.push({
            type: "invitation",
            date: new Date(invitation.createdAt),
            data: invitation,
        });
    });

    // Add contract acceptance if exists
    if (contractStatus.termsAccepted && contractStatus.termsAcceptedAt) {
        timelineItems.push({
            type: "contract",
            date: new Date(contractStatus.termsAcceptedAt),
            data: contractStatus,
        });
    }

    // Sort by date descending (newest first)
    timelineItems.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Get activity icon config
    const getActivityConfig = (activity: ActivityWithUser) => {
        const typeMap: Record<string, { icon: typeof Mail; color: string; bgColor: string; label: string }> = {
            EMAIL: { icon: Mail, color: "text-nearby-dark", bgColor: "bg-nearby-dark/10", label: "Correo" },
            PROJECT: { icon: FolderOpen, color: "text-nearby-accent", bgColor: "bg-nearby-accent/10", label: "Proyecto" },
            CLIENT_USER: { icon: UserIcon, color: "text-ocean-blue", bgColor: "bg-ocean-blue/10", label: "Usuario" },
            NOTE: { icon: StickyNote, color: "text-purple-600", bgColor: "bg-purple-100", label: "Nota" },
        };
        return typeMap[activity.type] || typeMap.EMAIL;
    };

    // Filter options
    const filterOptions = [
        { value: "all", label: "Todas" },
        { value: "EMAIL", label: "Correos" },
        { value: "NOTE", label: "Notas" },
        { value: "PROJECT", label: "Proyectos" },
        { value: "CLIENT_USER", label: "Usuarios" },
    ];

    // Filter timeline items
    const filteredTimelineItems = filter === "all" 
        ? timelineItems 
        : timelineItems.filter(item => {
            if (item.type === "activity") {
                return (item.data as ActivityWithUser).type === filter;
            }
            // Always show invitations and contracts when filter is "all"
            return false;
        });

    return (
        <div className="flex flex-col h-full">
            {/* Header - Fixed */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-nearby-dark uppercase tracking-wide">Actividades</h3>
                    {/* Filter Dropdown */}
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as typeof filter)}
                        className="text-xs border border-graphite-gray rounded px-1.5 py-0.5 text-gray-600 bg-white focus:ring-nearby-accent focus:border-nearby-accent cursor-pointer"
                    >
                        {filterOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowMenu(!showMenu)}
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-nearby-accent text-white hover:bg-nearby-dark transition-colors"
                    >
                        <Plus size={14} />
                    </button>

                    {/* Dropdown Menu */}
                    {showMenu && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowMenu(false)}
                            />
                            <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                                <div className="py-1">
                                    <button
                                        type="button"
                                        onClick={handleNewEmail}
                                        className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        <Mail size={14} className="mr-2 text-gray-400" />
                                        Correo electrónico
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleNewNote}
                                        className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        <StickyNote size={14} className="mr-2 text-gray-400" />
                                        Nota
                                    </button>
                                    {!contractStatus.termsAccepted && (
                                        <button
                                            type="button"
                                            onClick={handleNewInvitation}
                                            className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                        >
                                            <UserPlus size={14} className="mr-2 text-gray-400" />
                                            Invitación al portal
                                        </button>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Error/Success messages - Compact */}
            {error && (
                <div className="bg-error-red/10 text-error-red px-2 py-1.5 rounded text-xs mb-2 flex items-center gap-1">
                    <XCircle size={12} />
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-success-green/10 text-success-green px-2 py-1.5 rounded text-xs mb-2 flex items-center gap-1">
                    <CheckCircle size={12} />
                    {success}
                </div>
            )}

            {/* Invite Form (inline) - Compact */}
            {showInviteForm && (
                <div className="bg-soft-gray border border-graphite-gray rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-dark-slate text-xs">Nueva Invitación</span>
                        <button
                            type="button"
                            onClick={() => setShowInviteForm(false)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <XCircle size={14} />
                        </button>
                    </div>
                    {companyContacts.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">
                            No hay contactos. Crea uno primero.
                        </p>
                    ) : (
                        <div className="flex items-center gap-2">
                            <select
                                value={selectedContactId}
                                onChange={(e) => setSelectedContactId(e.target.value)}
                                className="flex-1 px-2 py-1.5 border border-graphite-gray rounded text-xs focus:ring-nearby-accent focus:border-nearby-accent"
                            >
                                <option value="">Seleccionar...</option>
                                {companyContacts.map((contact) => (
                                    <option key={contact.id} value={contact.id}>
                                        {contact.fullName}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={handleSendInvitation}
                                disabled={loading || !selectedContactId}
                                className="inline-flex items-center px-2 py-1.5 bg-nearby-accent text-white rounded hover:bg-nearby-dark transition-colors disabled:opacity-50 text-xs"
                            >
                                {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Note Form (inline) - Compact */}
            {showNoteForm && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-purple-700 text-xs">Nueva Nota</span>
                        <button
                            type="button"
                            onClick={() => {
                                setShowNoteForm(false);
                                setNoteContent("");
                            }}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <XCircle size={14} />
                        </button>
                    </div>
                    <div className="space-y-2">
                        <textarea
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            rows={3}
                            placeholder="Escribe tu nota aquí..."
                            className="w-full px-2 py-1.5 border border-purple-200 rounded text-xs focus:ring-purple-400 focus:border-purple-400 resize-none"
                        />
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={handleSaveNote}
                                disabled={loading || !noteContent.trim()}
                                className="inline-flex items-center px-2 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50 text-xs"
                            >
                                {loading ? <Loader2 size={12} className="animate-spin" /> : "Guardar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Contract Status Banner - Compact */}
            {!contractStatus.termsAccepted && (
                <div className="bg-warning-amber/10 rounded-lg px-3 py-2 flex items-center gap-2 mb-3">
                    <AlertCircle size={14} className="text-warning-amber flex-shrink-0" />
                    <span className="text-xs text-warning-amber font-medium">Contrato pendiente de aceptación</span>
                </div>
            )}

            {/* Timeline - Scrollable (fills remaining space) */}
            <div className="flex-1 overflow-y-auto pr-1 -mr-1">
                {filteredTimelineItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs">
                        {filter === "all" ? "Sin actividades" : "Sin actividades de este tipo"}
                    </div>
                ) : (
                    <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-graphite-gray/50" />
                        
                        <div className="space-y-0">
                            {filteredTimelineItems.map((item, index) => {
                                if (item.type === "activity") {
                                    const activity = item.data as ActivityWithUser;
                                    const config = getActivityConfig(activity);
                                    const Icon = config.icon;
                                    
                                    return (
                                        <div
                                            key={`activity-${activity.id}`}
                                            className="relative flex items-start gap-3 py-2 group"
                                        >
                                            {/* Icon */}
                                            <div className={`relative z-10 flex-shrink-0 w-6 h-6 rounded-full ${config.bgColor} flex items-center justify-center`}>
                                                <Icon size={12} className={config.color} />
                                            </div>
                                            
                                            {/* Content */}
                                            <div className="flex-1 min-w-0 pt-0.5">
                                                <div className="flex items-baseline justify-between gap-2">
                                                    {activity.type === "NOTE" ? (
                                                        <p className="text-sm text-dark-slate whitespace-pre-wrap break-words">
                                                            {activity.emailBody || activity.emailSubject}
                                                        </p>
                                                    ) : (
                                                        <p className="text-sm text-dark-slate font-medium truncate">
                                                            {activity.emailSubject}
                                                        </p>
                                                    )}
                                                    <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">
                                                        {formatRelativeTime(item.date)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className={`text-[10px] font-medium ${config.color} uppercase`}>
                                                        {config.label}
                                                    </span>
                                                    {activity.type !== "NOTE" && activity.emailTo && (
                                                        <>
                                                            <span className="text-gray-300">·</span>
                                                            <span className="text-[10px] text-gray-400 truncate">
                                                                {activity.emailTo}
                                                            </span>
                                                        </>
                                                    )}
                                                    {activity.type !== "NOTE" && activity.emailStatus && (
                                                        <>
                                                            <span className="text-gray-300">·</span>
                                                            {activity.emailStatus === "SENT" ? (
                                                                <CheckCircle size={10} className="text-success-green" />
                                                            ) : activity.emailStatus === "FAILED" ? (
                                                                <XCircle size={10} className="text-error-red" />
                                                            ) : (
                                                                <Clock size={10} className="text-gray-400" />
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                if (item.type === "invitation") {
                                    const invitation = item.data as ClientInvitationData;
                                    const isPending = invitation.status === "PENDING" && new Date() < new Date(invitation.expiresAt);
                                    const isAccepted = invitation.status === "ACCEPTED";
                                    
                                    return (
                                        <div
                                            key={`invitation-${invitation.id}`}
                                            className="relative flex items-start gap-3 py-2 group"
                                        >
                                            {/* Icon */}
                                            <div className={`relative z-10 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                                                isPending ? "bg-warning-amber/10" : isAccepted ? "bg-success-green/10" : "bg-gray-100"
                                            }`}>
                                                <UserPlus size={12} className={
                                                    isPending ? "text-warning-amber" : isAccepted ? "text-success-green" : "text-gray-400"
                                                } />
                                            </div>
                                            
                                            {/* Content */}
                                            <div className="flex-1 min-w-0 pt-0.5">
                                                <div className="flex items-baseline justify-between gap-2">
                                                    <p className="text-sm text-dark-slate font-medium truncate">
                                                        {invitation.contact.fullName}
                                                    </p>
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        {isPending && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCancelInvitation(invitation.id)}
                                                                disabled={cancelingId === invitation.id}
                                                                className="p-0.5 text-gray-400 hover:text-error-red transition-colors opacity-0 group-hover:opacity-100"
                                                                title="Cancelar"
                                                            >
                                                                {cancelingId === invitation.id ? (
                                                                    <Loader2 size={10} className="animate-spin" />
                                                                ) : (
                                                                    <Trash2 size={10} />
                                                                )}
                                                            </button>
                                                        )}
                                                        <span className="text-[10px] text-gray-400">
                                                            {formatRelativeTime(item.date)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-[10px] font-medium text-nearby-accent uppercase">
                                                        Invitación
                                                    </span>
                                                    <span className="text-gray-300">·</span>
                                                    {isPending ? (
                                                        <span className="inline-flex items-center gap-0.5 text-[10px] text-warning-amber">
                                                            <Clock size={9} />
                                                            Pendiente
                                                        </span>
                                                    ) : isAccepted ? (
                                                        <span className="inline-flex items-center gap-0.5 text-[10px] text-success-green">
                                                            <CheckCircle size={9} />
                                                            Aceptada
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400">
                                                            <XCircle size={9} />
                                                            {invitation.status === "REVOKED" ? "Cancelada" : "Expirada"}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                if (item.type === "contract") {
                                    const contract = item.data as ContractStatus;
                                    return (
                                        <div
                                            key={`contract-${index}`}
                                            className="relative flex items-start gap-3 py-2"
                                        >
                                            {/* Icon */}
                                            <div className="relative z-10 flex-shrink-0 w-6 h-6 rounded-full bg-success-green/10 flex items-center justify-center">
                                                <FileText size={12} className="text-success-green" />
                                            </div>
                                            
                                            {/* Content */}
                                            <div className="flex-1 min-w-0 pt-0.5">
                                                <div className="flex items-baseline justify-between gap-2">
                                                    <p className="text-sm text-dark-slate font-medium">
                                                        Contrato aceptado
                                                    </p>
                                                    <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">
                                                        {formatRelativeTime(item.date)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-[10px] font-medium text-success-green uppercase">
                                                        T&C
                                                    </span>
                                                    <span className="text-gray-300">·</span>
                                                    <span className="text-[10px] text-gray-400 truncate">
                                                        Por {contract.termsAcceptedByName}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                return null;
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Email Modal */}
            {showEmailModal && (
                <ComposeEmailModal
                    isOpen={showEmailModal}
                    onClose={() => setShowEmailModal(false)}
                    toEmail={defaultEmail}
                    companyId={companyId}
                />
            )}
        </div>
    );
}
