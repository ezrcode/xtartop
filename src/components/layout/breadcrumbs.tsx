"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const routeNames: Record<string, string> = {
    "app": "Inicio",
    "contacts": "Contactos",
    "companies": "Empresas",
    "deals": "Negocios",
    "settings": "Configuración",
    "profile": "Mi Perfil",
    "new": "Nuevo",
};

export function Breadcrumbs() {
    const pathname = usePathname();
    const segments = pathname.split("/").filter(Boolean);

    // Don't show breadcrumbs on main app page
    if (segments.length <= 1) return null;

    const breadcrumbs = segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;
        
        // Try to get friendly name, fallback to segment
        let name = routeNames[segment];
        
        // If it's an ID (last segment and not in routeNames), show "Detalle"
        if (!name && isLast && !routeNames[segment]) {
            name = "Detalle";
        }
        
        name = name || segment;

        return { name, href, isLast };
    });

    return (
        <nav className="hidden md:flex items-center gap-1 text-sm mb-4">
            <Link 
                href="/app" 
                className="text-gray-400 hover:text-nearby-dark transition-colors p-1"
            >
                <Home size={16} />
            </Link>
            {breadcrumbs.map((crumb, index) => (
                <div key={crumb.href} className="flex items-center gap-1">
                    <ChevronRight size={14} className="text-gray-300" />
                    {crumb.isLast ? (
                        <span className="text-nearby-dark font-medium px-1">
                            {crumb.name}
                        </span>
                    ) : (
                        <Link 
                            href={crumb.href}
                            className="text-gray-500 hover:text-nearby-dark transition-colors px-1"
                        >
                            {crumb.name}
                        </Link>
                    )}
                </div>
            ))}
        </nav>
    );
}
