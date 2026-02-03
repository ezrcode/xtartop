"use client";

import { useState, useEffect } from "react";
import { Sun, Moon, Monitor, Loader2 } from "lucide-react";
import { ThemePreference } from "@prisma/client";
import { updateThemePreference } from "@/actions/profile";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface ThemeToggleProps {
    initialTheme: ThemePreference;
    variant?: "icon" | "select" | "buttons";
}

export function ThemeToggle({ initialTheme, variant = "buttons" }: ThemeToggleProps) {
    const [theme, setTheme] = useState<ThemePreference>(initialTheme);
    const [isUpdating, setIsUpdating] = useState(false);

    // Apply theme class to document
    useEffect(() => {
        const root = document.documentElement;
        
        // Remove all theme classes
        root.classList.remove("dark", "theme-system");
        
        if (theme === "DARK") {
            root.classList.add("dark");
        } else if (theme === "SYSTEM") {
            root.classList.add("theme-system");
        }
        // LIGHT is the default (no class needed)
    }, [theme]);

    const handleThemeChange = async (newTheme: ThemePreference) => {
        if (newTheme === theme) return;
        
        setIsUpdating(true);
        setTheme(newTheme);
        
        try {
            await updateThemePreference(newTheme);
        } catch (error) {
            console.error("Error updating theme:", error);
            // Revert on error
            setTheme(theme);
        }
        
        setIsUpdating(false);
    };

    if (variant === "icon") {
        // Simple toggle between light and dark
        const nextTheme = theme === "DARK" ? "LIGHT" : "DARK";
        return (
            <Button
                variant="ghost"
                size="icon"
                onClick={() => handleThemeChange(nextTheme)}
                disabled={isUpdating}
                className="relative overflow-hidden"
                title={theme === "DARK" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            >
                <div className={cn(
                    "absolute transition-all duration-300",
                    theme === "DARK" ? "rotate-0 opacity-100" : "rotate-90 opacity-0"
                )}>
                    <Sun size={20} className="text-amber-400" />
                </div>
                <div className={cn(
                    "absolute transition-all duration-300",
                    theme === "DARK" ? "-rotate-90 opacity-0" : "rotate-0 opacity-100"
                )}>
                    <Moon size={20} className="text-[var(--muted-text)]" />
                </div>
                {isUpdating && (
                    <Loader2 size={20} className="animate-spin text-[var(--muted-text)]" />
                )}
            </Button>
        );
    }

    if (variant === "select") {
        return (
            <div className="relative">
                <select
                    value={theme}
                    onChange={(e) => handleThemeChange(e.target.value as ThemePreference)}
                    disabled={isUpdating}
                    className="w-full h-11 px-4 text-base border-2 border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--foreground)] rounded-xl focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-all appearance-none pr-12 cursor-pointer"
                >
                    <option value="LIGHT">Claro</option>
                    <option value="DARK">Oscuro</option>
                    <option value="SYSTEM">Automático (sistema)</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    {isUpdating ? (
                        <Loader2 size={18} className="animate-spin text-[var(--muted-text)]" />
                    ) : theme === "LIGHT" ? (
                        <Sun size={18} className="text-amber-400" />
                    ) : theme === "DARK" ? (
                        <Moon size={18} className="text-blue-400" />
                    ) : (
                        <Monitor size={18} className="text-[var(--muted-text)]" />
                    )}
                </div>
            </div>
        );
    }

    // Buttons variant (default)
    const options = [
        { value: "LIGHT" as const, icon: Sun, label: "Claro", activeColor: "text-amber-400" },
        { value: "DARK" as const, icon: Moon, label: "Oscuro", activeColor: "text-blue-400" },
        { value: "SYSTEM" as const, icon: Monitor, label: "Auto", activeColor: "text-[var(--foreground)]" },
    ];

    return (
        <div className="inline-flex items-center gap-1 p-1.5 bg-[var(--hover-bg)] rounded-xl">
            {options.map((option) => {
                const Icon = option.icon;
                const isActive = theme === option.value;
                return (
                    <button
                        key={option.value}
                        onClick={() => handleThemeChange(option.value)}
                        disabled={isUpdating}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                            isActive
                                ? "bg-[var(--card-bg)] text-[var(--foreground)] shadow-md"
                                : "text-[var(--muted-text)] hover:text-[var(--foreground)] hover:bg-[var(--card-bg)]/50"
                        )}
                    >
                        <Icon size={16} className={cn(isActive && option.activeColor)} />
                        <span className="hidden sm:inline">{option.label}</span>
                    </button>
                );
            })}
            {isUpdating && (
                <Loader2 size={14} className="animate-spin text-[var(--muted-text)] ml-1" />
            )}
        </div>
    );
}
