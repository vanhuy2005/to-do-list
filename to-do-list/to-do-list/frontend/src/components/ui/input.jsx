import * as React from "react"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  ...props
}) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-lg border-[3px] border-border bg-background px-3 py-2 text-base transition-colors outline-none comic-shadow placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-secondary/60 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted/60 disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/30 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground md:text-sm",
        className
      )}
      {...props} />
  );
}

export { Input }
