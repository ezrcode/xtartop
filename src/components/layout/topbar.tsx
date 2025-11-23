"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { User, LogOut, ChevronDown, Menu } from "lucide-react";
import { logout } from "@/actions/auth";

interface TopbarProps {
    user: {
        name?: string | null;
        email?: string | null;
        photoUrl?: string | null;
    };
    onMenuClick: () => void;
}

export function Topbar({ user, onMenuClick }: TopbarProps) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

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

    return (
        <div className="sticky top-0 z-40 bg-white border-b border-graphite-gray shadow-sm">
            <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
                {/* Left side - Mobile Menu Button */}
                <div className="flex items-center flex-1">
                    <button
                        onClick={onMenuClick}
                        className="md:hidden p-2 rounded-lg hover:bg-soft-gray transition-colors text-dark-slate"
                        aria-label="Abrir menú"
                    >
                        <Menu size={24} />
                    </button>
                </div>

                {/* Right side - User Profile */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-soft-gray transition-colors group"
                    >
                        {/* Avatar */}
                        {user.photoUrl ? (
                            <img
                                src={user.photoUrl}
                                alt={user.name || "Profile"}
                                className="h-10 w-10 rounded-full object-cover shadow-sm"
                            />
                        ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-founder-blue to-ocean-blue flex items-center justify-center text-white font-semibold shadow-sm">
                                {getInitials()}
                            </div>
                        )}

                        {/* User Info */}
                        <div className="hidden sm:block text-left">
                            <p className="text-sm font-medium text-dark-slate">
                                {user.name || "Usuario"}
                            </p>
                            <p className="text-xs text-gray-500">
                                {user.email}
                            </p>
                        </div>

                        {/* Dropdown Icon */}
                        <ChevronDown 
                            size={16} 
                            className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white border border-graphite-gray rounded-lg shadow-lg py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            {/* User Info in Dropdown (mobile) */}
                            <div className="sm:hidden px-4 py-3 border-b border-graphite-gray">
                                <p className="text-sm font-medium text-dark-slate">
                                    {user.name || "Usuario"}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {user.email}
                                </p>
                            </div>

                            {/* Menu Items */}
                            <Link
                                href="/app/profile"
                                className="flex items-center px-4 py-2 text-sm text-dark-slate hover:bg-soft-gray transition-colors"
                                onClick={() => setIsDropdownOpen(false)}
                            >
                                <User size={16} className="mr-3 text-gray-400" />
                                Mi perfil
                            </Link>

                            <div className="border-t border-graphite-gray my-2"></div>

                            <form action={logout}>
                                <button
                                    type="submit"
                                    className="flex items-center w-full px-4 py-2 text-sm text-error-red hover:bg-red-50 transition-colors"
                                >
                                    <LogOut size={16} className="mr-3" />
                                    Cerrar sesión
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

