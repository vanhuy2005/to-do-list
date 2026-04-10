import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { CalendarDaysIcon, GripVerticalIcon } from "lucide-react";
import { toast } from "sonner";

import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import KanbanColumn from "@/components/KanbanColumn";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import taskService from "@/services/taskService";

const STATUS_ORDER = ["todo", "doing", "done"];

const STATUS_META = {
  todo: { title: "CẦN LÀM" },
  doing: { title: "ĐANG LÀM" },
  done: { title: "HOÀN THÀNH" },
};

const PRIORITY_BORDER_OVERLAY = {
  high: "border-l-[#ff3b57]",
  medium: "border-l-[#ffd400]",
  low: "border-l-[#84e11f]",
};

const getTasksFromPayload = (payload) => {
  if (Array.isArray(payload?.data?.tasks)) return payload.data.tasks;
  if (Array.isArray(payload?.tasks)) return payload.tasks;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const getErrorMessage = (error) => {
  if (error?.response?.status === 401) {
    return "Bạn cần đăng nhập để xem danh sách công việc.";
  }
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    "Không thể tải màn hình xem tất cả. Vui lòng thử lại."
  );
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
  if (!due) return "CHƯA CÓ HẠN";

  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);
  const hourMs = 60 * 60 * 1000;
  const dayMs = 24 * hourMs;

  if (diffMs < 0) {
    if (absMs < dayMs) {
      const hours = Math.max(1, Math.ceil(absMs / hourMs));
      return `TRỄ ${hours} TIẾNG`;
    }
    const days = Math.max(1, Math.ceil(absMs / dayMs));
    return `TRỄ ${days} NGÀY`;
  }

  const nowDay = startOfDay(now);
  const dueDay = startOfDay(due);
  const dayDiff = Math.round((dueDay.getTime() - nowDay.getTime()) / dayMs);

  if (dayDiff === 0) {
    const hours = Math.max(1, Math.ceil(diffMs / hourMs));
    return `CÒN ${hours} TIẾNG`;
  }
  if (dayDiff === 1) return "NGÀY MAI";
  if (dayDiff <= 7) return `CÒN ${dayDiff} NGÀY`;
  return formatShortDate(due).toUpperCase();
};

const toDoneLabel = (task) => {
  const doneAt = normalizeDate(task?.completedAt || task?.updatedAt);
  if (!doneAt) return "ĐÃ XONG";

  const today = startOfDay(new Date());
  const doneDay = startOfDay(doneAt);
  const dayMs = 24 * 60 * 60 * 1000;
  const dayDiff = Math.round((today.getTime() - doneDay.getTime()) / dayMs);

  if (dayDiff === 0) return formatClock(doneAt).toUpperCase();
  if (dayDiff === 1) return "HÔM QUA";
  return formatShortDate(doneAt).toUpperCase();
};

const getDeadlineLabel = (task) => {
  if (task?.status === "done") return toDoneLabel(task);
  return toRelativeDueLabel(task?.dueDate);
};

const byDueDateAsc = (left, right) => {
  const leftDue = normalizeDate(left?.dueDate);
  const rightDue = normalizeDate(right?.dueDate);

  if (leftDue && rightDue) return leftDue.getTime() - rightDue.getTime();
  if (leftDue && !rightDue) return -1;
  if (!leftDue && rightDue) return 1;

  const leftUpdated = normalizeDate(left?.updatedAt);
  const rightUpdated = normalizeDate(right?.updatedAt);
  if (leftUpdated && rightUpdated) {
    return rightUpdated.getTime() - leftUpdated.getTime();
  }
  return 0;
};

function ViewAllSkeleton() {
  return (
    <div className="space-y-5 md:flex md:gap-4 md:space-y-0">
      <Skeleton className="h-28 rounded-[1.3rem] md:flex-1" />
      <Skeleton className="h-28 rounded-[1.3rem] md:flex-1" />
      <Skeleton className="h-28 rounded-[1.3rem] md:flex-1" />
    </div>
  );
}

/** Drag overlay — ghost card that follows cursor/finger */
function DragOverlayCard({ task }) {
  if (!task) return null;

  const priorityValue = task.priority || "medium";
  const borderClass =
    PRIORITY_BORDER_OVERLAY[priorityValue] || PRIORITY_BORDER_OVERLAY.medium;
  const deadlineLabel = getDeadlineLabel(task);
  const isOverdue = deadlineLabel.startsWith("TRỄ");

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg border-[3px] border-border bg-card px-2 py-1",
        "border-l-[4px] shadow-xl",
        "w-[240px] rotate-[2deg] scale-105",
        borderClass,
      )}
    >
      <span className="flex-shrink-0 text-muted-foreground/40">
        <GripVerticalIcon className="size-3" />
      </span>
      <span className="min-w-0 flex-1 truncate text-[0.72rem] leading-none font-black uppercase tracking-tight">
        {task.title || "Nhiệm vụ"}
      </span>
      <span
        className={cn(
          "inline-flex flex-shrink-0 items-center gap-0.5 text-[0.6rem] font-bold uppercase whitespace-nowrap",
          isOverdue
            ? "text-[#ff3b57]"
            : task.status === "done"
              ? "text-[#3f7a00]"
              : "text-muted-foreground",
        )}
      >
        <CalendarDaysIcon className="size-2 flex-shrink-0" />
        {deadlineLabel}
      </span>
    </div>
  );
}

