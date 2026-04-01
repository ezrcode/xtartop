"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  icon?: React.ReactNode
  iconPosition?: "left" | "right"
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, iconPosition = "left", ...props }, ref) => {
    if (icon) {
      return (
        <div className="relative">
          {iconPosition === "left" && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-text)]">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              "flex h-10 w-full rounded-md border bg-[var(--input-bg)] px-3 py-2 text-sm transition-colors duration-150",
              "placeholder:text-[var(--muted-text)] text-[var(--foreground)]",
              "focus:outline-none focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--hover-bg)]",
              error
                ? "border-error-red focus:ring-error-red/20 focus:border-error-red"
                : "border-[var(--input-border)] hover:border-[var(--muted-text)]",
              iconPosition === "left" && "pl-10",
              iconPosition === "right" && "pr-10",
              className
            )}
            ref={ref}
            {...props}
          />
          {iconPosition === "right" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-text)]">
              {icon}
            </div>
          )}
        </div>
      )
    }

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border bg-[var(--input-bg)] px-3 py-2 text-sm transition-colors duration-150",
          "placeholder:text-[var(--muted-text)] text-[var(--foreground)]",
          "focus:outline-none focus:ring-2 focus:ring-nearby-dark/15 focus:border-nearby-dark/50",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--hover-bg)]",
          error
            ? "border-error-red focus:ring-error-red/20 focus:border-error-red"
            : "border-[var(--input-border)] hover:border-[var(--muted-text)]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
