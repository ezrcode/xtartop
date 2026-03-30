"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
    LayoutDashboard,
    Users,
    Building2,
    TrendingUp,
    Settings,
    ChevronLeft,
    ChevronRight,
    LogOut,
    X,
    Search,
    User,
    BarChart3,
    ShoppingCart,
} from "lucide-react";
import { logout } from "@/actions/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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

export function Sidebar({ userRole, user, isMobileOpen, setIsMobileOpen }: SidebarProps) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

    const isAdmin = userRole === 'OWNER' || userRole === 'ADMIN';

    useEffect(() => {
        const stored = localStorage.getItem("sidebarCollapsed");
        if (stored && window.innerWidth >= 768) {
            setIsCollapsed(JSON.parse(stored));
        }
    }, []);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setIsCollapsed(false);
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (window.innerWidth >= 768 && !isCollapsed) {
                if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
                    setIsCollapsed(true);
                    localStorage.setItem("sidebarCollapsed", JSON.stringify(true));
                }
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isCollapsed]);

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem("sidebarCollapsed", JSON.stringify(newState));
    };

    const getInitials = () => {
        if (user.name) {
            const names = user.name.split(" ");
            if (names.length >= 2) return `${names[0][0]}${names[1][0]}`.toUpperCase();
            return user.name.substring(0, 2).toUpperCase();
        }
        return user.email?.substring(0, 2).toUpperCase() || "U";
    };

    const openCommandPalette = () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
    };

    const NavItem = ({ item, isActive }: { item: typeof mainMenuItems[0], isActive: boolean }) => {
        const content = (
            <Link
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 min-h-[44px] text-sm font-medium transition-all duration-200",
                    isActive
                        ? "bg-gradient-to-r from-nearby-accent/15 to-nearby-accent/5 text-nearby-accent shadow-sm"
                        : "text-[var(--muted-text)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)]",
                    isCollapsed && "md:justify-center md:px-3"
                )}
            >
                <item.icon
                    size={20}
                    className={cn(
                        "shrink-0 transition-colors",
                        isActive ? "text-nearby-accent" : "text-[var(--muted-text)]"
                    )}
                />
                <span className={cn(
                    "transition-opacity duration-200",
                    isCollapsed ? "md:hidden" : ""
                )}>
                    {item.name}
                </span>
                {isActive && !isCollapsed && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-nearby-accent" />
                )}
            </Link>
        );

        if (isCollapsed) {
            return (
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild className="hidden md:flex">
                        {content}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="hidden md:block">
                        {item.name}
                    </TooltipContent>
                </Tooltip>
            );
        }

        return content;
    };

    return (
        <TooltipProvider>
            {/* Mobile overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in-0"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside
                ref={sidebarRef}
                className={cn(
                    "fixed inset-y-0 left-0 z-50 flex flex-col overflow-x-hidden bg-[var(--card-bg)] border-r border-[var(--card-border)] transition-all duration-300 ease-in-out shadow-xl md:shadow-none pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:pt-0 md:pb-0",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full",
                    "w-64 md:translate-x-0",
                    isCollapsed ? "md:w-20" : "md:w-64"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between h-16 px-4">
                    <div className="md:hidden">
                        <Image 
                            src="/nearby_logo.png" 
                            alt="NEARBY" 
                            width={150} 
                            height={40}
                            className="h-8 w-auto"
                        />
                    </div>
                    
                    <div className={cn(
                        "hidden md:flex items-center transition-all duration-300",
                        isCollapsed ? "justify-center w-full" : ""
                    )}>
                        {isCollapsed ? (
                            <div className="p-2 rounded-xl bg-gradient-to-br from-nearby-accent/10 to-transparent">
                                <Image 
                                    src="/nearby_isotipo.png" 
                                    alt="NEARBY" 
                                    width={32} 
                                    height={32}
                                    className="w-8 h-8"
                                />
                            </div>
                        ) : (
                            <Image 
                                src="/nearby_logo.png" 
                                alt="NEARBY" 
                                width={150} 
                                height={40}
                                className="h-7 w-auto"
                            />
                        )}
                    </div>
                    
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={toggleCollapse}
                        className={cn(
                            "hidden md:flex rounded-lg",
                            isCollapsed && "absolute top-4 right-3"
                        )}
                    >
                        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </Button>
                    
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setIsMobileOpen(false)}
                        className="md:hidden rounded-lg"
                    >
                        <X size={18} />
                    </Button>
                </div>

                {/* Search trigger */}
                {!isCollapsed ? (
                    <div className="px-3 mb-2">
                        <button
                            onClick={openCommandPalette}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] text-sm text-[var(--muted-text)] bg-[var(--hover-bg)] rounded-xl border border-[var(--card-border)] hover:border-nearby-accent/30 transition-colors"
                        >
                            <Search size={15} />
                            <span className="flex-1 text-left text-xs">Buscar...</span>
                            <kbd className="hidden sm:inline text-[10px] font-medium px-1.5 py-0.5 bg-[var(--card-bg)] rounded border border-[var(--card-border)]">
                                ⌘K
                            </kbd>
                        </button>
                    </div>
                ) : (
                    <div className="px-3 mb-2 hidden md:block">
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={openCommandPalette}
                                    className="w-full flex items-center justify-center min-h-[44px] p-2.5 text-[var(--muted-text)] bg-[var(--hover-bg)] rounded-xl border border-[var(--card-border)] hover:border-nearby-accent/30 transition-colors"
                                >
                                    <Search size={16} />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="right">Buscar (⌘K)</TooltipContent>
                        </Tooltip>
                    </div>
                )}

                <Separator className="mx-4 w-auto" />

                {/* Navigation */}
                <ScrollArea className="flex-1 overflow-x-hidden px-3 py-3">
                    {/* Section: Principal */}
                    {!isCollapsed && (
                        <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-text)]">
                            Principal
                        </p>
                    )}
                    <nav className="space-y-0.5">
                        {mainMenuItems.map((item) => {
                            const isActive = item.href === "/app" 
                                ? pathname === "/app"
                                : pathname === item.href || pathname.startsWith(`${item.href}/`);
                            
                            return <NavItem key={item.name} item={item} isActive={isActive} />;
                        })}
                    </nav>

                    {/* Section: Compras */}
                    <Separator className="my-3 mx-2 w-auto" />
                    {!isCollapsed && (
                        <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-text)]">
                            Compras
                        </p>
                    )}
                    <nav className="space-y-0.5">
                        {comprasMenuItems.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                            return <NavItem key={item.name} item={item} isActive={isActive} />;
                        })}
                    </nav>

                    {/* Section: Workspace (Admin only) */}
                    {isAdmin && (
                        <>
                            <Separator className="my-3 mx-2 w-auto" />
                            {!isCollapsed && (
                                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-text)]">
                                    Workspace
                                </p>
                            )}
                            <nav className="space-y-0.5">
                                {adminMenuItems.map((item) => {
                                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                                    return <NavItem key={item.name} item={item} isActive={isActive} />;
                                })}
                            </nav>
                        </>
                    )}
                </ScrollArea>

                <Separator className="mx-4 w-auto" />

                {/* User footer */}
                <div className="p-3 space-y-1">
                    {/* Profile link */}
                    {!isCollapsed ? (
                        <Link
                            href="/app/profile"
                            onClick={() => setIsMobileOpen(false)}
                            className={cn(
                                "flex items-center gap-3 rounded-xl px-3 py-2.5 min-h-[44px] transition-all duration-200 hover:bg-[var(--hover-bg)]",
                                pathname === "/app/profile" ? "bg-[var(--hover-bg)]" : ""
                            )}
                        >
                            <Avatar size="sm">
                                <AvatarImage src={user.photoUrl || undefined} alt={user.name || "Profile"} />
                                <AvatarFallback className="text-[10px]">{getInitials()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[var(--foreground)] truncate">
                                    {user.name || "Usuario"}
                                </p>
                                <p className="text-[10px] text-[var(--muted-text)] truncate">
                                    {user.email}
                                </p>
                            </div>
                        </Link>
                    ) : (
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild className="hidden md:flex">
                                <Link
                                    href="/app/profile"
                                    className="flex items-center justify-center rounded-xl p-2.5 transition-all hover:bg-[var(--hover-bg)]"
                                >
                                    <Avatar size="sm">
                                        <AvatarImage src={user.photoUrl || undefined} alt={user.name || "Profile"} />
                                        <AvatarFallback className="text-[10px]">{getInitials()}</AvatarFallback>
                                    </Avatar>
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent side="right">Mi perfil</TooltipContent>
                        </Tooltip>
                    )}

                    {/* Logout */}
                    <form action={logout}>
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <button
                                    type="submit"
                                    onClick={() => setIsMobileOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 w-full rounded-xl px-3 py-2.5 min-h-[44px] text-sm font-medium transition-all duration-200",
                                        "text-[var(--muted-text)] hover:bg-error-red/10 hover:text-error-red",
                                        isCollapsed && "md:justify-center"
                                    )}
                                >
                                    <LogOut size={18} className="shrink-0" />
                                    <span className={cn(isCollapsed && "md:hidden")}>
                                        Cerrar sesión
                                    </span>
                                </button>
                            </TooltipTrigger>
                            {isCollapsed && (
                                <TooltipContent side="right" className="hidden md:block">
                                    Cerrar sesión
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </form>
                </div>
            </aside>
        </TooltipProvider>
    );
}
