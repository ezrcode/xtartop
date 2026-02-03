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
} from "lucide-react";
import { logout } from "@/actions/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const menuItems = [
    { name: "Inicio", href: "/app", icon: LayoutDashboard },
    { name: "Contactos", href: "/app/contacts", icon: Users },
    { name: "Empresas", href: "/app/companies", icon: Building2 },
    { name: "Negocios", href: "/app/deals", icon: TrendingUp },
    { name: "Configuración", href: "/app/settings", icon: Settings, requiresAdmin: true },
];

interface SidebarProps {
    userRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | null;
    isMobileOpen: boolean;
    setIsMobileOpen: (open: boolean) => void;
}

export function Sidebar({ userRole, isMobileOpen, setIsMobileOpen }: SidebarProps) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Filter menu items based on user role
    const visibleMenuItems = menuItems.filter(item => {
        if (item.requiresAdmin) {
            return userRole === 'OWNER' || userRole === 'ADMIN';
        }
        return true;
    });

    // Load collapsed state from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem("sidebarCollapsed");
        if (stored && window.innerWidth >= 768) {
            setIsCollapsed(JSON.parse(stored));
        }
    }, []);

    // Don't collapse on mobile
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

    // Handle click outside to minimize sidebar
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
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isCollapsed]);

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem("sidebarCollapsed", JSON.stringify(newState));
    };

    const NavItem = ({ item, isActive }: { item: typeof menuItems[0], isActive: boolean }) => {
        const content = (
            <Link
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
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
                {isActive && (
                    <div className="ml-auto h-2 w-2 rounded-full bg-nearby-accent animate-pulse" />
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
                    "fixed inset-y-0 left-0 z-50 flex flex-col bg-[var(--card-bg)] border-r border-[var(--card-border)] transition-all duration-300 ease-in-out shadow-xl md:shadow-none",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full",
                    "w-72 md:translate-x-0",
                    isCollapsed ? "md:w-20" : "md:w-72"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between h-16 px-4">
                    {/* Mobile: Always show full logo */}
                    <div className="md:hidden">
                        <Image 
                            src="/nearby_logo.png" 
                            alt="NEARBY" 
                            width={150} 
                            height={40}
                            className="h-8 w-auto"
                        />
                    </div>
                    
                    {/* Desktop: Collapsed/Expanded logo */}
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
                                className="h-8 w-auto"
                            />
                        )}
                    </div>
                    
                    {/* Desktop collapse button */}
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
                    
                    {/* Mobile close button */}
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setIsMobileOpen(false)}
                        className="md:hidden rounded-lg"
                    >
                        <X size={18} />
                    </Button>
                </div>

                <Separator className="mx-4" />

                {/* Navigation */}
                <ScrollArea className="flex-1 px-3 py-4">
                    <nav className="space-y-1">
                        {visibleMenuItems.map((item) => {
                            const isActive = item.href === "/app" 
                                ? pathname === "/app"
                                : pathname === item.href || pathname.startsWith(`${item.href}/`);
                            
                            return (
                                <NavItem key={item.name} item={item} isActive={isActive} />
                            );
                        })}
                    </nav>
                </ScrollArea>

                <Separator className="mx-4" />

                {/* Footer / Logout */}
                <div className="p-3">
                    <form action={logout}>
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <button
                                    type="submit"
                                    onClick={() => setIsMobileOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 w-full rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                                        "text-[var(--muted-text)] hover:bg-error-red/10 hover:text-error-red",
                                        isCollapsed && "md:justify-center"
                                    )}
                                >
                                    <LogOut size={20} className="shrink-0" />
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
