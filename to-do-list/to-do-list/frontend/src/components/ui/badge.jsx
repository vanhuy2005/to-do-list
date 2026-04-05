import * as React from "react";
import { cva } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border-[3px] border-border px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap transition-all comic-shadow focus-visible:ring-[3px] focus-visible:ring-secondary/60 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/30 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-[#ffd400] text-foreground",
        secondary: "bg-secondary text-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "bg-background text-foreground",
        ghost: "border-dashed bg-muted text-muted-foreground shadow-none",
        link: "border-transparent bg-transparent p-0 text-primary shadow-none underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({ className, variant = "default", asChild = false, ...props }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge };
