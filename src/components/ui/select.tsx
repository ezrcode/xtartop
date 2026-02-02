"use client";

import { useState, useRef, useEffect, useMemo, ReactNode } from "react";
import { ChevronDown, Search, X, Check } from "lucide-react";

export interface SelectOption {
    value: string;
    label: string;
    description?: string;
    icon?: ReactNode;
    disabled?: boolean;
}

interface SelectProps {
    options: SelectOption[];
    value: string | null;
    onChange: (value: string | null) => void;
    placeholder?: string;
    label?: string;
    error?: string;
    helperText?: string;
    searchable?: boolean;
    searchPlaceholder?: string;
    clearable?: boolean;
    disabled?: boolean;
    emptyMessage?: string;
    className?: string;
}

export function Select({
    options,
    value,
    onChange,
    placeholder = "Seleccionar...",
    label,
    error,
    helperText,
    searchable = false,
    searchPlaceholder = "Buscar...",
    clearable = false,
    disabled = false,
    emptyMessage = "No se encontraron opciones",
    className = "",
}: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Filter options based on search
    const filteredOptions = useMemo(() => {
        if (!searchTerm.trim()) return options;
        const term = searchTerm.toLowerCase();
        return options.filter(
            (opt) =>
                opt.label.toLowerCase().includes(term) ||
                opt.description?.toLowerCase().includes(term)
        );
    }, [options, searchTerm]);

    // Get selected option
    const selectedOption = useMemo(() => {
        return options.find((opt) => opt.value === value) || null;
    }, [options, value]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm("");
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Focus search input when opening
    useEffect(() => {
        if (isOpen && searchable && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen, searchable]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchTerm("");
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(null);
    };

    const handleToggle = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
                setSearchTerm("");
            }
        }
    };

    return (
        <div className={`w-full ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    {label}
                </label>
            )}

            <div className="relative">
                {/* Trigger Button */}
                <button
                    type="button"
                    onClick={handleToggle}
                    disabled={disabled}
                    className={`
                        flex items-center justify-between w-full
                        px-3 py-3 sm:py-2.5 min-h-[44px]
                        text-base sm:text-sm text-left
                        bg-[var(--input-bg)] border rounded-lg
                        transition-all duration-200
                        focus:outline-none focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${error
                            ? "border-error-red"
                            : "border-[var(--input-border)] hover:border-[var(--muted-text)]"
                        }
                        ${isOpen ? "ring-2 ring-nearby-accent/20 border-nearby-accent" : ""}
                    `}
                >
                    <span className={selectedOption ? "text-[var(--foreground)]" : "text-[var(--muted-text)]"}>
                        {selectedOption ? (
                            <span className="flex items-center gap-2">
                                {selectedOption.icon}
                                {selectedOption.label}
                            </span>
                        ) : (
                            placeholder
                        )}
                    </span>

                    <div className="flex items-center gap-1">
                        {clearable && selectedOption && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="p-1 text-[var(--muted-text)] hover:text-[var(--foreground)] rounded"
                            >
                                <X size={14} />
                            </button>
                        )}
                        <ChevronDown
                            size={18}
                            className={`text-[var(--muted-text)] transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                    </div>
                </button>

                {/* Dropdown */}
                {isOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-lg overflow-hidden">
                        {/* Search Input */}
                        {searchable && (
                            <div className="p-2 border-b border-[var(--card-border)]">
                                <div className="relative">
                                    <Search
                                        size={14}
                                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-text)]"
                                    />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder={searchPlaceholder}
                                        className="w-full pl-8 pr-8 py-2 text-sm bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent text-[var(--foreground)] placeholder:text-[var(--muted-text)]"
                                    />
                                    {searchTerm && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchTerm("")}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-text)] hover:text-[var(--foreground)]"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Options List */}
                        <div className="max-h-60 overflow-y-auto">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => !option.disabled && handleSelect(option.value)}
                                        disabled={option.disabled}
                                        className={`
                                            w-full px-3 py-2.5 text-left text-sm min-h-[44px]
                                            flex items-center justify-between
                                            transition-colors
                                            ${option.disabled
                                                ? "opacity-50 cursor-not-allowed"
                                                : "hover:bg-[var(--hover-bg)]"
                                            }
                                            ${value === option.value
                                                ? "bg-nearby-accent/10 text-[var(--accent-on-dark)]"
                                                : "text-[var(--foreground)]"
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            {option.icon}
                                            <div className="flex-1 min-w-0">
                                                <div className="truncate">{option.label}</div>
                                                {option.description && (
                                                    <div className="text-xs text-[var(--muted-text)] truncate">
                                                        {option.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {value === option.value && (
                                            <Check size={16} className="text-[var(--accent-on-dark)] flex-shrink-0" />
                                        )}
                                    </button>
                                ))
                            ) : (
                                <div className="px-3 py-4 text-sm text-[var(--muted-text)] text-center">
                                    {emptyMessage}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {error && <p className="mt-1.5 text-xs text-error-red">{error}</p>}
            {!error && helperText && (
                <p className="mt-1.5 text-xs text-[var(--muted-text)]">{helperText}</p>
            )}
        </div>
    );
}

// Native select for simpler use cases
interface NativeSelectProps {
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
    label?: string;
    error?: string;
    helperText?: string;
    disabled?: boolean;
    className?: string;
    placeholder?: string;
}

export function NativeSelect({
    options,
    value,
    onChange,
    label,
    error,
    helperText,
    disabled = false,
    className = "",
    placeholder,
}: NativeSelectProps) {
    return (
        <div className={`w-full ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    {label}
                </label>
            )}

            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className={`
                    w-full px-3 py-3 sm:py-2.5 min-h-[44px]
                    text-base sm:text-sm
                    bg-[var(--input-bg)] text-[var(--foreground)]
                    border rounded-lg appearance-none
                    transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${error
                        ? "border-error-red"
                        : "border-[var(--input-border)] hover:border-[var(--muted-text)]"
                    }
                `}
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: "right 0.5rem center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "1.5em 1.5em",
                    paddingRight: "2.5rem",
                }}
            >
                {placeholder && (
                    <option value="" disabled>
                        {placeholder}
                    </option>
                )}
                {options.map((option) => (
                    <option key={option.value} value={option.value} disabled={option.disabled}>
                        {option.label}
                    </option>
                ))}
            </select>

            {error && <p className="mt-1.5 text-xs text-error-red">{error}</p>}
            {!error && helperText && (
                <p className="mt-1.5 text-xs text-[var(--muted-text)]">{helperText}</p>
            )}
        </div>
    );
}
