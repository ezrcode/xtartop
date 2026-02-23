"use client";

import Link from "next/link";
import { User, LogOut, Menu, Banknote } from "lucide-react";
import { logout } from "@/actions/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ThemePreference } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    // Obtener iniciales para el avatar
    const getInitials = () => {
        if (user.name) {
            const names = user.name.split(" ");
            if (names.length >= 2) {
                return `${names[0][0]}${names[1][0]}`.toUpperCase();
            }
            return user.name.substring(0, 2).toUpperCase();
        }
        if (user.email) {
            return user.email.substring(0, 2).toUpperCase();
        }
        return "U";
    };

    const formattedRate = currentExchangeRate !== null
        ? currentExchangeRate.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
        : null;

    return (
        <header className="sticky top-0 z-40 bg-[var(--card-bg)]/80 backdrop-blur-xl border-b border-[var(--card-border)]">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
                {/* Left side - Mobile Menu Button */}
                <div className="flex items-center flex-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onMenuClick}
                        className="md:hidden"
                        aria-label="Abrir menú"
                    >
                        <Menu size={22} />
                    </Button>
                </div>

                {/* Right side - Theme Toggle & User Profile */}
                <div className="flex items-center gap-3">
                    {/* Exchange Rate Pill */}
                    {formattedRate && (
                        <div className={cn(
                            "hidden sm:flex items-center gap-2",
                            "px-3 py-1.5 rounded-full border",
                            "bg-gradient-to-r from-nearby-accent/10 via-nearby-accent/5 to-transparent",
                            "border-nearby-accent/30 text-[var(--foreground)] shadow-sm"
                        )}>
                            <div className="h-6 w-6 rounded-full bg-nearby-accent/15 flex items-center justify-center">
                                <Banknote size={13} className="text-nearby-accent" />
                            </div>
                            <div className="leading-tight">
                                <p className="text-[10px] uppercase tracking-wide text-[var(--muted-text)]">
                                    Tasa actual
                                </p>
                                <p className="text-xs font-semibold">
                                    {formattedRate}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Theme Toggle (icon only) */}
                    <ThemeToggle 
                        initialTheme={user.themePreference || "LIGHT"} 
                        variant="icon" 
                    />

                    {/* User Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button 
                                variant="ghost" 
                                className={cn(
                                    "relative h-auto p-2 hover:bg-[var(--hover-bg)] rounded-xl",
                                    "flex items-center gap-3"
                                )}
                            >
                                <Avatar size="default">
                                    <AvatarImage src={user.photoUrl || undefined} alt={user.name || "Profile"} />
                                    <AvatarFallback>{getInitials()}</AvatarFallback>
                                </Avatar>
                                
                                {/* User Info - Desktop only */}
                                <div className="hidden sm:block text-left max-w-[150px]">
                                    <p className="text-sm font-medium text-[var(--foreground)] truncate">
                                        {user.name || "Usuario"}
                                    </p>
                                    <p className="text-xs text-[var(--muted-text)] truncate">
                                        {user.email}
                                    </p>
                                </div>
                            </Button>
                        </DropdownMenuTrigger>
                        
                        <DropdownMenuContent align="end" className="w-60">
                            {/* User Info in Dropdown (mobile) */}
                            <div className="sm:hidden">
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium text-[var(--foreground)]">
                                            {user.name || "Usuario"}
                                        </p>
                                        <p className="text-xs text-[var(--muted-text)]">
                                            {user.email}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                            </div>

                            <DropdownMenuItem asChild>
                                <Link href="/app/profile" className="cursor-pointer">
                                    <User className="mr-2.5" size={16} />
                                    Mi perfil
                                </Link>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <form action={logout} className="w-full">
                                <DropdownMenuItem asChild>
                                    <button
                                        type="submit"
                                        className="w-full text-error-red focus:text-error-red focus:bg-error-red/10 cursor-pointer"
                                    >
                                        <LogOut className="mr-2.5" size={16} />
                                        Cerrar sesión
                                    </button>
                                </DropdownMenuItem>
                            </form>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
