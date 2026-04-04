import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({
  className,
  ...props
}) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-md border-[3px] border-border bg-background px-3 py-2 text-base transition-colors outline-none comic-shadow placeholder:text-slate-400 focus-visible:ring-3 focus-visible:ring-secondary/60 disabled:cursor-not-allowed disabled:bg-muted/60 disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/30 md:text-sm",
        className
      )}
      {...props} />
  );
}

export { Textarea }
