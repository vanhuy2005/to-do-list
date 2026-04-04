import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      data-slot="skeleton"
      className={cn("relative overflow-hidden rounded-md border-[3px] border-border bg-[#fff3bf] comic-shadow before:absolute before:inset-0 before:-translate-x-full before:bg-linear-to-r before:from-transparent before:via-white/70 before:to-transparent before:animate-comic-shimmer", className)}
      {...props} />
  );
}

export { Skeleton }
