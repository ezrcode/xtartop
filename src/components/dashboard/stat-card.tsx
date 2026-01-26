"use client";

import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    description?: string;
    color?: "accent" | "success" | "warning" | "info";
}

const colorStyles = {
    accent: {
        bg: "bg-nearby-accent-50",
        icon: "text-nearby-accent",
    },
    success: {
        bg: "bg-green-50",
        icon: "text-success-green",
    },
    warning: {
        bg: "bg-amber-50",
        icon: "text-warning-amber",
    },
    info: {
        bg: "bg-blue-50",
        icon: "text-ocean-blue",
    },
};

export function StatCard({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    description,
    color = "accent" 
}: StatCardProps) {
    const styles = colorStyles[color];

    return (
        <div className="bg-white rounded-xl border border-graphite-gray p-3 sm:p-5 hover:shadow-lg transition-all duration-300 active:scale-[0.98]">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {title}
                </span>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${styles.bg} flex items-center justify-center`}>
                    <Icon size={18} className={styles.icon} />
                </div>
            </div>
            
            <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-xl sm:text-2xl font-bold text-nearby-dark">
                    {typeof value === "number" ? value.toLocaleString() : value}
                </span>
                
                {trend && (
                    <span className={`flex items-center text-[10px] sm:text-xs font-medium ${
                        trend.isPositive ? "text-success-green" : "text-error-red"
                    }`}>
                        {trend.isPositive ? (
                            <TrendingUp size={12} className="mr-0.5" />
                        ) : (
                            <TrendingDown size={12} className="mr-0.5" />
                        )}
                        {trend.value}%
                    </span>
                )}
            </div>
            
            {description && (
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1.5 sm:mt-2">{description}</p>
            )}
        </div>
    );
}
