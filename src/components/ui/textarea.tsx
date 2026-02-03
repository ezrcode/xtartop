"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[100px] w-full rounded-xl border-2 bg-[var(--input-bg)] px-4 py-3 text-base transition-all duration-200 resize-none",
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
Textarea.displayName = "Textarea"

export { Textarea }
