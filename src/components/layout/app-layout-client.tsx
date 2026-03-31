"use client";

import { useState, Suspense, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CommandPalette } from "@/components/layout/command-palette";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { ThemePreference } from "@prisma/client";

// Loading fallback para el topbar
function TopbarSkeleton() {
    return (
        <div
            className="bg-[var(--card-bg)] border-b border-[var(--card-border)] animate-pulse"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
            <div className="h-16 flex items-center justify-end px-4">
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
    currentExchangeRate?: number | null;
    children: React.ReactNode;
}

export function AppLayoutClient({ user, userRole, currentExchangeRate = null, children }: AppLayoutClientProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const theme = user.themePreference || "LIGHT";
        const root = document.documentElement;
        root.classList.remove("dark", "theme-system");
        if (theme === "DARK") {
            root.classList.add("dark");
        } else if (theme === "SYSTEM") {
            root.classList.add("theme-system");
        }
    }, [user.themePreference]);

    return (
        <div className="flex min-h-[100dvh] bg-[var(--background)]">
            <CommandPalette userRole={userRole} />
            <OfflineBanner />
            
            <Sidebar 
                userRole={userRole}
                user={user}
                isMobileOpen={isMobileMenuOpen}
                setIsMobileOpen={setIsMobileMenuOpen}
            />
            
            <div className="flex-1 min-w-0 md:ml-16">
                <Suspense fallback={<TopbarSkeleton />}>
                    <Topbar 
                        user={user} 
                        currentExchangeRate={currentExchangeRate}
                        onMenuClick={() => setIsMobileMenuOpen(true)}
                    />
                </Suspense>
                <main className="pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
                    {children}
                </main>
            </div>
            
            <BottomNav userRole={userRole} />
        </div>
    );
}
