/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { cva } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border-[3px] border-border bg-clip-padding text-sm font-bold whitespace-nowrap transition-all outline-none select-none comic-shadow comic-shadow-hover comic-shadow-press active:not-aria-[haspopup]:translate-x-px active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-3 focus-visible:ring-secondary/60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        secondary:
          "bg-secondary text-foreground hover:bg-secondary/85 aria-expanded:bg-secondary/85",
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-md px-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-md px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-md in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-md in-data-[slot=button-group]:rounded-md",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "primary",
  size = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button"
  const normalizedVariant = variant === "secondary" ? "secondary" : "primary"

  return (
    <Comp
      data-slot="button"
      data-variant={normalizedVariant}
      data-size={size}
      className={cn(buttonVariants({ variant: normalizedVariant, size, className }))}
      {...props} />
  );
}

export { Button, buttonVariants }
