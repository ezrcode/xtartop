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

const menuItems = [
    { name: "Dashboard", href: "/app", icon: LayoutDashboard },
    { name: "Contacts", href: "/app/contacts", icon: Users },
    { name: "Companies", href: "/app/companies", icon: Building2 },
    { name: "Negocios", href: "/app/deals", icon: TrendingUp },
    { name: "Settings", href: "/app/settings", icon: Settings, requiresAdmin: true },
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
        handleResize(); // Call on mount
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Handle click outside to minimize sidebar
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Only for desktop view (not mobile)
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

    return (
        <>
            {/* Mobile overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside
                ref={sidebarRef}
                className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-graphite-gray transition-all duration-300 ease-in-out
                    ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
                    ${isMobileOpen || !isCollapsed ? "w-64" : "w-64"}
                    md:translate-x-0 ${isCollapsed ? "md:w-20" : "md:w-64"}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between h-16 px-4 border-b border-graphite-gray">
                    {/* Mobile: Always show full logo */}
                    <div className="md:hidden">
                        <Image 
                            src="/xtartop_logo.png" 
                            alt="xtartop" 
                            width={150} 
                            height={40}
                            className="h-8 w-auto"
                        />
                    </div>
                    
                    {/* Desktop: Collapsed/Expanded logo */}
                    <div className="hidden md:block">
                        {isCollapsed ? (
                            <div className="flex items-center justify-center w-full">
                                <Image 
                                    src="/xtartop_isotipo.png" 
                                    alt="xtartop" 
                                    width={32} 
                                    height={32}
                                    className="w-8 h-8"
                                />
                            </div>
                        ) : (
                            <Image 
                                src="/xtartop_logo.png" 
                                alt="xtartop" 
                                width={150} 
                                height={40}
                                className="h-8 w-auto"
                            />
                        )}
                    </div>
                    
                    {/* Desktop collapse button */}
                    <button
                        onClick={toggleCollapse}
                        className={`p-1 rounded-md hover:bg-soft-gray text-dark-slate hidden md:block ${isCollapsed ? "absolute top-4 right-2" : ""}`}
                    >
                        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </button>
                    
                    {/* Mobile close button */}
                    <button
                        onClick={() => setIsMobileOpen(false)}
                        className="md:hidden p-1 rounded-md hover:bg-soft-gray text-dark-slate"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                    {visibleMenuItems.map((item) => {
                        // Special handling for Dashboard (/app) to avoid matching all /app/* routes
                        const isActive = item.href === "/app" 
                            ? pathname === "/app"
                            : pathname === item.href || pathname.startsWith(`${item.href}/`);
                        const showText = !isCollapsed; // In mobile, always show text
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setIsMobileOpen(false)}
                                className={`flex items-center px-3 py-2 rounded-md transition-colors group ${isActive
                                        ? "bg-founder-blue/10 text-founder-blue border-l-4 border-founder-blue"
                                        : "text-dark-slate hover:bg-soft-gray hover:text-xtartop-black"
                                    }`}
                                title={isCollapsed ? item.name : undefined}
                            >
                                <item.icon
                                    size={20}
                                    className={`${isActive ? "text-founder-blue" : "text-dark-slate group-hover:text-xtartop-black"} ${
                                        !isCollapsed ? "mr-3" : "mx-auto"
                                    }`}
                                />
                                <span className={`font-medium ${!isCollapsed ? "block" : "hidden md:hidden"}`}>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer / Logout */}
                <div className="p-4 border-t border-graphite-gray">
                    <form action={logout}>
                        <button
                            type="submit"
                            onClick={() => setIsMobileOpen(false)}
                            className={`flex items-center w-full px-3 py-2 rounded-md text-dark-slate hover:bg-soft-gray hover:text-error-red transition-colors group ${isCollapsed ? "md:justify-center" : ""
                                }`}
                            title="Log Out"
                        >
                            <LogOut size={20} className={`text-dark-slate group-hover:text-error-red ${!isCollapsed ? "mr-3" : "md:mr-0"}`} />
                            <span className={`font-medium ${!isCollapsed ? "block" : "hidden"}`}>Log Out</span>
                        </button>
                    </form>
                </div>
            </aside>
        </>
    );
}
