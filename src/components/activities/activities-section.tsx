"use client";

import { useState } from "react";
import { Plus, Mail, CheckCircle, XCircle, Clock } from "lucide-react";
import { ComposeEmailModal } from "./compose-email-modal";
import type { Activity, User } from "@prisma/client";

type ActivityWithUser = Activity & {
    createdBy: Pick<User, 'name' | 'email' | 'photoUrl'>;
};

interface ActivitiesSectionProps {
    activities: ActivityWithUser[];
    entityType: "company" | "contact" | "deal";
    entityId: string;
    defaultEmail?: string;
}

export function ActivitiesSection({
    activities,
    entityType,
    entityId,
    defaultEmail = "",
}: ActivitiesSectionProps) {
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

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

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-nearby-dark">Actividades</h3>
                <div className="relative">
                    <button
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
                            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                                <div className="py-1">
                                    <button
                                        onClick={handleNewEmail}
                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        <Mail size={16} className="mr-3" />
                                        Correo electrónico
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Activities List */}
            <div className="space-y-3">
                {activities.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                        No hay actividades registradas
                    </div>
                ) : (
                    activities.map((activity) => (
                        <div
                            key={activity.id}
                            className="bg-white border border-graphite-gray rounded-lg p-4 hover:shadow-sm transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
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
                                    {new Date(activity.createdAt).toLocaleDateString("es-ES", {
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
                    ))
                )}
            </div>

            {/* Email Modal - only render when open */}
            {showEmailModal && (
                <ComposeEmailModal
                    isOpen={showEmailModal}
                    onClose={() => setShowEmailModal(false)}
                    toEmail={defaultEmail}
                    companyId={entityType === "company" ? entityId : undefined}
                    contactId={entityType === "contact" ? entityId : undefined}
                    dealId={entityType === "deal" ? entityId : undefined}
                />
            )}
        </div>
    );
}

