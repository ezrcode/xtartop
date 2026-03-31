"use client";

import { Building2 } from "lucide-react";
import Link from "next/link";

interface CompaniesByStatusData {
    status: string;
    label: string;
    count: number;
}

interface CompaniesByStatusProps {
    data: CompaniesByStatusData[];
}

const statusColors: Record<string, string> = {
    PROSPECTO: "bg-slate-400",
    POTENCIAL: "bg-blue-400",
    CLIENTE: "bg-success-green",
    ALIADO: "bg-purple-400",
    INACTIVO: "bg-nearby-dark-300",
};

const statusStrokeColors: Record<string, string> = {
    PROSPECTO: "#94a3b8",
    POTENCIAL: "#60a5fa",
    CLIENTE: "#1BC47D",
    ALIADO: "#a78bfa",
    INACTIVO: "#9aa8b8",
};

export function CompaniesByStatus({ data }: CompaniesByStatusProps) {
    const total = data.reduce((acc, d) => acc + d.count, 0);
    const filteredData = data.filter(d => d.count > 0);

    if (total === 0) {
        return (
            <div className="bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)] p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">Empresas por Estado</h3>
                    <Building2 size={18} className="text-[var(--muted-text)]" />
                </div>
                <div className="flex items-center justify-center h-40 sm:h-48 text-[var(--muted-text)] text-sm">
                    No hay empresas registradas
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Empresas por Estado</h3>
                <Link 
                    href="/app/companies" 
                    className="text-xs text-nearby-accent hover:underline py-1 px-2 -mr-2 rounded-lg active:bg-nearby-accent/10"
                >
                    Ver todas
                </Link>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 sm:w-28 sm:h-28">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        {filteredData.reduce((acc, item) => {
                            const percentage = (item.count / total) * 100;
                            const offset = acc.offset;
                            const strokeColor = statusStrokeColors[item.status] || "#9aa8b8";
                            acc.elements.push(
                                <circle
                                    key={item.status}
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="transparent"
                                    stroke={strokeColor}
                                    strokeWidth="16"
                                    strokeDasharray={`${percentage * 2.51} ${251 - percentage * 2.51}`}
                                    strokeDashoffset={-offset * 2.51}
                                />
                            );
                            acc.offset += percentage;
                            return acc;
                        }, { elements: [] as React.ReactNode[], offset: 0 }).elements}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg sm:text-xl font-bold text-[var(--foreground)]">{total}</span>
                        <span className="text-[10px] text-[var(--muted-text)]">total</span>
                    </div>
                </div>

                <div className="flex-1 space-y-1.5">
                    {filteredData.map((item) => (
                        <div key={item.status} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${statusColors[item.status] || 'bg-nearby-dark-300'}`} />
                                <span className="text-[var(--muted-text)]">{item.label}</span>
                            </div>
                            <span className="font-medium text-[var(--foreground)]">{item.count}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
