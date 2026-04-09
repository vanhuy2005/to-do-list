import { cn } from "@/lib/utils";

export const taskModalSurfaceClass = "bg-[#fffaf0]";
export const taskModalFooterClass =
  "border-t-[3px] border-border bg-[#fffaf0] p-4";
export const taskOptionGridClass = "grid grid-cols-3 gap-2";

export const taskOptionButtonBaseClass =
  "h-10 rounded-[0.95rem] border-[3px] border-b-[5px] border-border px-2 text-xs font-black whitespace-nowrap uppercase tracking-tight transition-all active:translate-y-[2px] active:border-b-[3px]";

export function taskOptionButtonClass(isActive) {
  return cn(
    taskOptionButtonBaseClass,
    isActive
      ? "bg-[#ff3b57] text-white"
      : "bg-white text-foreground hover:bg-black/5",
  );
}
