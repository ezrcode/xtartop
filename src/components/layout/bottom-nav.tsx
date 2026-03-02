"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Building2, TrendingUp, Settings, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
    { name: "Inicio", href: "/app", icon: LayoutDashboard },
    { name: "Contactos", href: "/app/contacts", icon: Users },
    { name: "Empresas", href: "/app/companies", icon: Building2 },
    { name: "Negocios", href: "/app/deals", icon: TrendingUp },
    { name: "Reportes", href: "/app/reports", icon: BarChart3 },
    { name: "Config", href: "/app/settings", icon: Settings },
];

interface BottomNavProps {
    userRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | null;
}

export function BottomNav({ userRole }: BottomNavProps) {
    const pathname = usePathname();

    // Filter items based on role
    const visibleItems = navItems.filter(item => {
        if (item.href === "/app/settings") {
            return userRole === 'OWNER' || userRole === 'ADMIN';
        }
        return true;
    });

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[var(--card-bg)]/95 backdrop-blur-xl border-t border-[var(--card-border)] safe-bottom shadow-[0_-6px_18px_rgba(0,0,0,0.08)]"
            style={{
                paddingLeft: "env(safe-area-inset-left)",
                paddingRight: "env(safe-area-inset-right)",
            }}
        >
            <div className="flex items-center justify-around h-[68px] px-1.5">
                {visibleItems.map((item) => {
                    const isActive = item.href === "/app" 
                        ? pathname === "/app"
                        : pathname === item.href || pathname.startsWith(`${item.href}/`);
                    
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="relative flex flex-col items-center justify-center flex-1 h-full py-1.5 min-h-[48px]"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="bottomNavIndicator"
                                    className="absolute inset-x-2.5 top-0 h-1 bg-[var(--accent-on-dark)] rounded-full"
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                            )}
                            <item.icon 
                                size={20}
                                className={`mb-1 transition-colors ${
                                    isActive ? "text-[var(--accent-on-dark)]" : "text-[var(--muted-text)]"
                                }`}
                            />
                            <span className={`text-[11px] leading-none font-medium transition-colors ${
                                isActive ? "text-[var(--accent-on-dark)]" : "text-[var(--muted-text)]"
                            }`}>
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
