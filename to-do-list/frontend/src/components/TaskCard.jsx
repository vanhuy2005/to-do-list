import { CalendarDaysIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const detailTone = {
  low: "bg-card text-foreground",
  medium: "bg-[#ffd400] text-foreground",
  high: "bg-secondary text-foreground",
};

const statusTone = {
  todo: "bg-[#ffe4ec] text-foreground",
  doing: "bg-secondary text-foreground",
  done: "bg-[#d9f99d] text-foreground",
};

const priorityTone = {
  low: "bg-card text-foreground",
  medium: "bg-[#ffd400] text-foreground",
  high: "bg-primary text-primary-foreground",
};

const statusLabel = {
  todo: "Cần làm",
  doing: "Đang làm",
  done: "Hoàn thành",
};

const priorityLabel = {
  low: "Thấp",
  medium: "Vừa",
  high: "Cao",
};

export default function TaskCard({ task, onOpen }) {
  const now = new Date();
  const dueDate = task?.dueDate ? new Date(task.dueDate) : null;

  const isToday = dueDate
    ? now.toDateString() === dueDate.toDateString()
    : false;

  const dueText = dueDate
    ? isToday
      ? "HẠN CHÓT: HÔM NAY!"
      : `HẠN CHÓT: ${dueDate.toLocaleDateString("vi-VN")}`
    : "HẠN CHÓT: CHƯA ĐẶT";

  const detailClassName =
    detailTone[task?.priority || "medium"] || detailTone.medium;
  const statusValue = task?.status || "todo";
  const statusClassName = statusTone[statusValue] || statusTone.todo;
  const statusText = statusLabel[statusValue] || statusLabel.todo;
  const priorityValue = task?.priority || "medium";
  const priorityClassName = priorityTone[priorityValue] || priorityTone.medium;
  const priorityText = priorityLabel[priorityValue] || priorityLabel.medium;

  return (
    <article className="space-y-4 rounded-xl border-[3px] border-border bg-card px-4 py-3 comic-shadow">
      <div className="flex flex-wrap items-start gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn("h-7 px-3 text-xs uppercase", statusClassName)}>
            {statusText}
          </Badge>

          <Badge
            className={cn("h-7 px-3 text-xs uppercase", priorityClassName)}
          >
            Ưu tiên: {priorityText}
          </Badge>
        </div>
      </div>

      <h3 className="line-clamp-2 text-[1.65rem] leading-[1.3] font-black uppercase">
        {task?.title || "Nhiệm vụ chưa có tiêu đề"}
      </h3>

      <div className="h-0 border-t-[3px] border-dashed border-border/20" />

      <div className="flex items-end justify-between gap-3">
        <p
          className={cn(
            "text-xs font-black uppercase",
            isToday ? "text-primary" : "text-muted-foreground",
          )}
        >
          {dueText}
        </p>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon-xs"
            variant="secondary"
            aria-label="Hạn chót"
          >
            <CalendarDaysIcon className="size-3.5" />
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="default"
            className={cn("min-w-30 uppercase", detailClassName)}
            onClick={() => onOpen?.(task)}
          >
            Chi tiết
          </Button>
        </div>
      </div>
    </article>
  );
}
