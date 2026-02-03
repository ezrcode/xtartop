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
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-text)]">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              "flex h-11 w-full rounded-xl border-2 bg-[var(--input-bg)] px-4 py-2.5 text-base transition-all duration-200",
              "placeholder:text-[var(--muted-text)] text-[var(--foreground)]",
              "focus:outline-none focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--hover-bg)]",
              error
                ? "border-error-red focus:ring-error-red/20 focus:border-error-red"
                : "border-[var(--input-border)] hover:border-[var(--muted-text)]",
              iconPosition === "left" && "pl-11",
              iconPosition === "right" && "pr-11",
              className
            )}
            ref={ref}
            {...props}
          />
          {iconPosition === "right" && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-text)]">
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
          "flex h-11 w-full rounded-xl border-2 bg-[var(--input-bg)] px-4 py-2.5 text-base transition-all duration-200",
          "placeholder:text-[var(--muted-text)] text-[var(--foreground)]",
          "focus:outline-none focus:ring-2 focus:ring-nearby-accent/20 focus:border-nearby-accent",
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
