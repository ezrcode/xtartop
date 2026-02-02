"use client";

import { useState, Suspense, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { ThemePreference } from "@prisma/client";

// Loading fallback para el topbar
function TopbarSkeleton() {
    return (
        <div className="h-16 bg-[var(--card-bg)] border-b border-[var(--card-border)] animate-pulse">
            <div className="h-full flex items-center justify-end px-4">
                <div className="h-8 w-8 rounded-full bg-[var(--hover-bg)]" />
            </div>
        </div>
    );
}

interface AppLayoutClientProps {
    user: {
        name?: string | null;
        email?: string | null;
        photoUrl?: string | null;
        themePreference?: ThemePreference;
    };
    userRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | null;
    children: React.ReactNode;
}

export function AppLayoutClient({ user, userRole, children }: AppLayoutClientProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Apply theme on mount based on user preference
    useEffect(() => {
        const theme = user.themePreference || "SYSTEM";
        const root = document.documentElement;
        
        // Remove all theme classes
        root.classList.remove("dark", "theme-system");
        
        if (theme === "DARK") {
            root.classList.add("dark");
        } else if (theme === "SYSTEM") {
            root.classList.add("theme-system");
        }
        // LIGHT is the default (no class needed)
    }, [user.themePreference]);

    // Listen to sidebar collapse state from localStorage
    useEffect(() => {
        const checkCollapsed = () => {
            const stored = localStorage.getItem("sidebarCollapsed");
            if (stored && window.innerWidth >= 768) {
                setSidebarCollapsed(JSON.parse(stored));
            }
        };
        checkCollapsed();
        
        // Listen for storage events (when sidebar toggles)
        const interval = setInterval(checkCollapsed, 100);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex min-h-screen bg-[var(--background)]">
            {/* Offline Banner */}
            <OfflineBanner />
            
            {/* Desktop Sidebar */}
            <Sidebar 
                userRole={userRole} 
                isMobileOpen={isMobileMenuOpen}
                setIsMobileOpen={setIsMobileMenuOpen}
            />
            
            <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
                <Suspense fallback={<TopbarSkeleton />}>
                    <Topbar 
                        user={user} 
                        onMenuClick={() => setIsMobileMenuOpen(true)}
                    />
                </Suspense>
                <main className="pb-20 md:pb-0">
                    {children}
                </main>
            </div>
            
            {/* Mobile Bottom Navigation */}
            <BottomNav userRole={userRole} />
        </div>
    );
}

