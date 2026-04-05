import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function TaskModalTopBar({ title, onClose, className }) {
  return (
    <header
      className={cn(
        "-mx-4 -mt-4 flex items-center justify-between border-b-[3px] border-border bg-[#ffd400] px-4 py-3",
        className,
      )}
    >
      <h1 className="text-lg font-black uppercase text-foreground">{title}</h1>

      <Button
        type="button"
        size="icon-lg"
        variant="primary"
        className="shrink-0 rounded-xl"
        onClick={onClose}
        aria-label="Đóng"
      >
        <XIcon className="size-5" />
      </Button>
    </header>
  );
}
