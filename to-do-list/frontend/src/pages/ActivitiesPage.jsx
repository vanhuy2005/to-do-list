import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2Icon,
  HistoryIcon,
  RefreshCcwIcon,
  SparklesIcon,
  SquarePenIcon,
  Trash2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import api from "@/lib/axios";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const actionLabelMap = {
  "task.created": "Tạo công việc",
  "task.updated": "Cập nhật công việc",
  "task.deleted": "Xóa công việc",
};

const actionShortLabelMap = {
  "task.created": "THÊM",
  "task.updated": "SỬA",
  "task.deleted": "XÓA",
};

const actionMarkerToneMap = {
  "task.created": "bg-[#ffd400] text-foreground",
  "task.updated": "bg-[#00c2ff] text-foreground",
  "task.deleted": "bg-[#ff3b57] text-white",
};

const actionIconMap = {
  "task.created": SparklesIcon,
  "task.updated": SquarePenIcon,
  "task.deleted": Trash2Icon,
};

const statusLabelMap = {
  todo: "Cần làm",
  doing: "Đang làm",
  done: "Hoàn thành",
  canceled: "Đã hủy",
};

const priorityLabelMap = {
  low: "Thấp",
  medium: "Vừa",
  high: "Cao",
};

const formatClock = (value) => {
  if (!value) {
    return "--:--";
  }

  try {
    return new Date(value).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "--:--";
  }
};

const formatDayKey = (value) => {
  if (!value) {
    return "unknown";
  }

  try {
    return new Date(value).toLocaleDateString("en-CA");
  } catch {
    return "unknown";
  }
};

const getDayLabel = (dayKey, firstLogDate) => {
  if (!firstLogDate) {
    return "HÀNH ĐỘNG";
  }

  const today = new Date();
  const todayKey = formatDayKey(today);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = formatDayKey(yesterday);

  if (dayKey === todayKey) {
    return "HÔM NAY";
  }

  if (dayKey === yesterdayKey) {
    return "HÔM QUA";
  }

  return firstLogDate.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getDayTone = (dayLabel) => {
  if (dayLabel.startsWith("HÔM NAY")) {
    return "bg-[#ff3b57] text-white";
  }

  if (dayLabel.startsWith("HÔM QUA")) {
    return "bg-[#3b4252] text-white";
  }

  return "bg-[#ffd400] text-foreground";
};

const resolveTaskTitle = (log) => {
  return (
    log?.summaryAfter?.title ||
    log?.summaryBefore?.title ||
    "Task không có tiêu đề"
  );
};

function ActivitiesSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48 rounded-[1rem]" />
      <div className="space-y-4">
        <Skeleton className="h-36 rounded-[1.8rem]" />
        <Skeleton className="h-36 rounded-[1.8rem]" />
      </div>
      <Skeleton className="h-10 w-56 rounded-[1rem]" />
      <Skeleton className="h-36 rounded-[1.8rem]" />
    </div>
  );
}

