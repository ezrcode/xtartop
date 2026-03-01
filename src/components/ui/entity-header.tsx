"use client";

import Link from "next/link";
import { ArrowLeft, MoreHorizontal, Save, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EntityHeaderProps {
    backHref: string;
    backLabel: string;
    title: string;
    subtitle?: string;
    avatar?: React.ReactNode;
    status?: {
        label: string;
        variant: BadgeProps["variant"];
    };
    metadata?: Array<{ label: string; value: string }>;
    onSave?: () => void;
    onDelete?: () => void;
    saving?: boolean;
    extraActions?: React.ReactNode;
    className?: string;
}

export function EntityHeader({
    backHref,
    backLabel,
    title,
    subtitle,
    avatar,
    status,
    metadata,
    onSave,
    onDelete,
    saving,
    extraActions,
    className,
}: EntityHeaderProps) {
    return (
        <div className={cn("mb-6", className)}>
            {/* Back link */}
            <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-text)] hover:text-[var(--foreground)] transition-colors mb-3"
            >
                <ArrowLeft size={16} />
                {backLabel}
            </Link>

            {/* Main header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    {avatar && (
                        <div className="shrink-0">{avatar}</div>
                    )}
                    <div className="min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] truncate">
                                {title}
                            </h1>
                            {status && (
                                <Badge variant={status.variant} size="default">
                                    {status.label}
                                </Badge>
                            )}
                        </div>
                        {subtitle && (
                            <p className="text-sm text-[var(--muted-text)] mt-0.5">{subtitle}</p>
                        )}
                        {metadata && metadata.length > 0 && (
                            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-[var(--muted-text)]">
                                {metadata.map((m, i) => (
                                    <span key={i}>
                                        <span className="font-medium">{m.label}:</span> {m.value}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    {extraActions}
                    
                    {onSave && (
                        <Button type="submit" disabled={saving} form="entity-form">
                            {saving ? (
                                <span className="animate-spin mr-1">...</span>
                            ) : (
                                <Save size={16} />
                            )}
                            Guardar
                        </Button>
                    )}

                    {onDelete && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon-sm">
                                    <MoreHorizontal size={16} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onClick={onDelete}
                                    className="text-error-red focus:text-error-red focus:bg-error-red/10"
                                >
                                    <Trash2 size={14} className="mr-2" />
                                    Eliminar
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>
        </div>
    );
}
