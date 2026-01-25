"use client";

import { useState } from "react";
import { CheckCircle, AlertCircle, Send, Clock, XCircle, Mail, Trash2, Loader2 } from "lucide-react";
import { sendClientInvitation, revokeInvitation } from "@/actions/client-invitation";
import { Contact } from "@prisma/client";

interface SubscriptionTabProps {
    company: {
        id: string;
        name: string;
        legalName: string | null;
        taxId: string | null;
        fiscalAddress: string | null;
        termsAccepted: boolean;
        termsAcceptedAt: Date | null;
        termsAcceptedByName: string | null;
        termsVersion: string | null;
    };
    contacts: Contact[];
    pendingInvitations: Array<{
        id: string;
        contactId: string;
        status: string;
        createdAt: Date;
        expiresAt: Date;
        contact: { fullName: string; email: string };
    }>;
}

export function SubscriptionTab({ company, contacts, pendingInvitations }: SubscriptionTabProps) {
    const [loading, setLoading] = useState(false);
    const [cancelingId, setCancelingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [selectedContactId, setSelectedContactId] = useState<string>("");

    // Filter contacts that belong to this company
    const companyContacts = contacts.filter(c => c.companyId === company.id);

    const handleSendInvitation = async () => {
        if (!selectedContactId) {
            setError("Selecciona un contacto");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const result = await sendClientInvitation(company.id, selectedContactId);

            if ("error" in result && result.error) {
                setError(result.error);
            } else {
                setSuccess("Invitación enviada exitosamente");
                setSelectedContactId("");
            }
        } catch (err) {
            setError("Ocurrió un error al enviar la invitación");
        }

        setLoading(false);
    };

    const handleCancelInvitation = async (invitationId: string) => {
        setCancelingId(invitationId);
        setError(null);
        setSuccess(null);

        try {
            const result = await revokeInvitation(invitationId);

            if ("error" in result && result.error) {
                setError(result.error);
            } else {
                setSuccess("Invitación cancelada exitosamente");
            }
        } catch (err) {
            setError("Ocurrió un error al cancelar la invitación");
        }

        setCancelingId(null);
    };

    return (
        <div className="space-y-6">
            {/* Terms Status */}
            <div className="p-4 rounded-lg border border-graphite-gray bg-soft-gray">
                <div className="flex items-center space-x-3 mb-2">
                    {company.termsAccepted ? (
                        <>
                            <CheckCircle className="text-success-green" size={24} />
                            <span className="text-lg font-semibold text-success-green">
                                Contrato Aceptado
                            </span>
                        </>
                    ) : (
                        <>
                            <AlertCircle className="text-warning-amber" size={24} />
                            <span className="text-lg font-semibold text-warning-amber">
                                Pendiente de Aceptación
                            </span>
                        </>
                    )}
                </div>
                {company.termsAccepted && company.termsAcceptedAt && (
                    <div className="text-sm text-dark-slate ml-9">
                        <p>
                            Aceptado por <strong>{company.termsAcceptedByName}</strong>
                        </p>
                        <p>
                            Fecha: {new Date(company.termsAcceptedAt).toLocaleDateString("es-DO", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </p>
                        {company.termsVersion && (
                            <p className="text-gray-500">Versión: {company.termsVersion}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Company Data for Contract */}
            <div>
                <h3 className="text-md font-semibold text-nearby-dark mb-3">
                    Datos para el Contrato
                </h3>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-dark-slate mb-1">
                            Razón Social
                        </label>
                        <div className="px-3 py-2 border border-graphite-gray rounded-md bg-white text-sm">
                            {company.legalName || <span className="text-gray-400 italic">Pendiente</span>}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-dark-slate mb-1">
                            RNC
                        </label>
                        <div className="px-3 py-2 border border-graphite-gray rounded-md bg-white text-sm">
                            {company.taxId || <span className="text-gray-400 italic">Pendiente</span>}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-dark-slate mb-1">
                            Dirección Fiscal
                        </label>
                        <div className="px-3 py-2 border border-graphite-gray rounded-md bg-white text-sm">
                            {company.fiscalAddress || <span className="text-gray-400 italic">Pendiente</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Send Invitation (only if not accepted) */}
            {!company.termsAccepted && (
                <div className="border-t border-graphite-gray pt-6">
                    <h3 className="text-md font-semibold text-nearby-dark mb-3">
                        Enviar Invitación al Portal
                    </h3>
                    <p className="text-sm text-dark-slate mb-4">
                        Envía una invitación a un contacto de esta empresa para que complete los datos 
                        y acepte los Términos y Condiciones.
                    </p>

                    {error && (
                        <div className="mb-4 bg-error-red/10 border border-error-red text-error-red px-4 py-2 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 bg-success-green/10 border border-success-green text-success-green px-4 py-2 rounded-md text-sm">
                            {success}
                        </div>
                    )}

                    {companyContacts.length === 0 ? (
                        <div className="text-sm text-gray-500 italic">
                            No hay contactos asociados a esta empresa. Crea un contacto primero.
                        </div>
                    ) : (
                        <div className="flex items-end space-x-3">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-dark-slate mb-1">
                                    Contacto
                                </label>
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
                                onClick={handleSendInvitation}
                                disabled={loading || !selectedContactId}
                                className="inline-flex items-center px-4 py-2 bg-nearby-accent text-white rounded-md hover:bg-nearby-dark transition-colors disabled:opacity-50"
                            >
                                <Send size={16} className="mr-2" />
                                {loading ? "Enviando..." : "Enviar Invitación"}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Pending Invitations */}
            {pendingInvitations.length > 0 && (
                <div className="border-t border-graphite-gray pt-6">
                    <h3 className="text-md font-semibold text-nearby-dark mb-3">
                        Invitaciones Enviadas
                    </h3>
                    <div className="space-y-2">
                        {pendingInvitations.map((inv) => (
                            <div
                                key={inv.id}
                                className="flex items-center justify-between p-3 bg-white border border-graphite-gray rounded-md"
                            >
                                <div className="flex items-center space-x-3">
                                    <Mail size={18} className="text-dark-slate" />
                                    <div>
                                        <p className="text-sm font-medium text-nearby-dark">
                                            {inv.contact.fullName}
                                        </p>
                                        <p className="text-xs text-gray-500">{inv.contact.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {inv.status === "PENDING" && new Date() < new Date(inv.expiresAt) ? (
                                        <>
                                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-warning-amber/10 text-warning-amber rounded">
                                                <Clock size={12} className="mr-1" />
                                                Pendiente
                                            </span>
                                            <button
                                                onClick={() => handleCancelInvitation(inv.id)}
                                                disabled={cancelingId === inv.id}
                                                className="inline-flex items-center px-2 py-1 text-xs font-medium text-error-red hover:bg-error-red/10 rounded transition-colors disabled:opacity-50"
                                                title="Cancelar invitación"
                                            >
                                                {cancelingId === inv.id ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : (
                                                    <Trash2 size={14} />
                                                )}
                                            </button>
                                        </>
                                    ) : inv.status === "ACCEPTED" ? (
                                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-success-green/10 text-success-green rounded">
                                            <CheckCircle size={12} className="mr-1" />
                                            Aceptada
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded">
                                            <XCircle size={12} className="mr-1" />
                                            {inv.status === "REVOKED" ? "Cancelada" : "Expirada"}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