export default function ActivitiesPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchLogs = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const payload = await api.get("/profile/audit-logs", {
        params: {
          page: 1,
          limit: 30,
        },
      });

      const normalizedLogs = Array.isArray(payload?.data?.logs)
        ? payload.data.logs.filter((log) => log?.action !== "task.restored")
        : [];
      setLogs(normalizedLogs);
    } catch (error) {
      const nextMessage =
        error?.response?.data?.error?.message ||
        "Không tải được lịch sử hoạt động. Vui lòng thử lại.";
      setErrorMessage(nextMessage);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const groupedLogs = useMemo(() => {
    const groups = new Map();

    for (const log of logs) {
      const createdAt = log?.createdAt ? new Date(log.createdAt) : null;
      const dayKey = formatDayKey(log?.createdAt);

      if (!groups.has(dayKey)) {
        groups.set(dayKey, []);
      }

      groups.get(dayKey).push({
        ...log,
        createdAtDate: createdAt,
        dayKey,
      });
    }

    return Array.from(groups.entries()).map(([dayKey, items]) => ({
      dayKey,
      label: getDayLabel(dayKey, items[0]?.createdAtDate),
      tone: getDayTone(getDayLabel(dayKey, items[0]?.createdAtDate)),
      items,
    }));
  }, [logs]);

  const totalLogs = useMemo(() => logs.length, [logs]);

  return (
    <section className="space-y-6 pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <div className="rounded-[1.6rem] border-[3px] border-border bg-[#fffaf0] px-4 py-4 comic-shadow">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[0.75rem] font-black uppercase tracking-[0.08em] md:tracking-[0.15em] text-muted-foreground">
              Dòng thời gian
            </p>
            <h2 className="mt-1 text-2xl leading-none font-black uppercase">
              Hoạt động gần đây
            </h2>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="xs"
            onClick={fetchLogs}
          >
            <RefreshCcwIcon className="size-3.5" />
            Làm mới
          </Button>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm font-black uppercase">
          <span className="inline-flex size-8 items-center justify-center rounded-lg border-[3px] border-border bg-[#ffd400] comic-shadow">
            <HistoryIcon className="size-4" />
          </span>
          <span className="text-muted-foreground">Tổng hoạt động</span>
          <span className="ml-auto text-xl text-foreground">{totalLogs}</span>
        </div>
      </div>

      {isLoading && <ActivitiesSkeleton />}

      {!isLoading && errorMessage && (
        <ErrorState message={errorMessage} onRetry={fetchLogs} />
      )}

      {!isLoading && !errorMessage && logs.length === 0 && (
        <EmptyState
          title="Chưa có hoạt động"
          description="Khi bạn tạo, sửa, xóa task thì lịch sử sẽ hiện tại đây."
          ctaLabel="Làm mới"
          onCta={fetchLogs}
        />
      )}

      {!isLoading && !errorMessage && logs.length > 0 && (
        <div className="space-y-6">
          {groupedLogs.map((group) => (
            <div key={group.dayKey} className="space-y-4">
              <div className="inline-flex max-w-full rounded-[1.1rem] border-[3px] border-border bg-card px-4 py-2 comic-shadow">
                <span
                  className={cn(
                    "rounded-lg border-[3px] border-border px-4 py-2 text-sm font-black uppercase tracking-normal md:tracking-wide",
                    group.tone,
                  )}
                >
                  {group.label}
                </span>
              </div>

              <div className="relative pl-12">
                <div className="absolute left-5 top-0 h-full w-1 rounded-full bg-border" />

                <div className="space-y-4">
                  {group.items.map((log) => {
                    const actionLabel =
                      actionLabelMap[log?.action] || log?.action || "Hành động";
                    const actionShortLabel =
                      actionShortLabelMap[log?.action] || "LOG";
                    const actionMarkerTone =
                      actionMarkerToneMap[log?.action] ||
                      "bg-[#ffd400] text-foreground";
                    const taskTitle = resolveTaskTitle(log);
                    const statusValue = String(
                      log?.summaryAfter?.status ||
                        log?.summaryBefore?.status ||
                        "",
                    ).toLowerCase();
                    const priorityValue = String(
                      log?.summaryAfter?.priority ||
                        log?.summaryBefore?.priority ||
                        "medium",
                    ).toLowerCase();
                    const statusLabel =
                      statusLabelMap[statusValue] ||
                      (statusValue ? statusValue : "");
                    const priorityLabel =
                      priorityLabelMap[priorityValue] || priorityValue;
                    const actionDetail =
                      statusLabel || priorityLabel
                        ? [statusLabel, priorityLabel]
                            .filter(Boolean)
                            .join(" · ")
                        : "Cập nhật nhanh";
                    const ActionIcon =
                      actionIconMap[log?.action] || CheckCircle2Icon;

                    return (
                      <div
                        key={log?._id || `${log?.entityId}-${log?.createdAt}`}
                        className="relative"
                      >
                        <div className="absolute left-[-2.45rem] top-6 z-10 flex size-10 items-center justify-center rounded-[1rem] border-[3px] border-border bg-[#ffd400] comic-shadow">
                          <ActionIcon className="size-5 text-foreground" />
                        </div>

                        <article className="rounded-[1.4rem] border-[3px] border-border bg-card p-4 comic-shadow border-b-[7px]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={cn(
                                    "rounded-xl border-[3px] border-border px-3 py-1 text-[0.75rem] font-black uppercase tracking-normal md:tracking-wide",
                                    actionMarkerTone,
                                  )}
                                >
                                  {actionShortLabel}
                                </span>
                                <span className="rounded-full border-[3px] border-border bg-[#1f1f1f] px-3 py-1 text-[0.72rem] font-black uppercase tracking-normal md:tracking-wide text-white">
                                  {formatClock(log?.createdAt)}
                                </span>
                              </div>

                              <p className="text-[1.15rem] leading-tight font-black uppercase tracking-tight">
                                {taskTitle}
                              </p>

                              <p className="max-w-xl text-sm font-medium leading-6 text-muted-foreground">
                                {actionLabel}
                                {actionDetail ? ` · ${actionDetail}` : ""}
                              </p>
                            </div>

                            <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border-[3px] border-border bg-[#00c2ff] comic-shadow">
                              <SparklesIcon className="size-5 text-foreground" />
                            </div>
                          </div>

                          <div className="mt-5 border-t-[3px] border-dashed border-border/20 pt-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <Button
                                type="button"
                                variant="secondary"
                                size="xs"
                                onClick={() => {
                                  if (!log?.entityId) {
                                    return;
                                  }

                                  navigate(
                                    `/tasks/${log.entityId}?from=audit&returnTo=%2F`,
                                    {
                                      state: { auditLog: log },
                                    },
                                  );
                                }}
                              >
                                Xem chi tiết
                              </Button>

                              <div className="flex items-center gap-2 text-[0.7rem] font-black uppercase tracking-[0.08em] md:tracking-[0.15em] text-muted-foreground">
                                <span className="rounded-full border-[3px] border-border bg-[#ffe4ec] px-3 py-1 text-foreground">
                                  {actionLabel}
                                </span>
                                <span>Nhật ký</span>
                              </div>
                            </div>
                          </div>
                        </article>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
