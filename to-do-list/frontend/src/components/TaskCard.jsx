import { useState } from "react";
import { CalendarDaysIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

const MAX_VISIBLE_TAGS = 2;

export default function TaskCard({ task, onOpen }) {
  const [isTagExpanded, setIsTagExpanded] = useState(false);
  const now = new Date();
  const dueDate = task?.dueDate ? new Date(task.dueDate) : null;
  const tags = Array.isArray(task?.tags) ? task.tags.filter(Boolean) : [];
  const visibleTags = tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagCount = Math.max(0, tags.length - visibleTags.length);
  const displayTags = isTagExpanded ? tags : visibleTags;

  const isToday = dueDate
    ? now.toDateString() === dueDate.toDateString()
    : false;

  const isOverdue = dueDate
    ? !isToday && dueDate.getTime() < now.getTime()
    : false;

  const dueText = dueDate ? dueDate.toLocaleDateString("vi-VN") : "Chưa đặt";

  const statusValue = task?.status || "todo";
  const statusClassName = statusTone[statusValue] || statusTone.todo;
  const statusText = statusLabel[statusValue] || statusLabel.todo;
  const priorityValue = task?.priority || "medium";
  const priorityClassName = priorityTone[priorityValue] || priorityTone.medium;
  const priorityText = priorityLabel[priorityValue] || priorityLabel.medium;

  return (
    <article className="space-y-4 rounded-xl border-[3px] border-border bg-card px-4 py-3 comic-shadow">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 line-clamp-2 text-[1.6rem] leading-[1.2] font-black uppercase">
          {task?.title || "Nhiệm vụ chưa có tiêu đề"}
        </h3>

        <div
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border-[3px] border-border px-2.5 py-1 text-[0.68rem] font-black uppercase comic-shadow-sm",
            isToday && "bg-[#ffe4ec] text-primary",
            isOverdue && "bg-[#ff3b57] text-white",
            !isToday && !isOverdue && "bg-[#fff8d6] text-foreground",
            !dueDate && "bg-muted text-muted-foreground",
          )}
        >
          <CalendarDaysIcon className="size-3.5" />
          <span className="whitespace-nowrap">Hạn: {dueText}</span>
        </div>
      </div>

      <div className="h-0 border-t-[3px] border-dashed border-border/20" />

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              className={cn(
                "h-6 px-2.5 text-[0.68rem] uppercase",
                statusClassName,
              )}
            >
              {statusText}
            </Badge>

            <Badge
              className={cn(
                "h-6 px-2.5 text-[0.68rem] uppercase",
                priorityClassName,
              )}
            >
              Ưu tiên: {priorityText}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {tags.length > 0 ? (
              displayTags.map((tag, index) => (
                <Badge
                  key={`${tag}-${index}`}
                  className={cn(
                    "h-6 max-w-28 px-2 text-[0.64rem] uppercase",
                    index % 2 === 0
                      ? "bg-[#fff3bf] text-foreground"
                      : "bg-[#dbf5ff] text-foreground",
                  )}
                  title={tag}
                >
                  <span className="truncate">#{tag}</span>
                </Badge>
              ))
            ) : (
              <Badge
                className="h-6 px-2 text-[0.64rem] uppercase"
                variant="outline"
              >
                Không tag
              </Badge>
            )}

            {!isTagExpanded && hiddenTagCount > 0 && (
              <button
                type="button"
                onClick={() => setIsTagExpanded(true)}
                className="inline-flex h-6 items-center rounded-md border-[3px] border-border bg-card px-2 text-[0.64rem] font-black uppercase comic-shadow transition-colors hover:bg-black/5"
                aria-label={`Xem thêm ${hiddenTagCount} thẻ`}
              >
                {`...+${hiddenTagCount}`}
              </button>
            )}

            {isTagExpanded && tags.length > MAX_VISIBLE_TAGS && (
              <button
                type="button"
                onClick={() => setIsTagExpanded(false)}
                className="inline-flex h-6 items-center rounded-md border-[3px] border-border bg-[#111111] px-2 text-[0.64rem] font-black uppercase text-white comic-shadow transition-colors hover:bg-[#111111]"
                aria-label="Thu gọn thẻ"
              >
                Thu gọn
              </button>
            )}
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="default"
          className="min-w-30 bg-[#00c2ff] uppercase text-foreground hover:bg-[#00afe6]"
          onClick={() => onOpen?.(task)}
        >
          Chi tiết
        </Button>
      </div>
    </article>
  );
}
