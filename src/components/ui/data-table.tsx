"use client";

import { ReactNode, useState, useMemo } from "react";
import { ChevronUp, ChevronDown, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Column<T> {
    key: keyof T | string;
    header: string;
    render?: (item: T) => ReactNode;
    sortable?: boolean;
    className?: string;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    keyExtractor: (item: T) => string;
    onRowClick?: (item: T) => void;
    emptyState?: ReactNode;
    searchable?: boolean;
    searchPlaceholder?: string;
    searchKeys?: (keyof T)[];
}

export function DataTable<T>({
    data,
    columns,
    keyExtractor,
    onRowClick,
    emptyState,
    searchable = false,
    searchPlaceholder = "Buscar...",
    searchKeys = [],
}: DataTableProps<T>) {
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const [searchQuery, setSearchQuery] = useState("");

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortDirection(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDirection("asc");
        }
    };

    const filteredData = useMemo(() => {
        if (!searchQuery || searchKeys.length === 0) return data;
        
        const query = searchQuery.toLowerCase();
        return data.filter(item => 
            searchKeys.some(key => {
                const value = item[key];
                if (typeof value === "string") {
                    return value.toLowerCase().includes(query);
                }
                return false;
            })
        );
    }, [data, searchQuery, searchKeys]);

    const sortedData = useMemo(() => {
        if (!sortKey) return filteredData;

        return [...filteredData].sort((a, b) => {
            const aValue = (a as Record<string, unknown>)[sortKey];
            const bValue = (b as Record<string, unknown>)[sortKey];

            if (aValue == null) return 1;
            if (bValue == null) return -1;

            if (typeof aValue === "string" && typeof bValue === "string") {
                return sortDirection === "asc"
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }

            if (typeof aValue === "number" && typeof bValue === "number") {
                return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
            }

            return 0;
        });
    }, [filteredData, sortKey, sortDirection]);

    return (
        <div className="bg-white rounded-xl border border-graphite-gray overflow-hidden">
            {searchable && (
                <div className="p-4 border-b border-graphite-gray">
                    <div className="relative max-w-sm">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="w-full pl-10 pr-4 py-2 text-sm border border-graphite-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent"
                        />
                    </div>
                </div>
            )}
            
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-soft-gray border-b border-graphite-gray">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={String(column.key)}
                                    className={`px-4 py-3 text-left text-xs font-semibold text-dark-slate uppercase tracking-wider ${
                                        column.sortable ? "cursor-pointer hover:bg-gray-100 transition-colors select-none" : ""
                                    } ${column.className || ""}`}
                                    onClick={() => column.sortable && handleSort(String(column.key))}
                                >
                                    <div className="flex items-center gap-1">
                                        {column.header}
                                        {column.sortable && sortKey === String(column.key) && (
                                            sortDirection === "asc" 
                                                ? <ChevronUp size={14} /> 
                                                : <ChevronDown size={14} />
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        <AnimatePresence>
                            {sortedData.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length}>
                                        {emptyState || (
                                            <div className="py-12 text-center text-gray-400 text-sm">
                                                No hay datos disponibles
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                sortedData.map((item, index) => (
                                    <motion.tr
                                        key={keyExtractor(item)}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ delay: index * 0.02 }}
                                        onClick={() => onRowClick?.(item)}
                                        className={`${
                                            onRowClick 
                                                ? "cursor-pointer hover:bg-soft-gray transition-colors" 
                                                : ""
                                        }`}
                                    >
                                        {columns.map((column) => (
                                            <td
                                                key={`${keyExtractor(item)}-${String(column.key)}`}
                                                className={`px-4 py-3 text-sm text-dark-slate ${column.className || ""}`}
                                            >
                                                {column.render 
                                                    ? column.render(item) 
                                                    : String((item as Record<string, unknown>)[String(column.key)] ?? "")
                                                }
                                            </td>
                                        ))}
                                    </motion.tr>
                                ))
                            )}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
