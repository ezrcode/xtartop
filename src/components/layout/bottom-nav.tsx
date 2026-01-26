"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Building2, TrendingUp, Settings } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
    { name: "Inicio", href: "/app", icon: LayoutDashboard },
    { name: "Contactos", href: "/app/contacts", icon: Users },
    { name: "Empresas", href: "/app/companies", icon: Building2 },
    { name: "Negocios", href: "/app/deals", icon: TrendingUp },
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
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-graphite-gray safe-bottom">
            <div className="flex items-center justify-around h-16 px-2">
                {visibleItems.map((item) => {
                    const isActive = item.href === "/app" 
                        ? pathname === "/app"
                        : pathname === item.href || pathname.startsWith(`${item.href}/`);
                    
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="relative flex flex-col items-center justify-center flex-1 h-full py-1"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="bottomNavIndicator"
                                    className="absolute inset-x-2 top-0 h-0.5 bg-nearby-accent rounded-full"
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                            )}
                            <item.icon 
                                size={22}
                                className={`mb-1 transition-colors ${
                                    isActive ? "text-nearby-accent" : "text-gray-400"
                                }`}
                            />
                            <span className={`text-[10px] font-medium transition-colors ${
                                isActive ? "text-nearby-accent" : "text-gray-500"
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
