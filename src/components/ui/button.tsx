"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-nearby-dark text-white shadow-md hover:bg-nearby-dark-600 hover:shadow-lg focus-visible:ring-nearby-dark",
        primary:
          "bg-gradient-to-r from-nearby-accent to-nearby-accent-600 text-white shadow-md hover:shadow-lg hover:from-nearby-accent-600 hover:to-nearby-accent-700 focus-visible:ring-nearby-accent",
        destructive:
          "bg-gradient-to-r from-error-red to-red-600 text-white shadow-md hover:shadow-lg hover:from-red-600 hover:to-red-700 focus-visible:ring-error-red",
        outline:
          "border-2 border-[var(--card-border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--hover-bg)] hover:border-nearby-accent focus-visible:ring-nearby-accent",
        secondary:
          "bg-[var(--hover-bg)] text-[var(--foreground)] border border-[var(--card-border)] hover:bg-[var(--card-border)] focus-visible:ring-nearby-dark",
        ghost:
          "text-[var(--foreground)] hover:bg-[var(--hover-bg)] focus-visible:ring-nearby-dark",
        link:
          "text-nearby-accent underline-offset-4 hover:underline focus-visible:ring-nearby-accent",
        success:
          "bg-gradient-to-r from-success-green to-emerald-600 text-white shadow-md hover:shadow-lg hover:from-emerald-600 hover:to-emerald-700 focus-visible:ring-success-green",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-lg px-3.5 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-11 w-11",
        "icon-sm": "h-9 w-9 rounded-lg",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
