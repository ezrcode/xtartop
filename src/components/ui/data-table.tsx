"use client";

import { ReactNode, useState, useMemo, useEffect, useCallback, useRef } from "react";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search, Filter, Columns, Check, X, Save, MoreHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Input } from "./input";
import { Badge } from "./badge";

export interface TablePreferences {
    sortKey?: string;
    sortDirection?: "asc" | "desc";
    visibleColumns?: string[];
    filters?: Record<string, string>;
    searchTerm?: string;
}

export type ItemsPerPage = 10 | 25 | 50;

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
    initialPreferences?: TablePreferences;
    onSavePreferences?: (prefs: TablePreferences) => Promise<void>;
    showSaveButton?: boolean;
    // Pagination
    paginated?: boolean;
    itemsPerPage?: ItemsPerPage;
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
    paginated = true,
    itemsPerPage = 10,
}: DataTableProps<T>) {
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
    
    const [showFilters, setShowFilters] = useState(false);
    const [showColumnSelector, setShowColumnSelector] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    
    const filterRef = useRef<HTMLDivElement>(null);
    const columnRef = useRef<HTMLDivElement>(null);

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

    const filteredData = useMemo(() => {
        let result = data;
        
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

    // Pagination calculations
    const totalPages = useMemo(() => {
        if (!paginated) return 1;
        return Math.ceil(sortedData.length / itemsPerPage);
    }, [sortedData.length, itemsPerPage, paginated]);

    const paginatedData = useMemo(() => {
        if (!paginated) return sortedData;
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedData.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedData, currentPage, itemsPerPage, paginated]);

    // Reset page when filters/search change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filters]);

    const displayColumns = useMemo(() => {
        return columns.filter(col => visibleColumns.includes(String(col.key)));
    }, [columns, visibleColumns]);

    const filterableColumns = useMemo(() => {
        return columns.filter(col => col.filterable && col.filterOptions);
    }, [columns]);

    const hideableColumns = useMemo(() => {
        return columns.filter(col => col.hideable !== false);
    }, [columns]);

    const activeFiltersCount = Object.keys(filters).length;

    return (
        <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] overflow-hidden shadow-sm">
            {/* Toolbar */}
            <div className="p-4 border-b border-[var(--card-border)] flex flex-wrap items-center gap-3">
                {/* Search */}
                {searchable && (
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <Input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={searchPlaceholder}
                            icon={<Search size={18} />}
                            iconPosition="left"
                            className="h-10"
                        />
                    </div>
                )}
                
                <div className="flex items-center gap-2 ml-auto">
                    {/* Filter Button */}
                    {filterableColumns.length > 0 && (
                        <div className="relative" ref={filterRef}>
                            <Button
                                variant={activeFiltersCount > 0 ? "primary" : "outline"}
                                size="sm"
                                onClick={() => setShowFilters(!showFilters)}
                                className="gap-2"
                            >
                                <Filter size={16} />
                                <span className="hidden sm:inline">Filtros</span>
                                {activeFiltersCount > 0 && (
                                    <Badge variant="secondary" size="sm" className="ml-1">
                                        {activeFiltersCount}
                                    </Badge>
                                )}
                            </Button>
                            
                            {showFilters && (
                                <div className="absolute right-0 top-full mt-2 w-80 bg-[var(--card-bg)] rounded-xl shadow-xl border border-[var(--card-border)] z-50 p-4 animate-in fade-in-0 zoom-in-95">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-semibold text-[var(--foreground)]">Filtros</h4>
                                        {activeFiltersCount > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={clearFilters}
                                                className="text-error-red hover:text-error-red"
                                            >
                                                Limpiar todo
                                            </Button>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        {filterableColumns.map(col => (
                                            <div key={String(col.key)}>
                                                <label className="block text-xs font-medium text-[var(--muted-text)] mb-2">
                                                    {col.header}
                                                </label>
                                                <select
                                                    value={filters[String(col.key)] || ""}
                                                    onChange={(e) => handleFilterChange(String(col.key), e.target.value)}
                                                    className="w-full h-10 px-3 text-sm bg-[var(--input-bg)] text-[var(--foreground)] border-2 border-[var(--input-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent transition-all"
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
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowColumnSelector(!showColumnSelector)}
                                className="gap-2"
                            >
                                <Columns size={16} />
                                <span className="hidden sm:inline">Columnas</span>
                            </Button>
                            
                            {showColumnSelector && (
                                <div className="absolute right-0 top-full mt-2 w-60 bg-[var(--card-bg)] rounded-xl shadow-xl border border-[var(--card-border)] z-50 p-2 animate-in fade-in-0 zoom-in-95">
                                    <div className="text-xs font-semibold text-[var(--muted-text)] px-3 py-2 uppercase tracking-wider">
                                        Mostrar columnas
                                    </div>
                                    {hideableColumns.map(col => (
                                        <button
                                            key={String(col.key)}
                                            type="button"
                                            onClick={() => toggleColumn(String(col.key))}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
                                        >
                                            <div className={cn(
                                                "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                                                visibleColumns.includes(String(col.key))
                                                    ? "bg-nearby-accent border-nearby-accent"
                                                    : "border-[var(--input-border)]"
                                            )}>
                                                {visibleColumns.includes(String(col.key)) && (
                                                    <Check size={14} className="text-white" />
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
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleSave}
                            loading={isSaving}
                            className="gap-2"
                        >
                            <Save size={16} />
                            <span className="hidden sm:inline">Guardar vista</span>
                        </Button>
                    )}
                </div>
            </div>
            
            {/* Active Filters Display */}
            {activeFiltersCount > 0 && (
                <div className="px-4 py-3 bg-[var(--hover-bg)] border-b border-[var(--card-border)] flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-[var(--muted-text)]">Filtros activos:</span>
                    {Object.entries(filters).map(([key, value]) => {
                        const column = columns.find(c => String(c.key) === key);
                        const option = column?.filterOptions?.find(o => o.value === value);
                        return (
                            <Badge
                                key={key}
                                variant="secondary"
                                className="gap-1.5 pr-1.5"
                            >
                                <span className="font-medium">{column?.header}:</span>
                                <span>{option?.label || value}</span>
                                <button
                                    type="button"
                                    onClick={() => handleFilterChange(key, "")}
                                    className="ml-0.5 p-0.5 rounded-full hover:bg-[var(--card-border)] transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            </Badge>
                        );
                    })}
                </div>
            )}
            
            {/* Mobile Card View */}
            <div className="block md:hidden">
                {paginatedData.length === 0 ? (
                    emptyState || (
                        <div className="py-16 text-center">
                            <div className="text-[var(--muted-text)] text-sm">No hay datos disponibles</div>
                        </div>
                    )
                ) : (
                    <div className="divide-y divide-[var(--card-border)]">
                        <AnimatePresence>
                            {paginatedData.map((item, index) => (
                                <motion.div
                                    key={keyExtractor(item)}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ delay: index * 0.02 }}
                                    onClick={() => onRowClick?.(item)}
                                    className={cn(
                                        "p-4",
                                        onRowClick && "cursor-pointer hover:bg-[var(--hover-bg)] active:bg-[var(--hover-bg)] transition-colors"
                                    )}
                                >
                                    <div className="space-y-2.5">
                                        {displayColumns.slice(0, 4).map((column, colIndex) => (
                                            <div 
                                                key={`${keyExtractor(item)}-${String(column.key)}`}
                                                className={cn(
                                                    colIndex === 0 
                                                        ? "font-semibold text-[var(--foreground)] text-base" 
                                                        : "flex justify-between text-sm"
                                                )}
                                            >
                                                {colIndex === 0 ? (
                                                    column.render 
                                                        ? column.render(item) 
                                                        : String((item as Record<string, unknown>)[String(column.key)] ?? "")
                                                ) : (
                                                    <>
                                                        <span className="text-[var(--muted-text)]">{column.header}</span>
                                                        <span className="text-[var(--foreground)] font-medium">
                                                            {column.render 
                                                                ? column.render(item) 
                                                                : String((item as Record<string, unknown>)[String(column.key)] ?? "")}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                        {displayColumns.length > 4 && (
                                            <div className="flex items-center gap-1 text-xs text-[var(--muted-text)]">
                                                <MoreHorizontal size={14} />
                                                <span>+{displayColumns.length - 4} campos más</span>
                                            </div>
                                        )}
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
                    <thead>
                        <tr className="bg-[var(--hover-bg)]">
                            {displayColumns.map((column) => (
                                <th
                                    key={String(column.key)}
                                    className={cn(
                                        "px-4 py-3.5 text-left text-xs font-semibold text-[var(--muted-text)] uppercase tracking-wider border-b border-[var(--card-border)]",
                                        column.sortable && "cursor-pointer hover:bg-[var(--card-border)]/30 transition-colors select-none",
                                        column.className
                                    )}
                                    onClick={() => column.sortable && handleSort(String(column.key))}
                                >
                                    <div className="flex items-center gap-1.5">
                                        {column.header}
                                        {column.sortable && sortKey === String(column.key) && (
                                            <span className="text-nearby-accent">
                                                {sortDirection === "asc" 
                                                    ? <ChevronUp size={14} /> 
                                                    : <ChevronDown size={14} />
                                                }
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--card-border)]">
                        <AnimatePresence>
                            {paginatedData.length === 0 ? (
                                <tr>
                                    <td colSpan={displayColumns.length}>
                                        {emptyState || (
                                            <div className="py-16 text-center">
                                                <div className="text-[var(--muted-text)] text-sm">No hay datos disponibles</div>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                paginatedData.map((item, index) => (
                                    <motion.tr
                                        key={keyExtractor(item)}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ delay: index * 0.015 }}
                                        onClick={() => onRowClick?.(item)}
                                        className={cn(
                                            "group",
                                            onRowClick && "cursor-pointer hover:bg-[var(--hover-bg)] transition-colors"
                                        )}
                                    >
                                        {displayColumns.map((column) => (
                                            <td
                                                key={`${keyExtractor(item)}-${String(column.key)}`}
                                                className={cn(
                                                    "px-4 py-4 text-sm text-[var(--foreground)]",
                                                    column.className
                                                )}
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
            
            {/* Footer with count and pagination */}
            <div className="px-4 py-3 border-t border-[var(--card-border)] bg-[var(--hover-bg)] flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-[var(--muted-text)]">
                    {paginated ? (
                        <>
                            Mostrando <span className="font-semibold text-[var(--foreground)]">{Math.min((currentPage - 1) * itemsPerPage + 1, sortedData.length)}</span>
                            {" - "}
                            <span className="font-semibold text-[var(--foreground)]">{Math.min(currentPage * itemsPerPage, sortedData.length)}</span>
                            {" de "}
                            <span className="font-semibold text-[var(--foreground)]">{sortedData.length}</span>
                            {sortedData.length !== data.length && (
                                <> (filtrados de {data.length})</>
                            )}
                        </>
                    ) : (
                        <>
                            Mostrando <span className="font-semibold text-[var(--foreground)]">{sortedData.length}</span> de <span className="font-semibold text-[var(--foreground)]">{data.length}</span> registros
                        </>
                    )}
                </span>
                
                {/* Pagination Controls */}
                {paginated && totalPages > 1 && (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="h-8 w-8 p-0"
                            title="Primera página"
                        >
                            <ChevronLeft size={14} />
                            <ChevronLeft size={14} className="-ml-2" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="h-8 w-8 p-0"
                            title="Anterior"
                        >
                            <ChevronLeft size={16} />
                        </Button>
                        
                        <div className="flex items-center gap-1 px-2">
                            {/* Page numbers */}
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum: number;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                
                                return (
                                    <Button
                                        key={pageNum}
                                        variant={currentPage === pageNum ? "primary" : "ghost"}
                                        size="sm"
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={cn(
                                            "h-8 w-8 p-0 text-xs",
                                            currentPage === pageNum && "pointer-events-none"
                                        )}
                                    >
                                        {pageNum}
                                    </Button>
                                );
                            })}
                        </div>
                        
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="h-8 w-8 p-0"
                            title="Siguiente"
                        >
                            <ChevronRight size={16} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="h-8 w-8 p-0"
                            title="Última página"
                        >
                            <ChevronRight size={14} />
                            <ChevronRight size={14} className="-ml-2" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
