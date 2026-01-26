"use client";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Mail, FolderOpen, Users, StickyNote, FileText } from "lucide-react";
import { motion } from "framer-motion";

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
    EMAIL: { icon: Mail, color: "text-nearby-dark", bg: "bg-nearby-dark-50" },
    PROJECT: { icon: FolderOpen, color: "text-nearby-accent", bg: "bg-nearby-accent-50" },
    CLIENT_USER: { icon: Users, color: "text-ocean-blue", bg: "bg-blue-50" },
    NOTE: { icon: StickyNote, color: "text-purple-600", bg: "bg-purple-50" },
    CONTRACT: { icon: FileText, color: "text-success-green", bg: "bg-green-50" },
};

export function RecentActivity({ activities }: RecentActivityProps) {
    if (activities.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-graphite-gray p-5">
                <h3 className="text-sm font-semibold text-nearby-dark mb-4">
                    Actividad Reciente
                </h3>
                <div className="text-center py-8 text-gray-400 text-sm">
                    No hay actividad reciente
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-graphite-gray p-5">
            <h3 className="text-sm font-semibold text-nearby-dark mb-4">
                Actividad Reciente
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {activities.map((activity, index) => {
                    const config = typeIcons[activity.type] || typeIcons.EMAIL;
                    const Icon = config.icon;

                    return (
                        <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-soft-gray transition-colors"
                        >
                            <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
                                <Icon size={14} className={config.color} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-dark-slate font-medium truncate">
                                    {activity.subject}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {activity.userName} · {formatDistanceToNow(new Date(activity.createdAt), { 
                                        addSuffix: true, 
                                        locale: es 
                                    })}
                                </p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
