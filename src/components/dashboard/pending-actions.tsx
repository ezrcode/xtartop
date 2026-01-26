"use client";

import Link from "next/link";
import { Send, FileText, UserCheck, Activity } from "lucide-react";
import { motion } from "framer-motion";

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
            color: "text-orange-600",
            bgColor: "bg-orange-50",
            href: "/app/companies",
        },
        {
            label: "Cotizaciones",
            sublabel: "en borrador",
            count: draftQuotes,
            icon: FileText,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
            href: "/app/deals",
        },
        {
            label: "Onboarding",
            sublabel: "pendiente",
            count: pendingOnboarding,
            icon: UserCheck,
            color: "text-purple-600",
            bgColor: "bg-purple-50",
            href: "/app/companies",
        },
        {
            label: "Actividad",
            sublabel: "hoy",
            count: todayActivities,
            icon: Activity,
            color: "text-green-600",
            bgColor: "bg-green-50",
            href: "/app",
        },
    ];

    return (
        <div className="bg-white rounded-xl border border-graphite-gray p-5">
            <h3 className="text-sm font-semibold text-nearby-dark mb-4">Acciones Pendientes</h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {actions.map((action, index) => (
                    <motion.div
                        key={action.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <Link
                            href={action.href}
                            className={`block p-3 rounded-lg ${action.bgColor} hover:scale-[1.02] transition-transform`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <action.icon size={16} className={action.color} />
                                <span className={`text-xl font-bold ${action.color}`}>
                                    {action.count}
                                </span>
                            </div>
                            <div className="text-xs font-medium text-gray-700">{action.label}</div>
                            <div className="text-[10px] text-gray-500">{action.sublabel}</div>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
