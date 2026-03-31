"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useCallback } from "react";
import {
    LayoutDashboard,
    Users,
    Building2,
    TrendingUp,
    Settings,
    LogOut,
    X,
    Search,
    BarChart3,
    ShoppingCart,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { logout } from "@/actions/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const RAIL_WIDTH = 64;

const mainMenuItems = [
    { name: "Dashboard", href: "/app", icon: LayoutDashboard },
    { name: "Contactos", href: "/app/contacts", icon: Users },
    { name: "Empresas", href: "/app/companies", icon: Building2 },
    { name: "Negocios", href: "/app/deals", icon: TrendingUp },
    { name: "Reportes", href: "/app/reports", icon: BarChart3 },
];

const comprasMenuItems = [
    { name: "Órdenes de Compra", href: "/app/purchases", icon: ShoppingCart },
];

const adminMenuItems = [
    { name: "Configuración", href: "/app/settings", icon: Settings },
];

interface SidebarProps {
    userRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | null;
    user: {
        name?: string | null;
        email?: string | null;
        photoUrl?: string | null;
    };
    isMobileOpen: boolean;
    setIsMobileOpen: (open: boolean) => void;
}

type MenuItem = typeof mainMenuItems[0];

export function Sidebar({ userRole, user, isMobileOpen, setIsMobileOpen }: SidebarProps) {
    const pathname = usePathname();
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    const isAdmin = userRole === 'OWNER' || userRole === 'ADMIN';

    const getInitials = useCallback(() => {
        if (user.name) {
            const names = user.name.split(" ");
            if (names.length >= 2) return `${names[0][0]}${names[1][0]}`.toUpperCase();
            return user.name.substring(0, 2).toUpperCase();
        }
        return user.email?.substring(0, 2).toUpperCase() || "U";
    }, [user.name, user.email]);

    const openCommandPalette = () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
    };

    const isActive = (href: string) =>
        href === "/app"
            ? pathname === "/app"
            : pathname === href || pathname.startsWith(`${href}/`);

    const RailIcon = ({ item }: { item: MenuItem }) => {
        const active = isActive(item.href);
        return (
            <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                    <Link
                        href={item.href}
                        className={cn(
                            "relative flex items-center justify-center w-10 h-10 rounded-md transition-colors",
                            active
                                ? "bg-nearby-accent/10 text-nearby-accent"
                                : "text-[var(--muted-text)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
                        )}
                    >
                        {active && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[13px] w-[3px] h-5 rounded-r-full bg-nearby-accent" />
                        )}
                        <item.icon size={20} strokeWidth={1.75} />
                    </Link>
                </TooltipTrigger>
                {!isPanelOpen && (
                    <TooltipContent side="right" sideOffset={8}>
                        {item.name}
                    </TooltipContent>
                )}
            </Tooltip>
        );
    };

    const PanelItem = ({ item }: { item: MenuItem }) => {
        const active = isActive(item.href);
        return (
            <Link
                href={item.href}
                onClick={() => setIsPanelOpen(false)}
                className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                        ? "bg-nearby-accent/8 text-nearby-accent"
                        : "text-[var(--muted-text)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
                )}
            >
                <item.icon size={18} strokeWidth={1.75} />
                {item.name}
            </Link>
        );
    };

    const MobileNavItem = ({ item }: { item: MenuItem }) => {
        const active = isActive(item.href);
        return (
            <Link
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 min-h-[44px] text-sm font-medium transition-colors",
                    active
                        ? "bg-nearby-accent/8 text-nearby-accent"
                        : "text-[var(--muted-text)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
                )}
            >
                <item.icon size={20} strokeWidth={1.75} />
                {item.name}
            </Link>
        );
    };

    const allItems = [
        ...mainMenuItems,
        ...comprasMenuItems,
        ...(isAdmin ? adminMenuItems : []),
    ];

    return (
        <TooltipProvider>
            {/* ─── Mobile Overlay ─── */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in-0"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* ─── Mobile Drawer ─── */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-[var(--card-bg)] border-r border-[var(--card-border)] transition-transform duration-300 ease-in-out shadow-lg md:hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex items-center justify-between h-14 px-4">
                    <Image src="/nearby_logo.png" alt="NEARBY" width={120} height={32} className="h-7 w-auto" />
                    <Button variant="ghost" size="icon-sm" onClick={() => setIsMobileOpen(false)}>
                        <X size={18} />
                    </Button>
                </div>

                <div className="px-3 mb-2">
                    <button
                        onClick={() => { openCommandPalette(); setIsMobileOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] text-sm text-[var(--muted-text)] bg-[var(--hover-bg)] rounded-md border border-[var(--card-border)] hover:border-nearby-accent/30 transition-colors"
                    >
                        <Search size={15} />
                        <span className="flex-1 text-left text-xs">Buscar...</span>
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                    <p className="px-3 mb-1 text-[11px] font-medium uppercase tracking-wider text-[var(--muted-text)]">Principal</p>
                    {mainMenuItems.map((item) => <MobileNavItem key={item.name} item={item} />)}

                    <div className="h-px bg-[var(--card-border)] my-3 mx-2" />
                    <p className="px-3 mb-1 text-[11px] font-medium uppercase tracking-wider text-[var(--muted-text)]">Compras</p>
                    {comprasMenuItems.map((item) => <MobileNavItem key={item.name} item={item} />)}

                    {isAdmin && (
                        <>
                            <div className="h-px bg-[var(--card-border)] my-3 mx-2" />
                            <p className="px-3 mb-1 text-[11px] font-medium uppercase tracking-wider text-[var(--muted-text)]">Workspace</p>
                            {adminMenuItems.map((item) => <MobileNavItem key={item.name} item={item} />)}
                        </>
                    )}
                </nav>

                <div className="p-3 border-t border-[var(--card-border)] space-y-1">
                    <Link
                        href="/app/profile"
                        onClick={() => setIsMobileOpen(false)}
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 min-h-[44px] transition-colors hover:bg-[var(--hover-bg)]"
                    >
                        <Avatar size="sm">
                            <AvatarImage src={user.photoUrl || undefined} alt={user.name || "Profile"} />
                            <AvatarFallback className="text-[10px]">{getInitials()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--foreground)] truncate">{user.name || "Usuario"}</p>
                            <p className="text-[10px] text-[var(--muted-text)] truncate">{user.email}</p>
                        </div>
                    </Link>
                    <form action={logout}>
                        <button
                            type="submit"
                            onClick={() => setIsMobileOpen(false)}
                            className="flex items-center gap-3 w-full rounded-md px-3 py-2.5 min-h-[44px] text-sm font-medium text-[var(--muted-text)] hover:bg-error-red/10 hover:text-error-red transition-colors"
                        >
                            <LogOut size={18} />
                            Cerrar sesión
                        </button>
                    </form>
                </div>
            </aside>

            {/* ─── Desktop Icon Rail + Floating Panel ─── */}
            <div
                className="hidden md:block fixed inset-y-0 left-0 z-50"
                onMouseEnter={() => setIsPanelOpen(true)}
                onMouseLeave={() => setIsPanelOpen(false)}
            >
                {/* Icon Rail */}
                <div
                    className="h-full flex flex-col items-center bg-[var(--card-bg)] border-r border-[var(--card-border)]"
                    style={{ width: RAIL_WIDTH }}
                >
                    {/* Logo */}
                    <div className="flex items-center justify-center h-14 w-full">
                        <Image src="/nearby_isotipo.png" alt="NEARBY" width={28} height={28} className="w-7 h-7" />
                    </div>

                    {/* Search */}
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <button
                                onClick={openCommandPalette}
                                className="flex items-center justify-center w-10 h-10 rounded-md text-[var(--muted-text)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)] transition-colors mb-2"
                            >
                                <Search size={18} strokeWidth={1.75} />
                            </button>
                        </TooltipTrigger>
                        {!isPanelOpen && (
                            <TooltipContent side="right" sideOffset={8}>Buscar (⌘K)</TooltipContent>
                        )}
                    </Tooltip>

                    <div className="w-8 h-px bg-[var(--card-border)] mb-2" />

                    {/* Nav Icons */}
                    <nav className="flex-1 flex flex-col items-center gap-1 py-1">
                        {mainMenuItems.map((item) => <RailIcon key={item.name} item={item} />)}
                        <div className="w-8 h-px bg-[var(--card-border)] my-1.5" />
                        {comprasMenuItems.map((item) => <RailIcon key={item.name} item={item} />)}
                        {isAdmin && (
                            <>
                                <div className="w-8 h-px bg-[var(--card-border)] my-1.5" />
                                {adminMenuItems.map((item) => <RailIcon key={item.name} item={item} />)}
                            </>
                        )}
                    </nav>

                    {/* Footer */}
                    <div className="flex flex-col items-center gap-1 pb-3">
                        <div className="w-8 h-px bg-[var(--card-border)] mb-1" />
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Link
                                    href="/app/profile"
                                    className={cn(
                                        "flex items-center justify-center w-10 h-10 rounded-md transition-colors",
                                        pathname === "/app/profile"
                                            ? "bg-nearby-accent/10"
                                            : "hover:bg-[var(--hover-bg)]"
                                    )}
                                >
                                    <Avatar size="xs">
                                        <AvatarImage src={user.photoUrl || undefined} alt={user.name || "Profile"} />
                                        <AvatarFallback className="text-[9px]">{getInitials()}</AvatarFallback>
                                    </Avatar>
                                </Link>
                            </TooltipTrigger>
                            {!isPanelOpen && (
                                <TooltipContent side="right" sideOffset={8}>Mi perfil</TooltipContent>
                            )}
                        </Tooltip>
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <form action={logout}>
                                    <button
                                        type="submit"
                                        className="flex items-center justify-center w-10 h-10 rounded-md text-[var(--muted-text)] hover:bg-error-red/10 hover:text-error-red transition-colors"
                                    >
                                        <LogOut size={18} strokeWidth={1.75} />
                                    </button>
                                </form>
                            </TooltipTrigger>
                            {!isPanelOpen && (
                                <TooltipContent side="right" sideOffset={8}>Cerrar sesión</TooltipContent>
                            )}
                        </Tooltip>
                    </div>
                </div>

                {/* Floating Panel */}
                <AnimatePresence>
                    {isPanelOpen && (
                        <motion.div
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="absolute top-0 bottom-0 bg-[var(--card-bg)] border-r border-[var(--card-border)] shadow-lg flex flex-col"
                            style={{ left: RAIL_WIDTH, width: 220 }}
                        >
                            {/* Panel Header */}
                            <div className="flex items-center h-14 px-4">
                                <Image src="/nearby_logo.png" alt="NEARBY" width={110} height={28} className="h-6 w-auto" />
                            </div>

                            {/* Panel Search */}
                            <div className="px-3 mb-2">
                                <button
                                    onClick={openCommandPalette}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--muted-text)] rounded-md border border-dashed border-[var(--card-border)] hover:border-nearby-accent/30 transition-colors"
                                >
                                    <Search size={14} />
                                    <span className="flex-1 text-left text-xs">Buscar...</span>
                                    <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-[var(--hover-bg)] rounded border border-[var(--card-border)]">⌘K</kbd>
                                </button>
                            </div>

                            <div className="h-px bg-[var(--card-border)] mx-3" />

                            {/* Panel Navigation */}
                            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
                                <p className="px-3 mb-1 text-[11px] font-medium uppercase tracking-wider text-[var(--muted-text)]">Principal</p>
                                {mainMenuItems.map((item) => <PanelItem key={item.name} item={item} />)}

                                <div className="h-px bg-[var(--card-border)] my-3 mx-2" />
                                <p className="px-3 mb-1 text-[11px] font-medium uppercase tracking-wider text-[var(--muted-text)]">Compras</p>
                                {comprasMenuItems.map((item) => <PanelItem key={item.name} item={item} />)}

                                {isAdmin && (
                                    <>
                                        <div className="h-px bg-[var(--card-border)] my-3 mx-2" />
                                        <p className="px-3 mb-1 text-[11px] font-medium uppercase tracking-wider text-[var(--muted-text)]">Workspace</p>
                                        {adminMenuItems.map((item) => <PanelItem key={item.name} item={item} />)}
                                    </>
                                )}
                            </nav>

                            {/* Panel Footer */}
                            <div className="p-3 border-t border-[var(--card-border)]">
                                <Link
                                    href="/app/profile"
                                    className="flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-[var(--hover-bg)]"
                                >
                                    <Avatar size="xs">
                                        <AvatarImage src={user.photoUrl || undefined} alt={user.name || "Profile"} />
                                        <AvatarFallback className="text-[9px]">{getInitials()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[var(--foreground)] truncate">{user.name || "Usuario"}</p>
                                        <p className="text-[10px] text-[var(--muted-text)] truncate">{user.email}</p>
                                    </div>
                                </Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </TooltipProvider>
    );
}
