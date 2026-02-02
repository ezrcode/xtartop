"use client";

import { forwardRef, ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "info";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary: "bg-nearby-accent text-white hover:bg-nearby-accent-600 focus-visible:ring-nearby-accent shadow-sm hover:shadow-md dark:bg-[var(--accent-on-dark)] dark:hover:bg-nearby-accent",
    secondary: "bg-nearby-dark text-white hover:bg-nearby-dark-600 focus-visible:ring-nearby-dark shadow-sm hover:shadow-md",
    outline: "border-2 border-[var(--card-border)] text-[var(--foreground)] hover:bg-[var(--hover-bg)] focus-visible:ring-nearby-accent",
    ghost: "text-[var(--foreground)] hover:bg-[var(--hover-bg)] focus-visible:ring-nearby-accent",
    danger: "bg-error-red text-white hover:bg-red-600 focus-visible:ring-error-red shadow-sm hover:shadow-md",
    success: "bg-success-green text-white hover:bg-green-600 focus-visible:ring-success-green shadow-sm hover:shadow-md",
    info: "bg-info-blue text-white hover:bg-blue-600 focus-visible:ring-info-blue shadow-sm hover:shadow-md",
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: "px-3 py-2 text-xs gap-1.5 min-h-[36px]",
    md: "px-4 py-2.5 text-sm gap-2 min-h-[44px]",
    lg: "px-6 py-3 text-base gap-2.5 min-h-[52px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ 
        variant = "primary", 
        size = "md", 
        isLoading = false, 
        leftIcon, 
        rightIcon, 
        children, 
        className = "", 
        disabled,
        ...props 
    }, ref) => {
        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={`
                    inline-flex items-center justify-center font-medium rounded-lg
                    transition-all duration-200 ease-out
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                    active:scale-[0.98]
                    ${variantStyles[variant]}
                    ${sizeStyles[size]}
                    ${className}
                `}
                {...props}
            >
                {isLoading ? (
                    <Loader2 className="animate-spin" size={size === "sm" ? 14 : size === "lg" ? 20 : 16} />
                ) : leftIcon}
                {children}
                {!isLoading && rightIcon}
            </button>
        );
    }
);

Button.displayName = "Button";
