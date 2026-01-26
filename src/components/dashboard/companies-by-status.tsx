"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Building2 } from "lucide-react";
import Link from "next/link";

interface CompaniesByStatus {
    status: string;
    label: string;
    count: number;
}

interface CompaniesByStatusProps {
    data: CompaniesByStatus[];
}

const statusColors: Record<string, string> = {
    PROSPECTO: "#94a3b8",
    POTENCIAL: "#60a5fa",
    CLIENTE: "#22c55e",
    ALIADO: "#a78bfa",
    INACTIVO: "#6b7280",
};

const statusLabels: Record<string, string> = {
    PROSPECTO: "Prospecto",
    POTENCIAL: "Potencial",
    CLIENTE: "Cliente",
    ALIADO: "Aliado",
    INACTIVO: "Inactivo",
};

export function CompaniesByStatus({ data }: CompaniesByStatusProps) {
    const total = useMemo(() => data.reduce((acc, d) => acc + d.count, 0), [data]);
    const filteredData = data.filter(d => d.count > 0);

    if (total === 0) {
        return (
            <div className="bg-white rounded-xl border border-graphite-gray p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-nearby-dark">Empresas por Estado</h3>
                    <Building2 size={18} className="text-gray-400" />
                </div>
                <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                    No hay empresas registradas
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-graphite-gray p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-nearby-dark">Empresas por Estado</h3>
                <Link href="/app/companies" className="text-xs text-nearby-accent hover:underline">
                    Ver todas
                </Link>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative w-32 h-32 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={filteredData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={55}
                                paddingAngle={2}
                                dataKey="count"
                            >
                                {filteredData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={statusColors[entry.status] || "#94a3b8"} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value, name, props) => [
                                    `${value} empresas`,
                                    statusLabels[(props.payload as any).status] || (props.payload as any).status
                                ]}
                                contentStyle={{
                                    backgroundColor: "#fff",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xl font-bold text-nearby-dark">{total}</span>
                        <span className="text-[10px] text-gray-500">total</span>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-1.5">
                    {filteredData.map((item) => (
                        <div key={item.status} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <div 
                                    className="w-2.5 h-2.5 rounded-full" 
                                    style={{ backgroundColor: statusColors[item.status] || "#94a3b8" }}
                                />
                                <span className="text-gray-600">{statusLabels[item.status] || item.status}</span>
                            </div>
                            <span className="font-medium text-nearby-dark">{item.count}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
