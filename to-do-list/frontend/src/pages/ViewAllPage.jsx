import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CalendarDaysIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import taskService from "@/services/taskService";

const COLLAPSED_CHIPS = 5;

const STATUS_ORDER = ["todo", "doing", "done"];

const STATUS_META = {
  todo: {
    title: "CẦN LÀM",
    barClass: "bg-[#ff3b57] text-white",
    badgeClass: "bg-[#fffdf7] text-[#ff3b57]",
    empty: "Chưa có việc cần làm",
  },
  doing: {
    title: "ĐANG LÀM",
    barClass: "bg-[#00c2ff] text-foreground",
    badgeClass: "bg-[#fffdf7] text-[#007ab3]",
    empty: "Chưa có việc đang làm",
  },
  done: {
    title: "HOÀN THÀNH",
    barClass: "bg-[#84e11f] text-foreground",
    badgeClass: "bg-[#fffdf7] text-[#3f7a00]",
    empty: "Chưa có việc hoàn thành",
  },
};

const getTasksFromPayload = (payload) => {
  if (Array.isArray(payload?.data?.tasks)) {
    return payload.data.tasks;
  }

  if (Array.isArray(payload?.tasks)) {
    return payload.tasks;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

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
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const formatClock = (value) => {
  return value.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatShortDate = (value) => {
  return value.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
};

const toRelativeDueLabel = (dueDate) => {
  const due = normalizeDate(dueDate);
  if (!due) {
    return "CHƯA CÓ HẠN";
  }

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

  if (dayDiff === 1) {
    return "NGÀY MAI";
  }

  if (dayDiff <= 7) {
    return `CÒN ${dayDiff} NGÀY`;
  }

  return formatShortDate(due).toUpperCase();
};

const toDoneLabel = (task) => {
  const doneAt = normalizeDate(task?.completedAt || task?.updatedAt);
  if (!doneAt) {
    return "ĐÃ XONG";
  }

  const today = startOfDay(new Date());
  const doneDay = startOfDay(doneAt);
  const dayMs = 24 * 60 * 60 * 1000;
  const dayDiff = Math.round((today.getTime() - doneDay.getTime()) / dayMs);

  if (dayDiff === 0) {
    return formatClock(doneAt).toUpperCase();
  }

  if (dayDiff === 1) {
    return "HÔM QUA";
  }

  return formatShortDate(doneAt).toUpperCase();
};

const getChipLabel = (task) => {
  if (task?.status === "done") {
    return toDoneLabel(task);
  }

  return toRelativeDueLabel(task?.dueDate);
};

const byDueDateAsc = (left, right) => {
  const leftDue = normalizeDate(left?.dueDate);
  const rightDue = normalizeDate(right?.dueDate);

  if (leftDue && rightDue) {
    return leftDue.getTime() - rightDue.getTime();
  }

  if (leftDue && !rightDue) {
    return -1;
  }

  if (!leftDue && rightDue) {
    return 1;
  }

  const leftUpdated = normalizeDate(left?.updatedAt);
  const rightUpdated = normalizeDate(right?.updatedAt);

  if (leftUpdated && rightUpdated) {
    return rightUpdated.getTime() - leftUpdated.getTime();
  }

  return 0;
};

function ViewAllSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-28 rounded-[1.3rem]" />
      <Skeleton className="h-28 rounded-[1.3rem]" />
      <Skeleton className="h-28 rounded-[1.3rem]" />
    </div>
  );
}

function StatusSection({
  status,
  tasks,
  isExpanded,
  onToggleExpand,
  onOpenTask,
}) {
  const meta = STATUS_META[status];
  const visibleTasks = isExpanded ? tasks : tasks.slice(0, COLLAPSED_CHIPS);
  const hiddenCount = Math.max(0, tasks.length - COLLAPSED_CHIPS);

  return (
    <section className="space-y-3">
      <div
        className={cn(
          "flex items-center justify-between rounded-[0.9rem] border-[3px] border-border px-3 py-2 comic-shadow",
          meta.barClass,
        )}
      >
        <h3 className="text-xl leading-none font-black uppercase tracking-tight">
          {meta.title}
        </h3>

        <span
          className={cn(
            "inline-flex min-w-10 items-center justify-center rounded-full border-[3px] border-border px-2 py-0.5 text-sm leading-none font-black",
            meta.badgeClass,
          )}
        >
          {String(tasks.length).padStart(2, "0")}
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="px-1">
          <p className="rounded-full border-[3px] border-border bg-[#f2f2f2] px-4 py-2 text-sm font-black uppercase text-muted-foreground">
            {meta.empty}
          </p>
        </div>
      ) : (
        <>
          <div
            className={cn(
              "px-1 transition-all duration-300",
              isExpanded ? "max-h-40 overflow-y-auto pr-1 pb-1" : "",
            )}
          >
            <div className="grid grid-cols-[max-content_max-content] justify-start gap-1.5">
              {visibleTasks.map((task) => (
                <button
                  key={task._id}
                  type="button"
                  onClick={() => onOpenTask(task)}
                  className="inline-flex max-w-full min-h-8 items-center gap-1 rounded-full border-[3px] border-border bg-card px-2 text-[0.8rem] font-black uppercase comic-shadow transition-transform hover:-translate-y-0.5 active:translate-y-0"
                  title={task?.title || "Nhiệm vụ"}
                >
                  <CalendarDaysIcon className="size-2.5 text-muted-foreground" />
                  <span className="truncate">{getChipLabel(task)}</span>
                </button>
              ))}

              {!isExpanded && hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={onToggleExpand}
                  className="inline-flex max-w-full min-h-8 items-center gap-1 rounded-full border-[3px] border-border bg-[#111111] px-2 text-[0.8rem] font-black uppercase text-white comic-shadow"
                  aria-expanded={isExpanded}
                >
                  +{hiddenCount}
                  <ChevronDownIcon className="size-2.5" />
                </button>
              )}
            </div>
          </div>

          {isExpanded && hiddenCount > 0 && (
            <div className="mt-2 border-t-[3px] border-dashed border-border/20 px-1 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onToggleExpand}
                className="min-h-9 rounded-full border-[3px] border-border px-3 text-xs font-black uppercase"
                aria-expanded={isExpanded}
              >
                Thu gọn
                <ChevronUpIcon className="size-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default function ViewAllPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [expandedStatus, setExpandedStatus] = useState("");

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
    const grouped = {
      todo: [],
      doing: [],
      done: [],
    };

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

  return (
    <section className="space-y-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      <header className="rounded-[1.4rem] border-[3px] border-border bg-[#ffd400] p-4 comic-shadow">
        <div>
          <h1 className="text-[1.6rem] leading-[1.06] font-black uppercase tracking-tight sm:text-[2.7rem] sm:leading-[1.05]">
            Xem tất cả công việc
          </h1>
        </div>

        <p className="mt-3 rounded-full border-[3px] border-border bg-card px-3 py-2 text-sm font-black uppercase">
          Tổng: {String(totalTasks).padStart(2, "0")} nhiệm vụ
        </p>
      </header>

      {isLoading && <ViewAllSkeleton />}

      {!isLoading && errorMessage && (
        <ErrorState message={errorMessage} onRetry={fetchTasks} />
      )}

      {!isLoading && !errorMessage && totalTasks === 0 && (
        <EmptyState
          title="Chưa có task nào"
          description="Bắt đầu bằng một nhiệm vụ mới để màn hình View All hiển thị đầy đủ hơn."
          ctaLabel="Tạo task mới"
          onCta={() => navigate("/tasks/new")}
        />
      )}

      {!isLoading && !errorMessage && totalTasks > 0 && (
        <div className="space-y-4">
          {STATUS_ORDER.map((status) => (
            <StatusSection
              key={status}
              status={status}
              tasks={tasksByStatus[status]}
              isExpanded={expandedStatus === status}
              onToggleExpand={() =>
                setExpandedStatus((current) =>
                  current === status ? "" : status,
                )
              }
              onOpenTask={(task) => {
                if (!task?._id) {
                  return;
                }

                navigate(`/tasks/${task._id}`);
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
