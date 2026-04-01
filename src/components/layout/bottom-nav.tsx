"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    BarChart3,
    Building2,
    CreditCard,
    HeartHandshake,
    LayoutDashboard,
    TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";

const baseNavItems = [
    { name: "Inicio", href: "/app", icon: LayoutDashboard },
    { name: "Empresas", href: "/app/companies", icon: Building2 },
    { name: "Negocios", href: "/app/deals", icon: TrendingUp },
    { name: "Clientes", href: "/app/customers", icon: HeartHandshake },
    { name: "Reportes", href: "/app/reports", icon: BarChart3 },
];

interface BottomNavProps {
    userRole: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER" | null;
}

export function BottomNav({ userRole }: BottomNavProps) {
    const pathname = usePathname();

    const navItems = [...baseNavItems];

    if (userRole === "OWNER" || userRole === "ADMIN") {
        navItems.splice(4, 0, {
            name: "Suscrip.",
            href: "/app/subscriptions",
            icon: CreditCard,
        });
    }

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-[var(--card-border)] bg-[color:color-mix(in_srgb,var(--card-bg)_88%,transparent)] backdrop-blur-2xl safe-bottom shadow-[0_-10px_30px_rgba(15,23,42,0.10)]"
            style={{
                paddingLeft: "env(safe-area-inset-left)",
                paddingRight: "env(safe-area-inset-right)",
            }}
        >
            <div className="mx-auto flex h-[78px] max-w-xl items-end justify-around px-2 pb-2 pt-1">
                {navItems.map((item) => {
                    const isActive = item.href === "/app"
                        ? pathname === "/app"
                        : pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="relative flex min-h-[58px] min-w-0 flex-1 flex-col items-center justify-center px-1"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="bottomNavPill"
                                    className="absolute inset-x-1 top-0 bottom-0 rounded-[22px] bg-nearby-accent/12"
                                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                                />
                            )}
                            <div className="relative z-10 flex flex-col items-center gap-1">
                                <item.icon
                                    size={20}
                                    className={isActive ? "text-nearby-accent" : "text-[var(--muted-text)]"}
                                />
                                <span
                                    className={`text-[10px] font-medium leading-none ${
                                        isActive ? "text-nearby-accent" : "text-[var(--muted-text)]"
                                    }`}
                                >
                                    {item.name}
                                </span>
                            </div>
                            {isActive && (
                                <motion.span
                                    layoutId="bottomNavDot"
                                    className="absolute top-[6px] h-1.5 w-1.5 rounded-full bg-nearby-accent"
                                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                                />
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
