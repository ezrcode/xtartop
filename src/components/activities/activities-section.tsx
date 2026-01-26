"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
    Plus, 
    Mail, 
    CheckCircle, 
    XCircle, 
    Clock, 
    StickyNote,
    Filter,
    Paperclip,
    Loader2,
    FileText,
    Image as ImageIcon,
    File
} from "lucide-react";
import { ComposeEmailModal } from "./compose-email-modal";
import { createNoteGeneric } from "@/actions/notes";
import { FileUpload } from "@/components/ui/file-upload";
import type { Activity, User } from "@prisma/client";

interface UploadedFile {
    url: string;
    filename: string;
    type: string;
    size: number;
}

type ActivityWithUser = Activity & {
    createdBy: Pick<User, 'name' | 'email' | 'photoUrl'>;
};

interface ActivitiesSectionProps {
    activities: ActivityWithUser[];
    entityType: "company" | "contact" | "deal";
    entityId: string;
    defaultEmail?: string;
}

// Helper to format relative time
function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "ahora";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    
    // Incluir año si no es el año actual
    const isCurrentYear = date.getFullYear() === now.getFullYear();
    if (isCurrentYear) {
        return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
    }
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

// Helper to get file icon
function getFileIcon(type: string) {
    if (type.startsWith("image/")) return ImageIcon;
    if (type === "application/pdf") return FileText;
    return File;
}

