import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, ...props }) {
  return (
    <div
      data-slot="card"
      className={cn("overflow-hidden rounded-lg border-[3px] border-border bg-card text-card-foreground comic-shadow", className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5 border-b-[3px] border-border bg-primary px-4 py-3 text-primary-foreground", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }) {
  return (
    <h3
      data-slot="card-title"
      className={cn("font-heading text-base font-bold", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-xs text-primary-foreground/90", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 py-3", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }) {
  return (
    <div
      data-slot="card-footer"
      className={cn("grid grid-cols-2 items-center gap-2 border-t-[3px] border-border bg-[#fff3bf] px-4 py-3 [&>[data-slot=button]]:w-full", className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
