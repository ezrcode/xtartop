"use client";

import { LucideIcon, Plus, Building2, Users, TrendingUp } from "lucide-react";
import { Button } from "./button";
import { motion } from "framer-motion";
import Link from "next/link";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
    onAction?: () => void;
}

export function EmptyState({ 
    icon: Icon, 
    title, 
    description, 
    actionLabel,
    actionHref,
    onAction 
}: EmptyStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center py-12 px-4"
        >
            <motion.div 
                className="w-20 h-20 rounded-2xl bg-[var(--hover-bg)] flex items-center justify-center mb-6"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            >
                <Icon size={40} className="text-[var(--muted-text)]" />
            </motion.div>
            
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2 text-center">
                {title}
            </h3>
            <p className="text-sm text-[var(--muted-text)] max-w-sm text-center mb-6">
                {description}
            </p>
            
            {(actionLabel && actionHref) && (
                <Link href={actionHref}>
                    <Button 
                        variant="primary" 
                        leftIcon={<Plus size={18} />}
                    >
                        {actionLabel}
                    </Button>
                </Link>
            )}
            
            {(actionLabel && onAction && !actionHref) && (
                <Button 
                    variant="primary" 
                    leftIcon={<Plus size={18} />}
                    onClick={onAction}
                >
                    {actionLabel}
                </Button>
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
