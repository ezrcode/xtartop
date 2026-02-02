"use client";

import { ReactNode, useState, useMemo, useEffect, useCallback, useRef } from "react";
import { ChevronUp, ChevronDown, Search, Filter, Columns, Check, X, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface TablePreferences {
    sortKey?: string;
    sortDirection?: "asc" | "desc";
    visibleColumns?: string[];
    filters?: Record<string, string>;
    searchTerm?: string;
}

export interface Column<T> {
    key: keyof T | string;
    header: string;
    render?: (item: T) => ReactNode;
    sortable?: boolean;
    filterable?: boolean;
    filterOptions?: { value: string; label: string }[];
    hideable?: boolean;
    defaultVisible?: boolean;
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
    // Preferences
    initialPreferences?: TablePreferences;
    onSavePreferences?: (prefs: TablePreferences) => Promise<void>;
    showSaveButton?: boolean;
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
    initialPreferences,
    onSavePreferences,
    showSaveButton = true,
}: DataTableProps<T>) {
    // Initialize state from preferences or defaults
    const [sortKey, setSortKey] = useState<string | null>(initialPreferences?.sortKey || null);
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">(initialPreferences?.sortDirection || "asc");
    const [searchQuery, setSearchQuery] = useState(initialPreferences?.searchTerm || "");
    const [filters, setFilters] = useState<Record<string, string>>(initialPreferences?.filters || {});
    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
        if (initialPreferences?.visibleColumns && initialPreferences.visibleColumns.length > 0) {
            return initialPreferences.visibleColumns;
        }
        return columns
            .filter(col => col.defaultVisible !== false)
            .map(col => String(col.key));
    });
    
    // UI state
    const [showFilters, setShowFilters] = useState(false);
    const [showColumnSelector, setShowColumnSelector] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    
    // Refs for click outside
    const filterRef = useRef<HTMLDivElement>(null);
    const columnRef = useRef<HTMLDivElement>(null);

    // Track changes
    useEffect(() => {
        const currentPrefs: TablePreferences = {
            sortKey: sortKey || undefined,
            sortDirection,
            visibleColumns,
            filters: Object.keys(filters).length > 0 ? filters : undefined,
            searchTerm: searchQuery || undefined,
        };
        
        const initialSortKey = initialPreferences?.sortKey;
        const initialSortDir = initialPreferences?.sortDirection || "asc";
        const initialCols = initialPreferences?.visibleColumns || columns.filter(c => c.defaultVisible !== false).map(c => String(c.key));
        const initialFilters = initialPreferences?.filters || {};
        const initialSearch = initialPreferences?.searchTerm || "";
        
        const changed = 
            currentPrefs.sortKey !== initialSortKey ||
            currentPrefs.sortDirection !== initialSortDir ||
            JSON.stringify(currentPrefs.visibleColumns?.sort()) !== JSON.stringify(initialCols.sort()) ||
            JSON.stringify(currentPrefs.filters) !== JSON.stringify(initialFilters) ||
            currentPrefs.searchTerm !== initialSearch;
            
        setHasChanges(changed);
    }, [sortKey, sortDirection, visibleColumns, filters, searchQuery, initialPreferences, columns]);

    // Click outside handlers
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setShowFilters(false);
            }
            if (columnRef.current && !columnRef.current.contains(event.target as Node)) {
                setShowColumnSelector(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortDirection(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDirection("asc");
        }
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => {
            if (value === "") {
                const newFilters = { ...prev };
                delete newFilters[key];
                return newFilters;
            }
            return { ...prev, [key]: value };
        });
    };

    const toggleColumn = (key: string) => {
        setVisibleColumns(prev => {
            if (prev.includes(key)) {
                // Don't allow hiding all columns
                if (prev.length <= 1) return prev;
                return prev.filter(k => k !== key);
            }
            return [...prev, key];
        });
    };

    const handleSave = useCallback(async () => {
        if (!onSavePreferences) return;
        
        setIsSaving(true);
        try {
            await onSavePreferences({
                sortKey: sortKey || undefined,
                sortDirection,
                visibleColumns,
                filters: Object.keys(filters).length > 0 ? filters : undefined,
                searchTerm: searchQuery || undefined,
            });
            setHasChanges(false);
        } catch (error) {
            console.error("Error saving preferences:", error);
        } finally {
            setIsSaving(false);
        }
    }, [onSavePreferences, sortKey, sortDirection, visibleColumns, filters, searchQuery]);

    const clearFilters = () => {
        setFilters({});
    };

    // Filter data based on search and column filters
    const filteredData = useMemo(() => {
        let result = data;
        
        // Apply search filter
        if (searchQuery && searchKeys.length > 0) {
            const query = searchQuery.toLowerCase();
            result = result.filter(item => 
                searchKeys.some(key => {
                    const value = item[key];
                    if (typeof value === "string") {
                        return value.toLowerCase().includes(query);
                    }
                    return false;
                })
            );
        }
        
        // Apply column filters
        Object.entries(filters).forEach(([key, filterValue]) => {
            if (filterValue) {
                result = result.filter(item => {
                    const value = (item as Record<string, unknown>)[key];
                    return String(value) === filterValue;
                });
            }
        });
        
        return result;
    }, [data, searchQuery, searchKeys, filters]);

    // Sort filtered data
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

    // Get visible columns
    const displayColumns = useMemo(() => {
        return columns.filter(col => visibleColumns.includes(String(col.key)));
    }, [columns, visibleColumns]);

    // Get filterable columns
    const filterableColumns = useMemo(() => {
        return columns.filter(col => col.filterable && col.filterOptions);
    }, [columns]);

    // Get hideable columns
    const hideableColumns = useMemo(() => {
        return columns.filter(col => col.hideable !== false);
    }, [columns]);

    const activeFiltersCount = Object.keys(filters).length;

    return (
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-[var(--card-border)] flex flex-wrap items-center gap-3">
                {/* Search */}
                {searchable && (
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-text)]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="w-full pl-10 pr-4 py-2.5 min-h-[44px] text-base sm:text-sm bg-[var(--input-bg)] text-[var(--foreground)] placeholder:text-[var(--muted-text)] border border-[var(--input-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent"
                        />
                    </div>
                )}
                
                <div className="flex items-center gap-2 ml-auto">
                    {/* Filter Button */}
                    {filterableColumns.length > 0 && (
                        <div className="relative" ref={filterRef}>
                            <button
                                type="button"
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-3 py-2.5 min-h-[44px] text-sm border rounded-lg transition-colors ${
                                    activeFiltersCount > 0
                                        ? "bg-nearby-accent text-white border-nearby-accent"
                                        : "border-[var(--card-border)] text-[var(--foreground)] hover:bg-[var(--hover-bg)]"
                                }`}
                            >
                                <Filter size={16} />
                                <span className="hidden sm:inline">Filtros</span>
                                {activeFiltersCount > 0 && (
                                    <span className="bg-white text-nearby-accent text-xs font-bold px-1.5 py-0.5 rounded-full">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </button>
                            
                            {showFilters && (
                                <div className="absolute right-0 top-full mt-2 w-72 bg-[var(--card-bg)] rounded-lg shadow-lg border border-[var(--card-border)] z-50 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-semibold text-sm text-[var(--foreground)]">Filtros</h4>
                                        {activeFiltersCount > 0 && (
                                            <button
                                                type="button"
                                                onClick={clearFilters}
                                                className="text-xs text-red-600 hover:text-red-700"
                                            >
                                                Limpiar todo
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        {filterableColumns.map(col => (
                                            <div key={String(col.key)}>
                                                <label className="block text-xs font-medium text-[var(--muted-text)] mb-1">
                                                    {col.header}
                                                </label>
                                                <select
                                                    value={filters[String(col.key)] || ""}
                                                    onChange={(e) => handleFilterChange(String(col.key), e.target.value)}
                                                    className="w-full px-3 py-2.5 min-h-[44px] text-sm bg-[var(--input-bg)] text-[var(--foreground)] border border-[var(--input-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-nearby-accent/20"
                                                >
                                                    <option value="">Todos</option>
                                                    {col.filterOptions?.map(opt => (
                                                        <option key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Column Selector */}
                    {hideableColumns.length > 0 && (
                        <div className="relative" ref={columnRef}>
                            <button
                                type="button"
                                onClick={() => setShowColumnSelector(!showColumnSelector)}
                                className="flex items-center gap-2 px-3 py-2.5 min-h-[44px] text-sm border border-[var(--card-border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
                            >
                                <Columns size={16} />
                                <span className="hidden sm:inline">Columnas</span>
                            </button>
                            
                            {showColumnSelector && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--card-bg)] rounded-lg shadow-lg border border-[var(--card-border)] z-50 p-2">
                                    <div className="text-xs font-semibold text-[var(--muted-text)] px-2 py-1 mb-1">
                                        Mostrar columnas
                                    </div>
                                    {hideableColumns.map(col => (
                                        <button
                                            key={String(col.key)}
                                            type="button"
                                            onClick={() => toggleColumn(String(col.key))}
                                            className="w-full flex items-center gap-2 px-2 py-2.5 min-h-[44px] text-sm text-[var(--foreground)] hover:bg-[var(--hover-bg)] rounded transition-colors"
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                                visibleColumns.includes(String(col.key))
                                                    ? "bg-nearby-accent border-nearby-accent"
                                                    : "border-[var(--input-border)]"
                                            }`}>
                                                {visibleColumns.includes(String(col.key)) && (
                                                    <Check size={12} className="text-white" />
                                                )}
                                            </div>
                                            <span>{col.header}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Save Button */}
                    {showSaveButton && onSavePreferences && hasChanges && (
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-3 py-2.5 min-h-[44px] text-sm bg-nearby-accent text-white rounded-lg hover:bg-nearby-accent/90 transition-colors disabled:opacity-50"
                        >
                            <Save size={16} />
                            <span className="hidden sm:inline">{isSaving ? "Guardando..." : "Guardar vista"}</span>
                            <span className="sm:hidden">{isSaving ? "..." : "Guardar"}</span>
                        </button>
                    )}
                </div>
            </div>
            
            {/* Active Filters Display */}
            {activeFiltersCount > 0 && (
                <div className="px-4 py-2 bg-[var(--hover-bg)] border-b border-[var(--card-border)] flex flex-wrap items-center gap-2">
                    <span className="text-xs text-[var(--muted-text)]">Filtros activos:</span>
                    {Object.entries(filters).map(([key, value]) => {
                        const column = columns.find(c => String(c.key) === key);
                        const option = column?.filterOptions?.find(o => o.value === value);
                        return (
                            <span
                                key={key}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-full text-xs text-[var(--foreground)]"
                            >
                                <span className="font-medium">{column?.header}:</span>
                                <span>{option?.label || value}</span>
                                <button
                                    type="button"
                                    onClick={() => handleFilterChange(key, "")}
                                    className="ml-1 text-[var(--muted-text)] hover:text-[var(--foreground)]"
                                >
                                    <X size={12} />
                                </button>
                            </span>
                        );
                    })}
                </div>
            )}
            
            {/* Mobile Card View */}
            <div className="block md:hidden">
                {sortedData.length === 0 ? (
                    emptyState || (
                        <div className="py-12 text-center text-[var(--muted-text)] text-sm">
                            No hay datos disponibles
                        </div>
                    )
                ) : (
                    <div className="divide-y divide-[var(--card-border)]">
                        <AnimatePresence>
                            {sortedData.map((item, index) => (
                                <motion.div
                                    key={keyExtractor(item)}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ delay: index * 0.02 }}
                                    onClick={() => onRowClick?.(item)}
                                    className={`p-4 ${
                                        onRowClick 
                                            ? "cursor-pointer hover:bg-[var(--hover-bg)] active:bg-[var(--hover-bg)] transition-colors" 
                                            : ""
                                    }`}
                                >
                                    <div className="space-y-2">
                                        {displayColumns.slice(0, 4).map((column, colIndex) => (
                                            <div 
                                                key={`${keyExtractor(item)}-${String(column.key)}`}
                                                className={colIndex === 0 ? "font-medium text-[var(--foreground)]" : "flex justify-between text-sm"}
                                            >
                                                {colIndex === 0 ? (
                                                    column.render 
                                                        ? column.render(item) 
                                                        : String((item as Record<string, unknown>)[String(column.key)] ?? "")
                                                ) : (
                                                    <>
                                                        <span className="text-[var(--muted-text)]">{column.header}</span>
                                                        <span className="text-[var(--foreground)]">
                                                            {column.render 
                                                                ? column.render(item) 
                                                                : String((item as Record<string, unknown>)[String(column.key)] ?? "")}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-[var(--hover-bg)] border-b border-[var(--card-border)]">
                        <tr>
                            {displayColumns.map((column) => (
                                <th
                                    key={String(column.key)}
                                    className={`px-4 py-3 text-left text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider ${
                                        column.sortable ? "cursor-pointer hover:bg-[var(--card-border)]/50 transition-colors select-none" : ""
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
                    <tbody className="divide-y divide-[var(--card-border)]">
                        <AnimatePresence>
                            {sortedData.length === 0 ? (
                                <tr>
                                    <td colSpan={displayColumns.length}>
                                        {emptyState || (
                                            <div className="py-12 text-center text-[var(--muted-text)] text-sm">
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
                                                ? "cursor-pointer hover:bg-[var(--hover-bg)] transition-colors" 
                                                : ""
                                        }`}
                                    >
                                        {displayColumns.map((column) => (
                                            <td
                                                key={`${keyExtractor(item)}-${String(column.key)}`}
                                                className={`px-4 py-3 text-sm text-[var(--foreground)] ${column.className || ""}`}
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
            
            {/* Footer with count */}
            <div className="px-4 py-2 border-t border-[var(--card-border)] bg-[var(--hover-bg)] text-xs text-[var(--muted-text)]">
                {sortedData.length} de {data.length} registros
            </div>
        </div>
    );
}
