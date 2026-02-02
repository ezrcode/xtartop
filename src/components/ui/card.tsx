"use client";

import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "interactive" | "glass" | "elevated";
    padding?: "none" | "sm" | "md" | "lg";
}

const variantStyles = {
    default: "bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm",
    interactive: "bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm card-interactive cursor-pointer hover:border-[var(--muted-text)]",
    glass: "glass dark:glass-dark",
    elevated: "bg-[var(--surface-2)] border border-[var(--card-border)] shadow-md",
};

const paddingStyles = {
    none: "",
    sm: "p-4",
    md: "p-4 sm:p-6",
    lg: "p-6 sm:p-8",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ variant = "default", padding = "md", className = "", children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={`rounded-xl transition-colors ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = "Card";

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
    ({ className = "", children, ...props }, ref) => {
        return (
            <div ref={ref} className={`mb-4 ${className}`} {...props}>
                {children}
            </div>
        );
    }
);

CardHeader.displayName = "CardHeader";

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
    as?: "h1" | "h2" | "h3" | "h4";
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
    ({ as: Component = "h3", className = "", children, ...props }, ref) => {
        return (
            <Component
                ref={ref}
                className={`text-lg font-semibold text-[var(--foreground)] ${className}`}
                {...props}
            >
                {children}
            </Component>
        );
    }
);

CardTitle.displayName = "CardTitle";

interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
    ({ className = "", children, ...props }, ref) => {
        return (
            <p ref={ref} className={`text-sm text-[var(--muted-text)] mt-1 ${className}`} {...props}>
                {children}
            </p>
        );
    }
);

CardDescription.displayName = "CardDescription";

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
    ({ className = "", children, ...props }, ref) => {
        return (
            <div ref={ref} className={className} {...props}>
                {children}
            </div>
        );
    }
);

CardContent.displayName = "CardContent";

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
    ({ className = "", children, ...props }, ref) => {
        return (
            <div ref={ref} className={`mt-4 pt-4 border-t border-[var(--card-border)] ${className}`} {...props}>
                {children}
            </div>
        );
    }
);

CardFooter.displayName = "CardFooter";
