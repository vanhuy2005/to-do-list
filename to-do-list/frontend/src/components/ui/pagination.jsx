/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Pagination({ className, ...props }) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("w-full", className)}
      {...props}
    />
  );
}

const PaginationContent = React.forwardRef(function PaginationContent(
  { className, ...props },
  ref,
) {
  return (
    <ul
      ref={ref}
      className={cn("flex flex-row flex-nowrap items-center gap-1", className)}
      {...props}
    />
  );
});

const PaginationItem = React.forwardRef(function PaginationItem(
  { className, ...props },
  ref,
) {
  return <li ref={ref} className={cn("shrink-0", className)} {...props} />;
});

const PaginationLink = React.forwardRef(function PaginationLink(
  { className, isActive, size = "xs", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        buttonVariants({ variant: "secondary", size }),
        "min-w-8 bg-card px-2.5 text-[0.72rem] font-black uppercase tracking-wide text-foreground hover:bg-black/5",
        isActive && "bg-[#00c2ff] text-foreground hover:bg-[#00afe6]",
        className,
      )}
      {...props}
    />
  );
});

const PaginationPrevious = React.forwardRef(function PaginationPrevious(
  { className, children = "Trước", ...props },
  ref,
) {
  return (
    <PaginationLink
      ref={ref}
      aria-label="Go to previous page"
      size="xs"
      className={cn("gap-1.5 px-1.5 sm:pl-1.5 sm:pr-2.5", className)}
      {...props}
    >
      <ChevronLeftIcon className="size-3.5" />
      <span className="hidden sm:inline">{children}</span>
    </PaginationLink>
  );
});

const PaginationNext = React.forwardRef(function PaginationNext(
  { className, children = "Sau", ...props },
  ref,
) {
  return (
    <PaginationLink
      ref={ref}
      aria-label="Go to next page"
      size="xs"
      className={cn("gap-1.5 px-1.5 sm:pl-2.5 sm:pr-1.5", className)}
      {...props}
    >
      <span className="hidden sm:inline">{children}</span>
      <ChevronRightIcon className="size-3.5" />
    </PaginationLink>
  );
});

function PaginationEllipsis({ className, ...props }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md border-[3px] border-border bg-card text-muted-foreground comic-shadow",
        className,
      )}
      {...props}
    >
      <MoreHorizontalIcon className="size-3.5" />
      <span className="sr-only">More pages</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
