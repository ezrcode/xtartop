"use client";

import { forwardRef, InputHTMLAttributes, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ 
        label, 
        error, 
        helperText, 
        leftIcon, 
        rightIcon, 
        type = "text",
        className = "", 
        id,
        ...props 
    }, ref) => {
        const [showPassword, setShowPassword] = useState(false);
        const isPassword = type === "password";
        const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

        return (
            <div className="w-full">
                {label && (
                    <label 
                        htmlFor={inputId}
                        className="block text-sm font-medium text-dark-slate mb-1.5"
                    >
                        {label}
                        {props.required && <span className="text-error-red ml-1">*</span>}
                    </label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        type={isPassword && showPassword ? "text" : type}
                        className={`
                            w-full rounded-lg border bg-white
                            text-sm text-nearby-dark placeholder:text-gray-400
                            transition-all duration-200
                            focus:outline-none focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent
                            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
                            ${error 
                                ? "border-error-red focus:ring-error-red/20 focus:border-error-red" 
                                : "border-graphite-gray hover:border-nearby-dark-300"
                            }
                            ${leftIcon ? "pl-10" : "pl-3"}
                            ${rightIcon || isPassword ? "pr-10" : "pr-3"}
                            py-2.5
                            ${className}
                        `}
                        {...props}
                    />
                    {isPassword && (
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-nearby-dark transition-colors"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    )}
                    {!isPassword && rightIcon && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            {rightIcon}
                        </div>
                    )}
                </div>
                {error && (
                    <p className="mt-1.5 text-xs text-error-red">{error}</p>
                )}
                {!error && helperText && (
                    <p className="mt-1.5 text-xs text-gray-500">{helperText}</p>
                )}
            </div>
        );
    }
);

Input.displayName = "Input";
