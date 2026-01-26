"use client";

import { forwardRef, ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
    primary: "bg-nearby-accent text-white hover:bg-nearby-accent-600 focus-visible:ring-nearby-accent shadow-sm hover:shadow-md",
    secondary: "bg-nearby-dark text-white hover:bg-nearby-dark-600 focus-visible:ring-nearby-dark shadow-sm hover:shadow-md",
    outline: "border-2 border-nearby-dark text-nearby-dark hover:bg-nearby-dark-50 focus-visible:ring-nearby-dark",
    ghost: "text-nearby-dark hover:bg-nearby-dark-50 focus-visible:ring-nearby-dark",
    danger: "bg-error-red text-white hover:bg-red-600 focus-visible:ring-error-red shadow-sm hover:shadow-md",
    success: "bg-success-green text-white hover:bg-green-600 focus-visible:ring-success-green shadow-sm hover:shadow-md",
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-6 py-3 text-base gap-2.5",
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
