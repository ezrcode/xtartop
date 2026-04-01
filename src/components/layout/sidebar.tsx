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
    CreditCard,
} from "lucide-react";
import { motion } from "framer-motion";
import { logout } from "@/actions/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const RAIL_WIDTH = 64;
const EXPANDED_WIDTH = 240;
const ICON_SIZE = 20;
const NAV_PX = 12;
const ITEM_PL = RAIL_WIDTH / 2 - ICON_SIZE / 2 - NAV_PX;

const topMenuItems = [
    { name: "Dashboard", href: "/app", icon: LayoutDashboard },
];

const comercialMenuItems = [
    { name: "Contactos", href: "/app/contacts", icon: Users },
    { name: "Empresas", href: "/app/companies", icon: Building2 },
    { name: "Negocios", href: "/app/deals", icon: TrendingUp },
];

const administrativoMenuItems = [
    { name: "Suscripciones", href: "/app/subscriptions", icon: CreditCard },
    { name: "Órdenes de Compra", href: "/app/purchases", icon: ShoppingCart },
];

const reportesMenuItems = [
    { name: "Reportes", href: "/app/reports", icon: BarChart3 },
];

const workspaceMenuItems = [
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

type MenuItem = typeof topMenuItems[0];

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

    /* ─── Unified Desktop NavItem ─── */
    const NavItem = ({ item }: { item: MenuItem }) => {
        const active = isActive(item.href);
        return (
            <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                    <Link
                        href={item.href}
                        className={cn(
                            "relative flex items-center h-10 gap-3 rounded-md transition-colors overflow-hidden",
                            active
                                ? "bg-nearby-accent/10 text-nearby-accent"
                                : "text-[var(--muted-text)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]"
                        )}
                        style={{ paddingLeft: ITEM_PL }}
                    >
                        {active && (
                            <span
                                className="absolute top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-nearby-accent"
                                style={{ left: -NAV_PX }}
                            />
                        )}
                        <item.icon size={ICON_SIZE} strokeWidth={1.75} className="shrink-0" />
                        <span
                            className={cn(
                                "text-sm font-medium whitespace-nowrap transition-opacity duration-150",
                                isPanelOpen ? "opacity-100" : "opacity-0"
                            )}
                        >
                            {item.name}
                        </span>
                    </Link>
                </TooltipTrigger>
                {!isPanelOpen && (
                    <TooltipContent side="right" sideOffset={8}>{item.name}</TooltipContent>
                )}
            </Tooltip>
        );
    };

    /* ─── Section divider — same height in both states ─── */
    const SectionDivider = ({ label }: { label: string }) => (
        <div className="flex items-center h-8 mt-1 overflow-hidden">
            {isPanelOpen ? (
                <p
                    className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-text)] whitespace-nowrap"
                    style={{ paddingLeft: ITEM_PL }}
                >
                    {label}
                </p>
            ) : (
                <div className="flex items-center justify-center w-full">
                    <div className="w-8 h-px bg-[var(--card-border)]" />
                </div>
            )}
        </div>
    );

    /* ─── Mobile NavItem ─── */
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
                    {topMenuItems.map((item) => <MobileNavItem key={item.name} item={item} />)}

                    <div className="h-px bg-[var(--card-border)] my-3 mx-2" />
                    <p className="px-3 mb-1 text-[11px] font-medium uppercase tracking-wider text-[var(--muted-text)]">Comercial</p>
                    {comercialMenuItems.map((item) => <MobileNavItem key={item.name} item={item} />)}

                    <div className="h-px bg-[var(--card-border)] my-3 mx-2" />
                    <p className="px-3 mb-1 text-[11px] font-medium uppercase tracking-wider text-[var(--muted-text)]">Administrativo</p>
                    {administrativoMenuItems.map((item) => <MobileNavItem key={item.name} item={item} />)}

                    <div className="h-px bg-[var(--card-border)] my-3 mx-2" />
                    {reportesMenuItems.map((item) => <MobileNavItem key={item.name} item={item} />)}

                    {isAdmin && (
                        <>
                            <div className="h-px bg-[var(--card-border)] my-3 mx-2" />
                            <p className="px-3 mb-1 text-[11px] font-medium uppercase tracking-wider text-[var(--muted-text)]">Workspace</p>
                            {workspaceMenuItems.map((item) => <MobileNavItem key={item.name} item={item} />)}
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

            {/* ─── Desktop Sidebar (single tree, morphing width) ─── */}
            <motion.aside
                className="hidden md:flex fixed inset-y-0 left-0 z-50 flex-col bg-[var(--card-bg)] border-r border-[var(--card-border)] overflow-hidden"
                animate={{ width: isPanelOpen ? EXPANDED_WIDTH : RAIL_WIDTH }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                onMouseEnter={() => setIsPanelOpen(true)}
                onMouseLeave={() => setIsPanelOpen(false)}
            >
                {/* Logo */}
                <div className="flex items-center h-14 overflow-hidden shrink-0">
                    {isPanelOpen ? (
                        <div className="px-4">
                            <Image src="/nearby_logo.png" alt="NEARBY" width={120} height={32} className="h-6 w-auto" />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center w-full">
                            <Image src="/nearby_isotipo.png" alt="NEARBY" width={28} height={28} className="w-7 h-7" />
                        </div>
                    )}
                </div>

                {/* Search */}
                <div className="flex items-center h-10 px-3 mb-1 shrink-0">
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <button
                                onClick={openCommandPalette}
                                className={cn(
                                    "flex items-center transition-colors text-[var(--muted-text)] hover:text-[var(--foreground)] overflow-hidden",
                                    isPanelOpen
                                        ? "w-full gap-2 px-3 py-2 rounded-md border border-dashed border-[var(--card-border)] hover:border-nearby-accent/30"
                                        : "justify-center rounded-md hover:bg-[var(--hover-bg)]"
                                )}
                                style={!isPanelOpen ? { width: 40, height: 40 } : undefined}
                            >
                                <Search size={isPanelOpen ? 14 : 18} strokeWidth={1.75} className="shrink-0" />
                                {isPanelOpen && (
                                    <>
                                        <span className="flex-1 text-left text-xs whitespace-nowrap">Buscar...</span>
                                        <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-[var(--hover-bg)] rounded border border-[var(--card-border)]">⌘K</kbd>
                                    </>
                                )}
                            </button>
                        </TooltipTrigger>
                        {!isPanelOpen && (
                            <TooltipContent side="right" sideOffset={8}>Buscar (⌘K)</TooltipContent>
                        )}
                    </Tooltip>
                </div>

                {/* Separator */}
                <div className={cn("h-px bg-[var(--card-border)] shrink-0", isPanelOpen ? "mx-3" : "mx-4")} />

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-2 px-3">
                    {topMenuItems.map((item) => <NavItem key={item.name} item={item} />)}

                    <SectionDivider label="Comercial" />
                    {comercialMenuItems.map((item) => <NavItem key={item.name} item={item} />)}

                    <SectionDivider label="Administrativo" />
                    {administrativoMenuItems.map((item) => <NavItem key={item.name} item={item} />)}

                    <SectionDivider label="" />
                    {reportesMenuItems.map((item) => <NavItem key={item.name} item={item} />)}

                    {isAdmin && (
                        <>
                            <SectionDivider label="Workspace" />
                            {workspaceMenuItems.map((item) => <NavItem key={item.name} item={item} />)}
                        </>
                    )}
                </nav>

                {/* Footer */}
                <div className="border-t border-[var(--card-border)] shrink-0">
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <Link
                                href="/app/profile"
                                className={cn(
                                    "flex items-center h-12 gap-3 transition-colors overflow-hidden",
                                    isPanelOpen ? "px-4" : "justify-center",
                                    pathname === "/app/profile"
                                        ? "bg-nearby-accent/10"
                                        : "hover:bg-[var(--hover-bg)]"
                                )}
                            >
                                <Avatar size="xs" className="shrink-0">
                                    <AvatarImage src={user.photoUrl || undefined} alt={user.name || "Profile"} />
                                    <AvatarFallback className="text-[9px]">{getInitials()}</AvatarFallback>
                                </Avatar>
                                {isPanelOpen && (
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[var(--foreground)] truncate">{user.name || "Usuario"}</p>
                                        <p className="text-[10px] text-[var(--muted-text)] truncate">{user.email}</p>
                                    </div>
                                )}
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
                                    className={cn(
                                        "flex items-center h-10 w-full mb-1 transition-colors text-[var(--muted-text)] hover:bg-error-red/10 hover:text-error-red overflow-hidden",
                                        isPanelOpen ? "px-4 gap-3" : "justify-center"
                                    )}
                                >
                                    <LogOut size={18} strokeWidth={1.75} className="shrink-0" />
                                    {isPanelOpen && (
                                        <span className="text-sm font-medium whitespace-nowrap">Cerrar sesión</span>
                                    )}
                                </button>
                            </form>
                        </TooltipTrigger>
                        {!isPanelOpen && (
                            <TooltipContent side="right" sideOffset={8}>Cerrar sesión</TooltipContent>
                        )}
                    </Tooltip>
                </div>
            </motion.aside>
        </TooltipProvider>
    );
}
