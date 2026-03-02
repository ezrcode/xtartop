"use client";

import { Menu, Banknote, Search } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ThemePreference } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

interface TopbarProps {
    user: {
        name?: string | null;
        email?: string | null;
        photoUrl?: string | null;
        themePreference?: ThemePreference;
    };
    currentExchangeRate?: number | null;
    onMenuClick: () => void;
}

export function Topbar({ user, currentExchangeRate = null, onMenuClick }: TopbarProps) {
    const formattedRate = currentExchangeRate !== null
        ? currentExchangeRate.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
        : null;

    const openCommandPalette = () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
    };

    return (
        <header
            className="sticky top-0 z-40 bg-[var(--card-bg)]/85 backdrop-blur-xl border-b border-[var(--card-border)] shadow-[0_1px_0_var(--card-border)]"
            style={{
                paddingTop: "env(safe-area-inset-top)",
                paddingLeft: "env(safe-area-inset-left)",
                paddingRight: "env(safe-area-inset-right)",
            }}
        >
            <div className="relative flex items-center h-[60px] sm:h-14 px-3 sm:px-6 lg:px-8">
                {/* Left side */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={onMenuClick}
                        className="md:hidden shrink-0"
                        aria-label="Abrir menú"
                    >
                        <Menu size={20} />
                    </Button>
                    
                    <div className="hidden md:block min-w-0">
                        <Breadcrumbs />
                    </div>
                </div>

                {/* Right side */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 shrink-0 md:static md:translate-y-0">
                    {/* Search button (mobile) */}
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={openCommandPalette}
                        className="md:hidden"
                        aria-label="Buscar"
                    >
                        <Search size={18} />
                    </Button>

                    {/* Exchange Rate Pill */}
                    {formattedRate && (
                        <div className={cn(
                            "hidden sm:flex items-center gap-2",
                            "px-3 py-1.5 rounded-full border",
                            "bg-gradient-to-r from-nearby-accent/10 via-nearby-accent/5 to-transparent",
                            "border-nearby-accent/20 text-[var(--foreground)] shadow-sm"
                        )}>
                            <div className="h-5 w-5 rounded-full bg-nearby-accent/15 flex items-center justify-center">
                                <Banknote size={12} className="text-nearby-accent" />
                            </div>
                            <div className="leading-tight">
                                <p className="text-[9px] uppercase tracking-wide text-[var(--muted-text)]">
                                    Tasa
                                </p>
                                <p className="text-xs font-semibold">
                                    {formattedRate}
                                </p>
                            </div>
                        </div>
                    )}

                    <ThemeToggle 
                        initialTheme={user.themePreference || "LIGHT"} 
                        variant="icon"
                        buttonClassName="h-9 w-9 min-h-0 min-w-0 md:h-11 md:w-11"
                    />
                </div>
            </div>
        </header>
    );
}
