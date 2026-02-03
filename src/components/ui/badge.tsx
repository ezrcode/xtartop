"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-nearby-dark text-white",
        primary:
          "bg-nearby-accent text-white",
        secondary:
          "bg-[var(--hover-bg)] text-[var(--foreground)] border border-[var(--card-border)]",
        success:
          "bg-success-green/10 text-success-green border border-success-green/20",
        warning:
          "bg-warning-amber/10 text-warning-amber border border-warning-amber/20",
        error:
          "bg-error-red/10 text-error-red border border-error-red/20",
        info:
          "bg-info-blue/10 text-info-blue border border-info-blue/20",
        outline:
          "border-2 border-[var(--card-border)] text-[var(--foreground)] bg-transparent",
      },
      size: {
        default: "px-3 py-1 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-4 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
