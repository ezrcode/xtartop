"use client";

import { useState, Suspense } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

// Loading fallback para el topbar
function TopbarSkeleton() {
    return (
        <div className="h-16 bg-white border-b border-graphite-gray animate-pulse">
            <div className="h-full flex items-center justify-end px-4">
                <div className="h-8 w-8 rounded-full bg-gray-200" />
            </div>
        </div>
    );
}

interface AppLayoutClientProps {
    user: {
        name?: string | null;
        email?: string | null;
        photoUrl?: string | null;
    };
    userRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | null;
    children: React.ReactNode;
}

export function AppLayoutClient({ user, userRole, children }: AppLayoutClientProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-soft-gray">
            <Sidebar 
                userRole={userRole} 
                isMobileOpen={isMobileMenuOpen}
                setIsMobileOpen={setIsMobileMenuOpen}
            />
            <div className="flex-1 md:ml-20 transition-all duration-300">
                <Suspense fallback={<TopbarSkeleton />}>
                    <Topbar 
                        user={user} 
                        onMenuClick={() => setIsMobileMenuOpen(true)}
                    />
                </Suspense>
                <main>
                    {children}
                </main>
            </div>
        </div>
    );
}

