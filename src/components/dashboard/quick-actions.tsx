"use client";

import Link from "next/link";
import { Building2, Users, TrendingUp } from "lucide-react";

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
        <div className="bg-white rounded-xl border border-graphite-gray p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-nearby-dark mb-3 sm:mb-4">
                Acciones Rápidas
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {actions.map((action) => (
                    <Link
                        key={action.name}
                        href={action.href}
                        className="flex flex-col items-center p-3 sm:p-4 rounded-xl bg-soft-gray active:bg-gray-200 hover:bg-gray-100 transition-colors group"
                    >
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${action.color} flex items-center justify-center mb-1.5 sm:mb-2 group-active:scale-95 transition-transform`}>
                            <action.icon size={20} className="text-white" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-dark-slate text-center leading-tight">
                            {action.name}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