export default function ViewAllPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [expandedStatus, setExpandedStatus] = useState("");
  const [activeDragTask, setActiveDragTask] = useState(null);

  // DnD Sensors
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    const searchParams = new URLSearchParams(location.search);
    const priority = searchParams.get("priority") || undefined;
    const tag = searchParams.get("tag") || undefined;
    const search = searchParams.get("search") || undefined;

    try {
      const payload = await taskService.getTasks({
        page: 1,
        limit: 100,
        sort: "updatedAt",
        order: "desc",
        ...(priority ? { priority } : {}),
        ...(tag ? { tag } : {}),
        ...(search ? { search } : {}),
      });

      const normalizedTasks = getTasksFromPayload(payload);
      setTasks(normalizedTasks);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [location.search]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const tasksByStatus = useMemo(() => {
    const grouped = { todo: [], doing: [], done: [] };

    for (const task of tasks) {
      const status = task?.status;
      if (status === "doing") {
        grouped.doing.push(task);
      } else if (status === "done") {
        grouped.done.push(task);
      } else {
        grouped.todo.push(task);
      }
    }

    grouped.todo.sort(byDueDateAsc);
    grouped.doing.sort(byDueDateAsc);
    grouped.done.sort(byDueDateAsc);

    return grouped;
  }, [tasks]);

  const totalTasks = tasks.length;

  const handleOpenTask = useCallback(
    (task) => {
      if (!task?._id) return;
      navigate(`/tasks/${task._id}`, {
        state: { returnTo: `/view-all${location.search}` },
      });
    },
    [navigate, location.search],
  );

  // --- Drag & Drop handlers ---

  const handleDragStart = useCallback(
    (event) => {
      const taskId = event.active.id;
      const draggedTask = tasks.find((t) => t._id === taskId);
      setActiveDragTask(draggedTask || null);
    },
    [tasks],
  );

  const handleDragEnd = useCallback(
    async (event) => {
      setActiveDragTask(null);

      const { active, over } = event;
      if (!over || !active) return;

      const taskId = active.id;
      const newStatus = over.id;

      // Validate drop target is a valid status column
      if (!STATUS_ORDER.includes(newStatus)) return;

      const task = tasks.find((t) => t._id === taskId);
      if (!task || task.status === newStatus) return;

      const previousStatus = task.status;

      // Optimistic update
      setTasks((prev) =>
        prev.map((t) =>
          t._id === taskId
            ? {
                ...t,
                status: newStatus,
                ...(newStatus === "done"
                  ? { completedAt: new Date().toISOString() }
                  : { completedAt: null }),
              }
            : t,
        ),
      );

      try {
        await taskService.updateTask(taskId, { status: newStatus });
        toast.success("Đã cập nhật!", {
          description: `"${task.title}" → ${STATUS_META[newStatus].title}`,
        });
      } catch {
        // Rollback
        setTasks((prev) =>
          prev.map((t) =>
            t._id === taskId ? { ...t, status: previousStatus } : t,
          ),
        );
        toast.error("Lỗi!", {
          description: "Không thể cập nhật trạng thái. Vui lòng thử lại.",
        });
      }
    },
    [tasks],
  );

  const handleDragCancel = useCallback(() => {
    setActiveDragTask(null);
  }, []);

  return (
    <section className="space-y-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      {/* Header — compact */}
      <header className="flex items-center justify-between rounded-[1rem] border-[3px] border-border bg-[#ffd400] px-3 py-2 comic-shadow">
        <h1 className="text-lg leading-none font-black uppercase tracking-tight">
          Tất Cả Công Việc Bạn Có Là
        </h1>
        <span className="inline-flex min-w-9 items-center justify-center rounded-full border-[3px] border-border bg-card px-2 py-0.5 text-xs leading-none font-black">
          {String(totalTasks).padStart(2, "0")}
        </span>
      </header>

      {/* Loading skeleton */}
      {isLoading && <ViewAllSkeleton />}

      {/* Error state */}
      {!isLoading && errorMessage && (
        <ErrorState message={errorMessage} onRetry={fetchTasks} />
      )}

      {/* Empty state */}
      {!isLoading && !errorMessage && totalTasks === 0 && (
        <EmptyState
          title="Chưa có task nào"
          description="Bắt đầu bằng một nhiệm vụ mới để màn hình View All hiển thị đầy đủ hơn."
          ctaLabel="Tạo task mới"
          onCta={() => navigate("/tasks/new")}
        />
      )}

      {/* Kanban board with DnD */}
      {!isLoading && !errorMessage && totalTasks > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="space-y-4 md:flex md:items-start md:gap-4 md:space-y-0">
            {STATUS_ORDER.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={tasksByStatus[status]}
                isExpanded={expandedStatus === status}
                onToggleExpand={() =>
                  setExpandedStatus((current) =>
                    current === status ? "" : status,
                  )
                }
                onOpenTask={handleOpenTask}
              />
            ))}
          </div>

          {/* Drag overlay — floating card following cursor */}
          <DragOverlay dropAnimation={null}>
            <DragOverlayCard task={activeDragTask} />
          </DragOverlay>
        </DndContext>
      )}
    </section>
  );
}
