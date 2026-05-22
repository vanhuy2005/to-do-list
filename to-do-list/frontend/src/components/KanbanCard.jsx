import { memo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { GripVerticalIcon, CalendarDaysIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const PRIORITY_BORDER = {
  high: "border-l-[#ff3b57]",
  medium: "border-l-[#ffd400]",
  low: "border-l-[#84e11f]",
};

const normalizeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const formatShortDate = (value) =>
  value.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

const formatClock = (value) =>
  value.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

const toRelativeDueLabel = (dueDate) => {
  const due = normalizeDate(dueDate);
  if (!due) return "CHƯA HẠN";

  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);
  const hourMs = 60 * 60 * 1000;
  const dayMs = 24 * hourMs;

  if (diffMs < 0) {
    if (absMs < dayMs) {
      const hours = Math.max(1, Math.ceil(absMs / hourMs));
      return `TRỄ ${hours}H`;
    }
    const days = Math.max(1, Math.ceil(absMs / dayMs));
    return `TRỄ ${days}D`;
  }

  const nowDay = startOfDay(now);
  const dueDay = startOfDay(due);
  const dayDiff = Math.round((dueDay.getTime() - nowDay.getTime()) / dayMs);

  if (dayDiff === 0) {
    const hours = Math.max(1, Math.ceil(diffMs / hourMs));
    return `CÒN ${hours}H`;
  }
  if (dayDiff === 1) return "MAI";
  if (dayDiff <= 7) return `${dayDiff}D`;
  return formatShortDate(due).toUpperCase();
};

const toDoneLabel = (task) => {
  const doneAt = normalizeDate(task?.completedAt || task?.updatedAt);
  if (!doneAt) return "XONG";

  const today = startOfDay(new Date());
  const doneDay = startOfDay(doneAt);
  const dayMs = 24 * 60 * 60 * 1000;
  const dayDiff = Math.round((today.getTime() - doneDay.getTime()) / dayMs);

  if (dayDiff === 0) return formatClock(doneAt).toUpperCase();
  if (dayDiff === 1) return "QUA";
  return formatShortDate(doneAt).toUpperCase();
};

const getDeadlineLabel = (task) => {
  if (task?.status === "done") return toDoneLabel(task);
  return toRelativeDueLabel(task?.dueDate);
};

const isOverdueLabel = (label) => label.startsWith("TRỄ");

function KanbanCardInner({ task, canEdit, onOpenTask, onOpenComments }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task._id, disabled: !canEdit });

  const priorityValue = task?.priority || "medium";
  const borderClass = PRIORITY_BORDER[priorityValue] || PRIORITY_BORDER.medium;
  const deadlineLabel = getDeadlineLabel(task);
  const isOverdue = isOverdueLabel(deadlineLabel);

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const handleClick = () => {
    if (!isDragging) {
      onOpenTask?.(task);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group flex items-center gap-1.5 rounded-lg border-[3px] border-border bg-card px-1.5 py-1 transition-all duration-150",
        "border-l-[4px]",
        borderClass,
        !canEdit && "pl-2.5",
        isDragging
          ? "z-50 scale-[1.02] opacity-50 shadow-lg"
          : "comic-shadow hover:-translate-y-0.5 active:translate-y-0",
      )}
    >
      {task?.commentCount > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenComments?.(task);
          }}
          className="absolute -top-2 -right-2 size-5 rounded-full border-2 border-border bg-[#ffd400] hover:bg-[#ffd400]/90 text-foreground font-black text-[9px] flex items-center justify-center comic-shadow-sm hover:scale-110 active:scale-95 transition-transform z-10 animate-in fade-in zoom-in duration-200"
          title="Bình luận"
        >
          !
        </button>
      )}
      {/* Drag handle */}
      {canEdit && (
        <button
          type="button"
          className="flex-shrink-0 cursor-grab rounded p-0.5 text-muted-foreground/40 transition-colors hover:text-foreground active:cursor-grabbing"
          style={{ touchAction: "none" }}
          aria-label="Kéo để thay đổi trạng thái"
          {...listeners}
          {...attributes}
        >
          <GripVerticalIcon className="size-3" />
        </button>
      )}

      {/* Content — single line, clickable */}
      <button
        type="button"
        onClick={handleClick}
        className="flex min-w-0 flex-1 items-center gap-1.5"
      >
        <span className="min-w-0 flex-1 truncate text-left text-[0.72rem] leading-none font-black uppercase tracking-tight">
          {task?.title || "Nhiệm vụ"}
        </span>

        <span
          className={cn(
            "inline-flex flex-shrink-0 items-center gap-0.5 text-[0.6rem] font-bold uppercase whitespace-nowrap",
            isOverdue
              ? "text-[#ff3b57]"
              : task?.status === "done"
                ? "text-[#3f7a00]"
                : "text-muted-foreground",
          )}
        >
          <CalendarDaysIcon className="size-2 flex-shrink-0" />
          {deadlineLabel}
        </span>
      </button>
    </div>
  );
}

const KanbanCard = memo(KanbanCardInner, (prev, next) => {
  const pt = prev.task;
  const nt = next.task;
  return (
    prev.canEdit === next.canEdit &&
    pt._id === nt._id &&
    pt.status === nt.status &&
    pt.title === nt.title &&
    pt.dueDate === nt.dueDate &&
    pt.priority === nt.priority &&
    pt.completedAt === nt.completedAt &&
    pt.commentCount === nt.commentCount
  );
});

KanbanCard.displayName = "KanbanCard";

export default KanbanCard;
