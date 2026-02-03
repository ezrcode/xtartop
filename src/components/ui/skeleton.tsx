"use client"

import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-[var(--hover-bg)]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
