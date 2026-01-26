"use client";

import { HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
    variant?: "text" | "circular" | "rectangular" | "rounded";
    width?: string | number;
    height?: string | number;
}

export function Skeleton({ 
    variant = "text", 
    width, 
    height, 
    className = "",
    style,
    ...props 
}: SkeletonProps) {
    const variantStyles = {
        text: "h-4 rounded",
        circular: "rounded-full",
        rectangular: "rounded-none",
        rounded: "rounded-lg",
    };

    return (
        <div
            className={`skeleton ${variantStyles[variant]} ${className}`}
            style={{
                width: width,
                height: height || (variant === "text" ? undefined : width),
                ...style,
            }}
            {...props}
        />
    );
}

// Pre-built skeleton components for common use cases
export function SkeletonCard() {
    return (
        <div className="bg-white rounded-xl border border-graphite-gray p-6 space-y-4">
            <div className="flex items-center gap-3">
                <Skeleton variant="circular" width={40} height={40} />
                <div className="flex-1 space-y-2">
                    <Skeleton width="60%" />
                    <Skeleton width="40%" className="h-3" />
                </div>
            </div>
            <Skeleton width="100%" height={100} variant="rounded" />
            <div className="space-y-2">
                <Skeleton width="100%" />
                <Skeleton width="80%" />
                <Skeleton width="60%" />
            </div>
        </div>
    );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
    return (
        <div className="bg-white rounded-xl border border-graphite-gray overflow-hidden">
            <div className="p-4 border-b border-graphite-gray">
                <div className="flex gap-4">
                    <Skeleton width="20%" />
                    <Skeleton width="25%" />
                    <Skeleton width="20%" />
                    <Skeleton width="15%" />
                    <Skeleton width="20%" />
                </div>
            </div>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="p-4 border-b border-graphite-gray last:border-0">
                    <div className="flex gap-4 items-center">
                        <Skeleton width="20%" />
                        <Skeleton width="25%" />
                        <Skeleton width="20%" />
                        <Skeleton width="15%" />
                        <Skeleton width="20%" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function SkeletonList({ items = 3 }: { items?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: items }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-graphite-gray">
                    <Skeleton variant="circular" width={32} height={32} />
                    <div className="flex-1 space-y-1.5">
                        <Skeleton width="70%" />
                        <Skeleton width="50%" className="h-3" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function SkeletonStats() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-graphite-gray p-5">
                    <div className="flex items-center justify-between mb-3">
                        <Skeleton width={80} className="h-3" />
                        <Skeleton variant="rounded" width={36} height={36} />
                    </div>
                    <Skeleton width={100} height={32} className="mb-2" />
                    <Skeleton width={60} className="h-3" />
                </div>
            ))}
        </div>
    );
}
