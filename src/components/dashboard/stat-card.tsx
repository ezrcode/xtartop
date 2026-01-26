"use client";

import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";

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
        trend: "text-nearby-accent",
    },
    success: {
        bg: "bg-green-50",
        icon: "text-success-green",
        trend: "text-success-green",
    },
    warning: {
        bg: "bg-amber-50",
        icon: "text-warning-amber",
        trend: "text-warning-amber",
    },
    info: {
        bg: "bg-blue-50",
        icon: "text-ocean-blue",
        trend: "text-ocean-blue",
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
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl border border-graphite-gray p-5 hover:shadow-lg transition-shadow"
        >
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {title}
                </span>
                <div className={`w-10 h-10 rounded-lg ${styles.bg} flex items-center justify-center`}>
                    <Icon size={20} className={styles.icon} />
                </div>
            </div>
            
            <div className="flex items-baseline gap-2">
                <motion.span 
                    className="text-2xl font-bold text-nearby-dark"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    {typeof value === "number" ? value.toLocaleString() : value}
                </motion.span>
                
                {trend && (
                    <span className={`flex items-center text-xs font-medium ${
                        trend.isPositive ? "text-success-green" : "text-error-red"
                    }`}>
                        {trend.isPositive ? (
                            <TrendingUp size={14} className="mr-0.5" />
                        ) : (
                            <TrendingDown size={14} className="mr-0.5" />
                        )}
                        {trend.value}%
                    </span>
                )}
            </div>
            
            {description && (
                <p className="text-xs text-gray-500 mt-2">{description}</p>
            )}
        </motion.div>
    );
}
