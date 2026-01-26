"use client";

import Link from "next/link";
import { Building2, Users, TrendingUp, Plus } from "lucide-react";
import { motion } from "framer-motion";

const actions = [
    {
        name: "Nueva Empresa",
        href: "/app/companies/new",
        icon: Building2,
        color: "bg-nearby-accent",
    },
    {
        name: "Nuevo Contacto",
        href: "/app/contacts/new",
        icon: Users,
        color: "bg-ocean-blue",
    },
    {
        name: "Nuevo Negocio",
        href: "/app/deals/new",
        icon: TrendingUp,
        color: "bg-success-green",
    },
];

export function QuickActions() {
    return (
        <div className="bg-white rounded-xl border border-graphite-gray p-5">
            <h3 className="text-sm font-semibold text-nearby-dark mb-4">
                Acciones Rápidas
            </h3>
            <div className="grid grid-cols-3 gap-3">
                {actions.map((action, index) => (
                    <motion.div
                        key={action.name}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Link
                            href={action.href}
                            className="flex flex-col items-center p-4 rounded-xl bg-soft-gray hover:bg-gray-100 transition-colors group"
                        >
                            <div className={`w-12 h-12 rounded-full ${action.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                                <action.icon size={22} className="text-white" />
                            </div>
                            <span className="text-xs font-medium text-dark-slate text-center">
                                {action.name}
                            </span>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
