"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
    title: string;
    count?: number;
    description?: string;
    icon?: LucideIcon;
    actions?: React.ReactNode;
    className?: string;
}

export function PageHeader({ title, count, description, icon: Icon, actions, className }: PageHeaderProps) {
    return (
        <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6", className)}>
            <div className="flex items-center gap-3">
                {Icon && (
                    <div className="hidden sm:flex h-10 w-10 rounded-xl bg-nearby-accent/10 items-center justify-center">
                        <Icon size={20} className="text-nearby-accent" />
                    </div>
                )}
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
                        {title}
                        {count !== undefined && (
                            <span className="text-sm font-medium text-[var(--muted-text)] bg-[var(--hover-bg)] px-2 py-0.5 rounded-full">
                                {count}
                            </span>
                        )}
                    </h1>
                    {description && (
                        <p className="text-sm text-[var(--muted-text)] mt-0.5">{description}</p>
                    )}
                </div>
            </div>
            {actions && (
                <div className="flex items-center gap-2 shrink-0">
                    {actions}
                </div>
            )}
        </div>
    );
}