export function ActivitiesSection({
    activities,
    entityType,
    entityId,
    defaultEmail = "",
}: ActivitiesSectionProps) {
    const router = useRouter();
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showNoteForm, setShowNoteForm] = useState(false);
    const [noteContent, setNoteContent] = useState("");
    const [noteAttachments, setNoteAttachments] = useState<UploadedFile[]>([]);
    const [filter, setFilter] = useState<"all" | "EMAIL" | "NOTE">("all");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleNewEmail = () => {
        setShowMenu(false);
        setShowEmailModal(true);
    };

    const handleNewNote = () => {
        setShowMenu(false);
        setShowNoteForm(true);
    };

    const handleSaveNote = async () => {
        if (!noteContent.trim() && noteAttachments.length === 0) {
            setError("Escribe una nota o adjunta un archivo");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const attachmentsJson = noteAttachments.length > 0 
                ? JSON.stringify(noteAttachments) 
                : undefined;

            const result = await createNoteGeneric({
                entityType,
                entityId,
                content: noteContent.trim() || "Archivo adjunto",
                attachmentsJson,
            });

            if ("error" in result && result.error) {
                setError(result.error);
                setLoading(false);
            } else {
                setNoteContent("");
                setNoteAttachments([]);
                setShowNoteForm(false);
                setLoading(false);
                setTimeout(() => {
                    router.refresh();
                }, 100);
            }
        } catch {
            setError("Error al crear la nota");
            setLoading(false);
        }
    };

    // Get activity config for timeline display
    const getActivityConfig = (activity: ActivityWithUser) => {
        switch (activity.type) {
            case "EMAIL":
                return {
                    icon: Mail,
                    color: activity.emailStatus === "SENT" ? "text-success-green" : activity.emailStatus === "FAILED" ? "text-error-red" : "text-gray-500",
                    bgColor: activity.emailStatus === "SENT" ? "bg-success-green/10" : activity.emailStatus === "FAILED" ? "bg-error-red/10" : "bg-gray-100",
                    label: activity.emailSubject || "Correo",
                };
            case "NOTE":
                return {
                    icon: StickyNote,
                    color: "text-purple-600",
                    bgColor: "bg-purple-100",
                    label: activity.emailBody || "Nota",
                };
            default:
                return {
                    icon: Clock,
                    color: "text-gray-500",
                    bgColor: "bg-gray-100",
                    label: activity.type,
                };
        }
    };

    // Filter activities
    const filteredActivities = filter === "all" 
        ? activities 
        : activities.filter(a => a.type === filter);

    return (
        <div className="flex flex-col h-full">
            {/* Compact Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-nearby-dark">Actividades</h3>
                    <span className="text-xs text-gray-400">({activities.length})</span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Filter Dropdown */}
                    <div className="relative">
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as typeof filter)}
                            className="text-xs bg-white border border-gray-200 rounded-md px-2 py-1 pr-6 appearance-none cursor-pointer hover:border-gray-300"
                        >
                            <option value="all">Todas</option>
                            <option value="EMAIL">Emails</option>
                            <option value="NOTE">Notas</option>
                        </select>
                        <Filter size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Add Button */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowMenu(!showMenu)}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-nearby-accent text-white hover:bg-ocean-blue transition-colors"
                        >
                            <Plus size={14} />
                        </button>

                        {showMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowMenu(false)}
                                />
                                <div className="absolute right-0 mt-1 w-40 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 py-1">
                                    <button
                                        type="button"
                                        onClick={handleNewEmail}
                                        className="flex items-center w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                                    >
                                        <Mail size={14} className="mr-2 text-ocean-blue" />
                                        Correo electrónico
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleNewNote}
                                        className="flex items-center w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                                    >
                                        <StickyNote size={14} className="mr-2 text-purple-600" />
                                        Nueva nota
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-2 px-2 py-1.5 bg-error-red/10 text-error-red text-xs rounded">
                    {error}
                </div>
            )}

            {/* Note Form (inline) */}
            {showNoteForm && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-purple-700 text-xs">Nueva Nota</span>
                        <button
                            type="button"
                            onClick={() => {
                                setShowNoteForm(false);
                                setNoteContent("");
                                setNoteAttachments([]);
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
                        
                        {/* Attachments */}
                        <FileUpload
                            files={noteAttachments}
                            onFilesChange={setNoteAttachments}
                            folder={`notes/${entityType}/${entityId}`}
                            maxFiles={5}
                        />

                        <div className="flex justify-between items-center">
                            <span className="text-[10px] text-gray-500">
                                {noteAttachments.length > 0 && (
                                    <span className="flex items-center gap-1">
                                        <Paperclip size={10} />
                                        {noteAttachments.length} archivo{noteAttachments.length > 1 ? 's' : ''}
                                    </span>
                                )}
                            </span>
                            <button
                                type="button"
                                onClick={handleSaveNote}
                                disabled={loading || (!noteContent.trim() && noteAttachments.length === 0)}
                                className="inline-flex items-center px-2 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50 text-xs"
                            >
                                {loading ? <Loader2 size={12} className="animate-spin" /> : "Guardar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Timeline - Scrollable */}
            <div className="flex-1 overflow-y-auto pr-1 -mr-1">
                {filteredActivities.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs">
                        {filter === "all" ? "Sin actividades" : "Sin actividades de este tipo"}
                    </div>
                ) : (
                    <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-graphite-gray/50" />
                        
                        <div className="space-y-0">
                            {filteredActivities.map((activity) => {
                                const config = getActivityConfig(activity);
                                const Icon = config.icon;
                                const attachments = activity.attachments ? JSON.parse(activity.attachments) as UploadedFile[] : [];
                                
                                return (
                                    <div
                                        key={activity.id}
                                        className="relative flex items-start gap-3 py-2 group"
                                    >
                                        {/* Icon */}
                                        <div className={`relative z-10 flex-shrink-0 w-6 h-6 rounded-full ${config.bgColor} flex items-center justify-center`}>
                                            <Icon size={12} className={config.color} />
                                        </div>
                                        
                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-dark-slate leading-relaxed line-clamp-2">
                                                        {config.label}
                                                    </p>
                                                    {activity.type === "EMAIL" && activity.emailTo && (
                                                        <p className="text-[10px] text-gray-500 mt-0.5">
                                                            Para: {activity.emailTo}
                                                        </p>
                                                    )}
                                                    {/* Attachments */}
                                                    {attachments.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {attachments.map((file, idx) => {
                                                                const FileIcon = getFileIcon(file.type);
                                                                return (
                                                                    <a
                                                                        key={idx}
                                                                        href={file.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600 hover:bg-gray-200"
                                                                    >
                                                                        <FileIcon size={10} />
                                                                        <span className="truncate max-w-[80px]">{file.filename}</span>
                                                                    </a>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">
                                                    {formatRelativeTime(new Date(activity.createdAt))}
                                                </span>
                                            </div>
                                            {/* User who created */}
                                            <p className="text-[10px] text-gray-400 mt-0.5">
                                                {activity.createdBy.name || activity.createdBy.email?.split('@')[0]}
                                            </p>
                                        </div>
                                    </div>
                                );
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
                    companyId={entityType === "company" ? entityId : undefined}
                    contactId={entityType === "contact" ? entityId : undefined}
                    dealId={entityType === "deal" ? entityId : undefined}
                />
            )}
        </div>
    );
}
