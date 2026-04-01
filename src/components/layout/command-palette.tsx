"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search, Building2, Users, TrendingUp, Plus, Settings, User, Loader2 } from "lucide-react";
import { globalSearch, type SearchResult } from "@/actions/search";

interface CommandPaletteProps {
    userRole?: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER" | null;
}

export function CommandPalette({ userRole }: CommandPaletteProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((prev) => !prev);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const doSearch = useCallback(async (q: string) => {
        if (q.trim().length < 2) {
            setResults([]);
            return;
        }
        setLoading(true);
        try {
            const res = await globalSearch(q);
            setResults(res);
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const onValueChange = (value: string) => {
        setQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(value), 250);
    };

    const navigate = (href: string) => {
        setOpen(false);
        setQuery("");
        setResults([]);
        router.push(href);
    };

    const iconForType = (type: string) => {
        switch (type) {
            case "company": return <Building2 size={16} className="text-nearby-dark dark:text-nearby-dark-300" />;
            case "contact": return <Users size={16} className="text-ocean-blue" />;
            case "deal": return <TrendingUp size={16} className="text-success-green" />;
            default: return <Search size={16} />;
        }
    };

    const labelForType = (type: string) => {
        switch (type) {
            case "company": return "Empresa";
            case "contact": return "Contacto";
            case "deal": return "Negocio";
            default: return "";
        }
    };

    const isAdmin = userRole === "OWNER" || userRole === "ADMIN";

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100]">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0"
                onClick={() => { setOpen(false); setQuery(""); setResults([]); }}
            />
            <div className="absolute left-1/2 top-[20%] -translate-x-1/2 w-full max-w-xl px-4">
                <Command
                    className="bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)] shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95"
                    shouldFilter={false}
                >
                    <div className="flex items-center gap-3 px-4 border-b border-[var(--card-border)]">
                        {loading ? (
                            <Loader2 size={18} className="text-[var(--muted-text)] animate-spin shrink-0" />
                        ) : (
                            <Search size={18} className="text-[var(--muted-text)] shrink-0" />
                        )}
                        <Command.Input
                            value={query}
                            onValueChange={onValueChange}
                            placeholder="Buscar empresas, contactos, negocios..."
                            className="flex-1 h-12 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-text)] outline-none"
                        />
                        <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-[var(--muted-text)] bg-[var(--hover-bg)] rounded-md border border-[var(--card-border)]">
                            ESC
                        </kbd>
                    </div>

                    <Command.List className="max-h-80 overflow-y-auto p-2">
                        {query.trim().length >= 2 && results.length === 0 && !loading && (
                            <Command.Empty className="py-8 text-center text-sm text-[var(--muted-text)]">
                                No se encontraron resultados
                            </Command.Empty>
                        )}

                        {results.length > 0 && (
                            <Command.Group heading="Resultados" className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[var(--muted-text)] [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                                {results.map((r) => (
                                    <Command.Item
                                        key={`${r.type}-${r.id}`}
                                        value={`${r.type}-${r.id}`}
                                        onSelect={() => navigate(r.href)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors data-[selected=true]:bg-[var(--hover-bg)]"
                                    >
                                        {iconForType(r.type)}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-[var(--foreground)] truncate">{r.name}</p>
                                            {r.subtitle && (
                                                <p className="text-xs text-[var(--muted-text)] truncate">{r.subtitle}</p>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-[var(--muted-text)] uppercase tracking-wide shrink-0">
                                            {labelForType(r.type)}
                                        </span>
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        )}

                        {query.trim().length < 2 && (
                            <>
                                <Command.Group heading="Acciones rápidas" className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[var(--muted-text)] [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                                    <Command.Item
                                        onSelect={() => navigate("/app/companies/new")}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors data-[selected=true]:bg-[var(--hover-bg)]"
                                    >
                                        <Plus size={16} className="text-nearby-dark dark:text-nearby-dark-300" />
                                        <span className="text-[var(--foreground)]">Nueva Empresa</span>
                                    </Command.Item>
                                    <Command.Item
                                        onSelect={() => navigate("/app/contacts/new")}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors data-[selected=true]:bg-[var(--hover-bg)]"
                                    >
                                        <Plus size={16} className="text-ocean-blue" />
                                        <span className="text-[var(--foreground)]">Nuevo Contacto</span>
                                    </Command.Item>
                                    <Command.Item
                                        onSelect={() => navigate("/app/deals/new")}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors data-[selected=true]:bg-[var(--hover-bg)]"
                                    >
                                        <Plus size={16} className="text-success-green" />
                                        <span className="text-[var(--foreground)]">Nuevo Negocio</span>
                                    </Command.Item>
                                </Command.Group>
                                <Command.Group heading="Navegar" className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[var(--muted-text)] [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                                    <Command.Item onSelect={() => navigate("/app")} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors data-[selected=true]:bg-[var(--hover-bg)]">
                                        <Search size={16} className="text-[var(--muted-text)]" />
                                        <span className="text-[var(--foreground)]">Dashboard</span>
                                    </Command.Item>
                                    <Command.Item onSelect={() => navigate("/app/companies")} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors data-[selected=true]:bg-[var(--hover-bg)]">
                                        <Building2 size={16} className="text-[var(--muted-text)]" />
                                        <span className="text-[var(--foreground)]">Empresas</span>
                                    </Command.Item>
                                    <Command.Item onSelect={() => navigate("/app/contacts")} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors data-[selected=true]:bg-[var(--hover-bg)]">
                                        <Users size={16} className="text-[var(--muted-text)]" />
                                        <span className="text-[var(--foreground)]">Contactos</span>
                                    </Command.Item>
                                    <Command.Item onSelect={() => navigate("/app/deals")} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors data-[selected=true]:bg-[var(--hover-bg)]">
                                        <TrendingUp size={16} className="text-[var(--muted-text)]" />
                                        <span className="text-[var(--foreground)]">Negocios</span>
                                    </Command.Item>
                                    {isAdmin && (
                                        <Command.Item onSelect={() => navigate("/app/settings")} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors data-[selected=true]:bg-[var(--hover-bg)]">
                                            <Settings size={16} className="text-[var(--muted-text)]" />
                                            <span className="text-[var(--foreground)]">Configuración</span>
                                        </Command.Item>
                                    )}
                                    <Command.Item onSelect={() => navigate("/app/profile")} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors data-[selected=true]:bg-[var(--hover-bg)]">
                                        <User size={16} className="text-[var(--muted-text)]" />
                                        <span className="text-[var(--foreground)]">Mi Perfil</span>
                                    </Command.Item>
                                </Command.Group>
                            </>
                        )}
                    </Command.List>

                    <div className="border-t border-[var(--card-border)] px-4 py-2 flex items-center gap-4 text-[10px] text-[var(--muted-text)]">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-[var(--hover-bg)] rounded border border-[var(--card-border)] font-medium">↑↓</kbd>
                            navegar
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-[var(--hover-bg)] rounded border border-[var(--card-border)] font-medium">↵</kbd>
                            seleccionar
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-[var(--hover-bg)] rounded border border-[var(--card-border)] font-medium">esc</kbd>
                            cerrar
                        </span>
                    </div>
                </Command>
            </div>
        </div>
    );
}
