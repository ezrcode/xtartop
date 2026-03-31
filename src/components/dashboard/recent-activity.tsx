"use client";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Mail, FolderOpen, Users, StickyNote, FileText } from "lucide-react";

interface Activity {
    id: string;
    type: string;
    subject: string;
    createdAt: Date;
    userName: string;
}

interface RecentActivityProps {
    activities: Activity[];
}

const typeIcons: Record<string, { icon: typeof Mail; color: string; bg: string }> = {
    EMAIL: { icon: Mail, color: "text-nearby-dark dark:text-nearby-dark-200", bg: "bg-nearby-dark-50 dark:bg-nearby-dark-600/30" },
    PROJECT: { icon: FolderOpen, color: "text-nearby-accent", bg: "bg-nearby-accent-50 dark:bg-nearby-accent/10" },
    CLIENT_USER: { icon: Users, color: "text-ocean-blue", bg: "bg-info-blue/10" },
    NOTE: { icon: StickyNote, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-500/10" },
    CONTRACT: { icon: FileText, color: "text-success-green", bg: "bg-success-green/10" },
};

export function RecentActivity({ activities }: RecentActivityProps) {
    if (activities.length === 0) {
        return (
            <div className="bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)] p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">
                    Actividad Reciente
                </h3>
                <div className="text-center py-6 sm:py-8 text-[var(--muted-text)] text-sm">
                    No hay actividad reciente
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)] p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3 sm:mb-4">
                Actividad Reciente
            </h3>
            <div className="space-y-2 sm:space-y-3 max-h-[250px] sm:max-h-[300px] overflow-y-auto">
                {activities.map((activity) => {
                    const config = typeIcons[activity.type] || typeIcons.EMAIL;
                    const Icon = config.icon;

                    return (
                        <div
                            key={activity.id}
                            className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
                        >
                            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
                                <Icon size={13} className={config.color} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm text-[var(--foreground)] font-medium truncate">
                                    {activity.subject}
                                </p>
                                <p className="text-[10px] sm:text-xs text-[var(--muted-text)] mt-0.5">
                                    {activity.userName} · {formatDistanceToNow(new Date(activity.createdAt), { 
                                        addSuffix: true, 
                                        locale: es 
                                    })}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
