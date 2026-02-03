"use client";

import { LucideIcon, Plus, Building2, Users, TrendingUp } from "lucide-react";
import { Button } from "./button";
import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
    onAction?: () => void;
    size?: "sm" | "default" | "lg";
}

export function EmptyState({ 
    icon: Icon, 
    title, 
    description, 
    actionLabel,
    actionHref,
    onAction,
    size = "default"
}: EmptyStateProps) {
    const sizeClasses = {
        sm: {
            container: "py-8",
            iconBox: "w-14 h-14 mb-4",
            icon: 28,
            title: "text-base",
            desc: "text-xs mb-4",
        },
        default: {
            container: "py-16",
            iconBox: "w-20 h-20 mb-6",
            icon: 40,
            title: "text-xl",
            desc: "text-sm mb-8",
        },
        lg: {
            container: "py-24",
            iconBox: "w-28 h-28 mb-8",
            icon: 56,
            title: "text-2xl",
            desc: "text-base mb-10",
        },
    };

    const s = sizeClasses[size];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={cn("flex flex-col items-center justify-center px-4", s.container)}
        >
            <motion.div 
                className={cn(
                    "rounded-2xl bg-gradient-to-br from-[var(--hover-bg)] to-[var(--card-border)]/30 flex items-center justify-center shadow-inner",
                    s.iconBox
                )}
                initial={{ scale: 0.8, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
            >
                <Icon size={s.icon} className="text-[var(--muted-text)]" strokeWidth={1.5} />
            </motion.div>
            
            <motion.h3 
                className={cn("font-semibold text-[var(--foreground)] mb-2 text-center", s.title)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                {title}
            </motion.h3>
            <motion.p 
                className={cn("text-[var(--muted-text)] max-w-md text-center", s.desc)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                {description}
            </motion.p>
            
            {(actionLabel && actionHref) && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Link href={actionHref}>
                        <Button variant="primary" size={size === "sm" ? "sm" : "default"}>
                            <Plus size={18} />
                            {actionLabel}
                        </Button>
                    </Link>
                </motion.div>
            )}
            
            {(actionLabel && onAction && !actionHref) && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Button 
                        variant="primary"
                        size={size === "sm" ? "sm" : "default"}
                        onClick={onAction}
                    >
                        <Plus size={18} />
                        {actionLabel}
                    </Button>
                </motion.div>
            )}
        </motion.div>
    );
}

// Pre-built empty states
export function EmptyCompanies() {
    return (
        <EmptyState
            icon={Building2}
            title="Sin empresas"
            description="Aún no has agregado ninguna empresa. Comienza agregando tu primera empresa para gestionar tus clientes."
            actionLabel="Agregar empresa"
            actionHref="/app/companies/new"
        />
    );
}

export function EmptyContacts() {
    return (
        <EmptyState
            icon={Users}
            title="Sin contactos"
            description="Aún no tienes contactos registrados. Agrega contactos para gestionar tus relaciones comerciales."
            actionLabel="Agregar contacto"
            actionHref="/app/contacts/new"
        />
    );
}

export function EmptyDeals() {
    return (
        <EmptyState
            icon={TrendingUp}
            title="Sin negocios"
            description="Aún no tienes negocios registrados. Crea tu primer negocio para hacer seguimiento de tus oportunidades."
            actionLabel="Crear negocio"
            actionHref="/app/deals/new"
        />
    );
}
