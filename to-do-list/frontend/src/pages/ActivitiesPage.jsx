import { useEffect, useMemo, useState, useCallback } from "react";
import {
  CheckCircle2Icon,
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
import { useNavigate, useLocation } from "react-router-dom";

const actionLabelMap = {
  "task.created": "Tạo công việc",
  "task.updated": "Cập nhật công việc",
  "task.deleted": "Xóa công việc",
};

const actionShortLabelMap = {}; // Removed usage in UI

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
  const location = useLocation();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const searchParams = new URLSearchParams(location.search);
      const search = searchParams.get("search") || undefined;

      const payload = await api.get("/profile/audit-logs", {
        params: {
          page: 1,
          limit: 30,
          ...(search ? { search } : {}),
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
  }, [location.search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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
      {/* Recent Activity summary card removed as requested */}

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

              <div className="relative pl-8">
                <div className="absolute left-3 top-0 h-full w-1 rounded-full bg-border" />

                <div className="space-y-4">
                  {group.items.map((log) => {
                    const actionLabel =
                      actionLabelMap[log?.action] || log?.action || "Hành động";
                    const actionMarkerTone =
                      actionMarkerToneMap[log?.action] ||
                      "bg-[#ffd400] text-foreground";
                    const taskTitle = resolveTaskTitle(log);
                    
                    const ActionIcon =
                      actionIconMap[log?.action] || CheckCircle2Icon;

                    // Compute "Sửa gì" details
                    const getUpdateDetails = () => {
                      if (log.action !== "task.updated") return null;
                      const changes = [];
                      const before = log.summaryBefore || {};
                      const after = log.summaryAfter || {};

                      if (before.title !== after.title && after.title) {
                        changes.push(`đổi tên`);
                      }
                      if (before.status !== after.status && after.status) {
                        const label = statusLabelMap[String(after.status).toLowerCase()] || after.status;
                        changes.push(`sang "${label}"`);
                      }
                      if (before.priority !== after.priority && after.priority) {
                        const label = priorityLabelMap[String(after.priority).toLowerCase()] || after.priority;
                        changes.push(`ưu tiên "${label}"`);
                      }
                      return changes.length > 0 ? `(${changes.join(", ")})` : null;
                    };

                    const updateDetails = getUpdateDetails();

                    return (
                      <div
                        key={log?._id || `${log?.entityId}-${log?.createdAt}`}
                        className="relative"
                      >
                        <article className="rounded-[2rem] border-[3px] border-border bg-card p-5 comic-shadow border-b-[8px] transition-transform active:scale-[0.98]">
                          <div className="flex gap-4 md:gap-6">
                            {/* Action Icon - Single instance on the left */}
                            <div className={cn(
                              "inline-flex size-14 shrink-0 items-center justify-center rounded-[1.2rem] border-[3px] border-border comic-shadow",
                              actionMarkerTone
                            )}>
                              <ActionIcon className="size-7" />
                            </div>

                            <div className="flex-1 min-w-0">
                               <div className="relative pr-14">
                                 {/* Time Sticker - Absolutely positioned to avoid all overlaps */}
                                 <div className="absolute -top-1 -right-1 shrink-0 rounded-full border-[2px] border-border bg-[#121212] px-2 py-1 text-[0.6rem] font-black uppercase text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                                   {formatClock(log?.createdAt)}
                                 </div>
 
                                 <div className="flex flex-col gap-0.5">
                                   {/* Level 1: Contextual Prefix */}
                                   <div className="text-[0.6rem] font-black uppercase tracking-[0.1em] text-muted-foreground/30">
                                     Bạn đã
                                   </div>
                                   
                                   {/* Level 2: Action - Legible but secondary */}
                                   <div className="flex flex-wrap items-center gap-2">
                                     <span className="text-[0.85rem] font-black uppercase tracking-tight text-foreground/50">
                                       {actionLabel}
                                     </span>
                                     {updateDetails && (
                                       <span className="rounded bg-muted/20 px-1 py-0.5 text-[0.6rem] font-bold text-muted-foreground lowercase italic">
                                         {updateDetails}
                                       </span>
                                     )}
                                   </div>
 
                                   {/* Level 3: Task Title - Primary Info */}
                                   <h3 className="truncate text-lg font-black uppercase tracking-tight text-foreground">
                                     {taskTitle}
                                   </h3>
                                 </div>
                               </div>
                             </div>
                           </div>

                          <div className="mt-4 flex items-center justify-between border-t-[3px] border-dashed border-border/10 pt-3">
                            <p className="text-[0.7rem] font-black uppercase text-muted-foreground/50">
                              LOG #{log?._id?.slice(-4).toUpperCase()}
                            </p>

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
