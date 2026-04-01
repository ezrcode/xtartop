"use client";

import Link from "next/link";
import { Send, FileText, UserCheck, Activity } from "lucide-react";

interface PendingActionsProps {
    pendingInvitations: number;
    draftQuotes: number;
    pendingOnboarding: number;
    todayActivities: number;
}

export function PendingActions({ 
    pendingInvitations, 
    draftQuotes, 
    pendingOnboarding, 
    todayActivities 
}: PendingActionsProps) {
    const actions = [
        {
            label: "Invitaciones",
            sublabel: "pendientes",
            count: pendingInvitations,
            icon: Send,
            color: "text-nearby-dark dark:text-nearby-dark-300",
            bgColor: "bg-nearby-dark/8 dark:bg-nearby-dark-300/10",
            href: "/app/companies",
        },
        {
            label: "Cotizaciones",
            sublabel: "en borrador",
            count: draftQuotes,
            icon: FileText,
            color: "text-ocean-blue",
            bgColor: "bg-info-blue/10",
            href: "/app/deals",
        },
        {
            label: "Onboarding",
            sublabel: "pendiente",
            count: pendingOnboarding,
            icon: UserCheck,
            color: "text-purple-500 dark:text-purple-400",
            bgColor: "bg-purple-500/10",
            href: "/app/companies",
        },
        {
            label: "Actividad",
            sublabel: "hoy",
            count: todayActivities,
            icon: Activity,
            color: "text-success-green",
            bgColor: "bg-success-green/10",
            href: "/app",
        },
    ];

    return (
        <div className="bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)] p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3 sm:mb-4">Acciones Pendientes</h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {actions.map((action) => (
                    <Link
                        key={action.label}
                        href={action.href}
                        className={`block p-3 rounded-lg ${action.bgColor} hover:opacity-90 transition-all`}
                    >
                        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                            <action.icon size={18} className={action.color} />
                            <span className={`text-lg sm:text-xl font-bold ${action.color}`}>
                                {action.count}
                            </span>
                        </div>
                        <div className="text-xs font-medium text-[var(--foreground)]">{action.label}</div>
                        <div className="text-[10px] text-[var(--muted-text)]">{action.sublabel}</div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
