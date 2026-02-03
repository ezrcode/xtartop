"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

// Responsive TabsList that scrolls horizontally on mobile
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    variant?: "default" | "underline" | "pills"
  }
>(({ className, variant = "default", ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      // Base styles
      "flex items-center gap-1",
      // Responsive scroll behavior
      "overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0",
      // Hide scrollbar
      "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
      // Variant styles
      {
        // Default: pill-shaped background
        "h-12 rounded-xl bg-[var(--hover-bg)] p-1.5": variant === "default",
        // Underline: border at bottom
        "border-b border-[var(--card-border)] pb-0": variant === "underline",
        // Pills: no background, pills on active
        "gap-2": variant === "pills",
      },
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    variant?: "default" | "underline" | "pills"
  }
>(({ className, variant = "default", ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // Base styles
      "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nearby-accent focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      // Touch-friendly sizing
      "min-h-[44px] px-4 py-2",
      // Icon sizing
      "[&_svg]:size-4 [&_svg]:shrink-0",
      // Variant styles
      {
        // Default: active has white background
        "rounded-lg text-[var(--muted-text)] data-[state=active]:bg-[var(--card-bg)] data-[state=active]:text-[var(--foreground)] data-[state=active]:shadow-md": variant === "default",
        // Underline: active has bottom border
        "rounded-none border-b-2 border-transparent text-[var(--muted-text)] hover:text-[var(--foreground)] data-[state=active]:border-nearby-accent data-[state=active]:text-nearby-accent -mb-[1px]": variant === "underline",
        // Pills: active has accent background
        "rounded-full bg-transparent text-[var(--muted-text)] hover:bg-[var(--hover-bg)] data-[state=active]:bg-nearby-accent data-[state=active]:text-white": variant === "pills",
      },
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nearby-accent focus-visible:ring-offset-2",
      // Animate in
      "data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
