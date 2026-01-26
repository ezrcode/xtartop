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
    UserPlus
} from "lucide-react";
import { ComposeEmailModal } from "./compose-email-modal";
import { sendClientInvitation, revokeInvitation } from "@/actions/client-invitation";
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
    
    // Invitation state
    const [selectedContactId, setSelectedContactId] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [cancelingId, setCancelingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "SENT":
                return <CheckCircle size={14} className="text-success-green" />;
            case "FAILED":
                return <XCircle size={14} className="text-error-red" />;
            default:
                return <Clock size={14} className="text-gray-400" />;
        }
    };

    const handleNewEmail = () => {
        setShowMenu(false);
        setShowEmailModal(true);
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

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-nearby-dark">Actividades</h3>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowMenu(!showMenu)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-nearby-accent text-white hover:bg-ocean-blue transition-colors"
                    >
                        <Plus size={18} />
                    </button>

                    {/* Dropdown Menu */}
                    {showMenu && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowMenu(false)}
                            />
                            <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                                <div className="py-1">
                                    <button
                                        type="button"
                                        onClick={handleNewEmail}
                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        <Mail size={16} className="mr-3" />
                                        Correo electrónico
                                    </button>
                                    {!contractStatus.termsAccepted && (
                                        <button
                                            type="button"
                                            onClick={handleNewInvitation}
                                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            <UserPlus size={16} className="mr-3" />
                                            Invitación al portal
                                        </button>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Error/Success messages */}
            {error && (
                <div className="bg-error-red/10 border border-error-red text-error-red px-3 py-2 rounded-md text-sm">
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-success-green/10 border border-success-green text-success-green px-3 py-2 rounded-md text-sm">
                    {success}
                </div>
            )}

            {/* Invite Form (inline) */}
            {showInviteForm && (
                <div className="bg-soft-gray border border-graphite-gray rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium text-dark-slate text-sm">Nueva Invitación</h4>
                        <button
                            type="button"
                            onClick={() => setShowInviteForm(false)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <XCircle size={18} />
                        </button>
                    </div>
                    {companyContacts.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">
                            No hay contactos asociados a esta empresa. Crea un contacto primero.
                        </p>
                    ) : (
                        <div className="flex items-end gap-2">
                            <div className="flex-1">
                                <select
                                    value={selectedContactId}
                                    onChange={(e) => setSelectedContactId(e.target.value)}
                                    className="w-full px-3 py-2 border border-graphite-gray rounded-md shadow-sm focus:ring-nearby-accent focus:border-nearby-accent text-sm"
                                >
                                    <option value="">Seleccionar contacto...</option>
                                    {companyContacts.map((contact) => (
                                        <option key={contact.id} value={contact.id}>
                                            {contact.fullName} ({contact.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="button"
                                onClick={handleSendInvitation}
                                disabled={loading || !selectedContactId}
                                className="inline-flex items-center px-3 py-2 bg-nearby-accent text-white rounded-md hover:bg-nearby-dark transition-colors disabled:opacity-50 text-sm"
                            >
                                {loading ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <>
                                        <Send size={14} className="mr-1" />
                                        Enviar
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Contract Status Banner (if not accepted) */}
            {!contractStatus.termsAccepted && (
                <div className="bg-warning-amber/10 border border-warning-amber rounded-lg p-3 flex items-center gap-3">
                    <AlertCircle size={20} className="text-warning-amber flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-warning-amber">Contrato pendiente</p>
                        <p className="text-xs text-dark-slate">
                            El cliente aún no ha aceptado los Términos y Condiciones
                        </p>
                    </div>
                </div>
            )}

            {/* Timeline */}
            <div className="space-y-3">
                {timelineItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                        No hay actividades registradas
                    </div>
                ) : (
                    timelineItems.map((item, index) => {
                        if (item.type === "activity") {
                            const activity = item.data as ActivityWithUser;
                            return (
                                <div
                                    key={`activity-${activity.id}`}
                                    className="bg-white border border-graphite-gray rounded-lg p-4 hover:shadow-sm transition-shadow"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Mail size={14} className="text-dark-slate" />
                                                <span className="text-xs font-medium text-gray-500 uppercase">
                                                    {activity.type}
                                                </span>
                                                {activity.emailStatus && getStatusIcon(activity.emailStatus)}
                                            </div>
                                            <h4 className="font-medium text-dark-slate">
                                                {activity.emailSubject}
                                            </h4>
                                            {activity.emailTo && (
                                                <p className="text-sm text-gray-600 mt-1">
                                                    Para: {activity.emailTo}
                                                </p>
                                            )}
                                            {activity.errorMsg && (
                                                <p className="text-sm text-error-red mt-1">
                                                    {activity.errorMsg}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 whitespace-nowrap ml-4">
                                            {item.date.toLocaleDateString("es-ES", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                                        <span>Por {activity.createdBy.name || activity.createdBy.email}</span>
                                    </div>
                                </div>
                            );
                        }

                        if (item.type === "invitation") {
                            const invitation = item.data as ClientInvitationData;
                            const isPending = invitation.status === "PENDING" && new Date() < new Date(invitation.expiresAt);
                            
                            return (
                                <div
                                    key={`invitation-${invitation.id}`}
                                    className="bg-white border border-graphite-gray rounded-lg p-4 hover:shadow-sm transition-shadow"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <UserPlus size={14} className="text-nearby-accent" />
                                                <span className="text-xs font-medium text-gray-500 uppercase">
                                                    Invitación al Portal
                                                </span>
                                            </div>
                                            <h4 className="font-medium text-dark-slate">
                                                {invitation.contact.fullName}
                                            </h4>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {invitation.contact.email}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isPending ? (
                                                <>
                                                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-warning-amber/10 text-warning-amber rounded">
                                                        <Clock size={12} className="mr-1" />
                                                        Pendiente
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCancelInvitation(invitation.id)}
                                                        disabled={cancelingId === invitation.id}
                                                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-error-red hover:bg-error-red/10 rounded transition-colors disabled:opacity-50"
                                                        title="Cancelar invitación"
                                                    >
                                                        {cancelingId === invitation.id ? (
                                                            <Loader2 size={14} className="animate-spin" />
                                                        ) : (
                                                            <Trash2 size={14} />
                                                        )}
                                                    </button>
                                                </>
                                            ) : invitation.status === "ACCEPTED" ? (
                                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-success-green/10 text-success-green rounded">
                                                    <CheckCircle size={12} className="mr-1" />
                                                    Aceptada
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded">
                                                    <XCircle size={12} className="mr-1" />
                                                    {invitation.status === "REVOKED" ? "Cancelada" : "Expirada"}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-500">
                                        {item.date.toLocaleDateString("es-ES", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </div>
                                </div>
                            );
                        }

                        if (item.type === "contract") {
                            const contract = item.data as ContractStatus;
                            return (
                                <div
                                    key={`contract-${index}`}
                                    className="bg-success-green/5 border border-success-green rounded-lg p-4"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <FileText size={14} className="text-success-green" />
                                                <span className="text-xs font-medium text-success-green uppercase">
                                                    Contrato Aceptado
                                                </span>
                                            </div>
                                            <h4 className="font-medium text-dark-slate">
                                                Términos y Condiciones
                                            </h4>
                                            <p className="text-sm text-gray-600 mt-1">
                                                Aceptado por <strong>{contract.termsAcceptedByName}</strong>
                                            </p>
                                            {contract.termsVersion && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Versión: {contract.termsVersion}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 whitespace-nowrap ml-4">
                                            {item.date.toLocaleDateString("es-ES", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        return null;
                    })
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
