"use client";

import { useState, useEffect } from "react";
import { Sun, Moon, Monitor, Loader2 } from "lucide-react";
import { ThemePreference } from "@prisma/client";
import { updateThemePreference } from "@/actions/profile";

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
            <button
                onClick={() => handleThemeChange(nextTheme)}
                disabled={isUpdating}
                className="p-2 rounded-lg hover:bg-[var(--hover-bg)] transition-colors disabled:opacity-50"
                title={theme === "DARK" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            >
                {isUpdating ? (
                    <Loader2 size={20} className="animate-spin text-[var(--muted-text)]" />
                ) : theme === "DARK" ? (
                    <Sun size={20} className="text-yellow-500" />
                ) : (
                    <Moon size={20} className="text-[var(--muted-text)]" />
                )}
            </button>
        );
    }

    if (variant === "select") {
        return (
            <div className="relative">
                <select
                    value={theme}
                    onChange={(e) => handleThemeChange(e.target.value as ThemePreference)}
                    disabled={isUpdating}
                    className="w-full px-3 py-3 sm:py-2 text-base sm:text-sm border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--foreground)] rounded-lg sm:rounded-md shadow-sm focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-colors appearance-none pr-10"
                >
                    <option value="LIGHT">Claro</option>
                    <option value="DARK">Oscuro</option>
                    <option value="SYSTEM">Automático (sistema)</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    {isUpdating ? (
                        <Loader2 size={16} className="animate-spin text-[var(--muted-text)]" />
                    ) : theme === "LIGHT" ? (
                        <Sun size={16} className="text-yellow-500" />
                    ) : theme === "DARK" ? (
                        <Moon size={16} className="text-blue-400" />
                    ) : (
                        <Monitor size={16} className="text-[var(--muted-text)]" />
                    )}
                </div>
            </div>
        );
    }

    // Buttons variant (default)
    return (
        <div className="flex items-center gap-1 p-1 bg-[var(--hover-bg)] rounded-lg">
            <button
                onClick={() => handleThemeChange("LIGHT")}
                disabled={isUpdating}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    theme === "LIGHT"
                        ? "bg-[var(--card-bg)] text-[var(--foreground)] shadow-sm"
                        : "text-[var(--muted-text)] hover:text-[var(--foreground)]"
                }`}
            >
                <Sun size={16} className={theme === "LIGHT" ? "text-yellow-500" : ""} />
                <span className="hidden sm:inline">Claro</span>
            </button>
            <button
                onClick={() => handleThemeChange("DARK")}
                disabled={isUpdating}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    theme === "DARK"
                        ? "bg-[var(--card-bg)] text-[var(--foreground)] shadow-sm"
                        : "text-[var(--muted-text)] hover:text-[var(--foreground)]"
                }`}
            >
                <Moon size={16} className={theme === "DARK" ? "text-blue-400" : ""} />
                <span className="hidden sm:inline">Oscuro</span>
            </button>
            <button
                onClick={() => handleThemeChange("SYSTEM")}
                disabled={isUpdating}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    theme === "SYSTEM"
                        ? "bg-[var(--card-bg)] text-[var(--foreground)] shadow-sm"
                        : "text-[var(--muted-text)] hover:text-[var(--foreground)]"
                }`}
            >
                <Monitor size={16} />
                <span className="hidden sm:inline">Auto</span>
            </button>
            {isUpdating && (
                <Loader2 size={14} className="animate-spin text-[var(--muted-text)] ml-1" />
            )}
        </div>
    );
}
