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

    if (segments.length <= 1) return null;

    const breadcrumbs = segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;
        
        let name = routeNames[segment];
        
        if (!name && isLast && !routeNames[segment]) {
            name = "Detalle";
        }
        
        name = name || segment;

        return { name, href, isLast };
    });

    return (
        <nav className="hidden md:flex items-center gap-1 text-sm">
            <Link 
                href="/app" 
                className="text-[var(--muted-text)] hover:text-[var(--foreground)] transition-colors p-1"
            >
                <Home size={15} />
            </Link>
            {breadcrumbs.map((crumb) => (
                <div key={crumb.href} className="flex items-center gap-1">
                    <ChevronRight size={13} className="text-[var(--card-border)]" />
                    {crumb.isLast ? (
                        <span className="text-[var(--foreground)] font-medium px-1 text-sm">
                            {crumb.name}
                        </span>
                    ) : (
                        <Link 
                            href={crumb.href}
                            className="text-[var(--muted-text)] hover:text-[var(--foreground)] transition-colors px-1 text-sm"
                        >
                            {crumb.name}
                        </Link>
                    )}
                </div>
            ))}
        </nav>
    );
}
