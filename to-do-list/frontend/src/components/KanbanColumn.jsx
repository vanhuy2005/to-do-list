import { useDroppable } from "@dnd-kit/core";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import KanbanCard from "@/components/KanbanCard";
import { cn } from "@/lib/utils";

const STATUS_META = {
  todo: {
    title: "CẦN LÀM",
    barClass: "bg-[#ff3b57] text-white",
    badgeClass: "bg-[#fffdf7] text-[#ff3b57]",
    empty: "Chưa có việc cần làm",
    dropHighlight: "border-[#ff3b57]/30 bg-[#ff3b57]/5",
  },
  doing: {
    title: "ĐANG LÀM",
    barClass: "bg-[#00c2ff] text-foreground",
    badgeClass: "bg-[#fffdf7] text-[#007ab3]",
    empty: "Chưa có việc đang làm",
    dropHighlight: "border-[#00c2ff]/30 bg-[#00c2ff]/5",
  },
  done: {
    title: "HOÀN THÀNH",
    barClass: "bg-[#84e11f] text-foreground",
    badgeClass: "bg-[#fffdf7] text-[#3f7a00]",
    empty: "Chưa có việc hoàn thành",
    dropHighlight: "border-[#84e11f]/30 bg-[#84e11f]/5",
  },
};

/**
 * Số card hiển thị mặc định ở mobile trước khi collapse
 * Desktop hiển thị tất cả trong scrollable area
 */
const MOBILE_COLLAPSED_COUNT = 4;

export default function KanbanColumn({
  status,
  tasks,
  isExpanded,
  canEdit,
  onToggleExpand,
  onOpenTask,
  onOpenComments,
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const meta = STATUS_META[status];
  const needsCollapse = tasks.length > MOBILE_COLLAPSED_COUNT;
  const visibleTasks = isExpanded ? tasks : tasks.slice(0, MOBILE_COLLAPSED_COUNT);
  const hiddenCount = Math.max(0, tasks.length - MOBILE_COLLAPSED_COUNT);

  return (
    <section className="min-w-0 md:flex-1">
      {/* Status bar */}
      <div
        className={cn(
          "flex items-center justify-between rounded-[0.9rem] border-[3px] border-border px-3 py-1.5 comic-shadow",
          meta.barClass,
        )}
      >
        <h3 className="text-lg leading-none font-black uppercase tracking-tight">
          {meta.title}
        </h3>
        <span
          className={cn(
            "inline-flex min-w-9 items-center justify-center rounded-full border-[3px] border-border px-2 py-0.5 text-xs leading-none font-black",
            meta.badgeClass,
          )}
        >
          {String(tasks.length).padStart(2, "0")}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "mt-1.5 min-h-[2rem] rounded-xl border-2 border-dashed border-transparent px-0.5 py-0.5 transition-all duration-200",
          isOver && meta.dropHighlight,
          // Desktop: scroll nội bộ ẩn scrollbar
          "md:max-h-[calc(100vh-16rem)] md:overflow-y-auto md:scrollbar-hide",
        )}
      >
        {tasks.length === 0 ? (
          <p
            className={cn(
              "rounded-full border-[3px] border-border bg-[#f2f2f2] px-3 py-1.5 text-xs font-black uppercase text-muted-foreground",
              isOver && "border-dashed bg-white",
            )}
          >
            {isOver ? "Thả vào đây" : meta.empty}
          </p>
        ) : (
          <>
            {/* Mobile: hiển thị collapsed, Desktop: hiển thị tất cả */}
            <div className="space-y-1 md:hidden">
              {visibleTasks.map((task) => (
                <KanbanCard
                  key={task._id}
                  task={task}
                  canEdit={canEdit}
                  onOpenTask={onOpenTask}
                  onOpenComments={onOpenComments}
                />
              ))}
            </div>

            {/* Desktop: hiển thị tất cả card */}
            <div className="hidden space-y-1 md:block">
              {tasks.map((task) => (
                <KanbanCard
                  key={task._id}
                  task={task}
                  canEdit={canEdit}
                  onOpenTask={onOpenTask}
                  onOpenComments={onOpenComments}
                />
              ))}
            </div>

            {/* Expand/collapse badge — chỉ hiện trên mobile */}
            {needsCollapse && !isExpanded && (
              <div className="mt-1 md:hidden">
                <button
                  type="button"
                  onClick={onToggleExpand}
                  className="inline-flex min-h-7 items-center gap-1 rounded-full border-[3px] border-border bg-[#111111] px-2.5 text-[0.68rem] font-black uppercase text-white comic-shadow transition-transform hover:-translate-y-0.5"
                  aria-expanded={isExpanded}
                >
                  +{hiddenCount}
                  <ChevronDownIcon className="size-2.5" />
                </button>
              </div>
            )}

            {needsCollapse && isExpanded && (
              <div className="mt-1 border-t-[3px] border-dashed border-border/20 pt-1 md:hidden">
                <button
                  type="button"
                  onClick={onToggleExpand}
                  className="inline-flex min-h-7 items-center gap-1 rounded-full border-[3px] border-border bg-card px-2.5 text-[0.68rem] font-black uppercase comic-shadow transition-transform hover:-translate-y-0.5"
                  aria-expanded={isExpanded}
                >
                  Thu gọn
                  <ChevronUpIcon className="size-3" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
