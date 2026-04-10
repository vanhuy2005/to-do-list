import { useEffect, useMemo, useState, useCallback } from "react";
import {
  CheckCircle2Icon,
  SparklesIcon,
  SquarePenIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
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

const AUDIT_PAGE_SIZE = 6;
const PAGE_JUMP_DEBOUNCE_MS = 450;

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

const getPaginationFromPayload = (payload) => {
  const pagination = payload?.data?.pagination;

  if (!pagination) {
    return {
      page: 1,
      limit: AUDIT_PAGE_SIZE,
      total: 0,
      totalPages: 1,
    };
  }

  return {
    page: Math.max(1, Number.parseInt(pagination.page, 10) || 1),
    limit: Math.max(
      1,
      Number.parseInt(pagination.limit, 10) || AUDIT_PAGE_SIZE,
    ),
    total: Math.max(0, Number.parseInt(pagination.total, 10) || 0),
    totalPages: Math.max(1, Number.parseInt(pagination.totalPages, 10) || 1),
  };
};

const getPageFromSearch = (search) => {
  const raw = Number.parseInt(
    new URLSearchParams(search).get("page") || "1",
    10,
  );

  if (Number.isNaN(raw) || raw < 1) {
    return 1;
  }

  return raw;
};

const getVisiblePages = (currentPage, totalPages) => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, currentPage - 1, currentPage, currentPage + 1, totalPages];
};

const getUpdateDetails = (log) => {
  if (log?.action !== "task.updated") return null;

  const changes = [];
  const before = log.summaryBefore || {};
  const after = log.summaryAfter || {};

  if (before.title !== after.title && after.title) {
    changes.push("đổi tên");
  }

  if (before.status !== after.status && after.status) {
    const label =
      statusLabelMap[String(after.status).toLowerCase()] || after.status;
    changes.push(`sang "${label}"`);
  }

  if (before.priority !== after.priority && after.priority) {
    const label =
      priorityLabelMap[String(after.priority).toLowerCase()] || after.priority;
    changes.push(`ưu tiên "${label}"`);
  }

  return changes.length > 0 ? `(${changes.join(", ")})` : null;
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
  const [pagination, setPagination] = useState({
    page: 1,
    limit: AUDIT_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [pageInput, setPageInput] = useState("");
  const [isJumpInputVisible, setIsJumpInputVisible] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [deleteScope, setDeleteScope] = useState("all");
  const [deleteDate, setDeleteDate] = useState("");
  const [deleteMonth, setDeleteMonth] = useState("");
  const [deleteType, setDeleteType] = useState("all");
  const [isDeletingLogs, setIsDeletingLogs] = useState(false);

  const currentPage = useMemo(
    () => getPageFromSearch(location.search),
    [location.search],
  );
  const isCleanupPanelOpen = useMemo(() => {
    return new URLSearchParams(location.search).get("cleanup") === "1";
  }, [location.search]);

  const updatePageInQuery = useCallback(
    (nextPage) => {
      const normalizedPage = Math.max(1, nextPage);
      const params = new URLSearchParams(location.search);

      if (normalizedPage <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(normalizedPage));
      }

      navigate(
        {
          pathname: location.pathname,
          search: params.toString() ? `?${params.toString()}` : "",
        },
        { replace: true },
      );
    },
    [location.pathname, location.search, navigate],
  );

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const searchParams = new URLSearchParams(location.search);
      const search = searchParams.get("search") || undefined;

      const payload = await api.get("/profile/audit-logs", {
        params: {
          page: currentPage,
          limit: AUDIT_PAGE_SIZE,
          ...(search ? { search } : {}),
        },
      });

      const nextPagination = getPaginationFromPayload(payload);
      if (currentPage > nextPagination.totalPages) {
        updatePageInQuery(nextPagination.totalPages);
        return;
      }

      const normalizedLogs = Array.isArray(payload?.data?.logs)
        ? payload.data.logs
        : [];
      setPagination(nextPagination);
      setLogs(normalizedLogs);
    } catch (error) {
      const nextMessage =
        error?.response?.data?.error?.message ||
        "Không tải được lịch sử hoạt động. Vui lòng thử lại.";
      setErrorMessage(nextMessage);
      setPagination({
        page: currentPage,
        limit: AUDIT_PAGE_SIZE,
        total: 0,
        totalPages: 1,
      });
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [location.search, currentPage, updatePageInQuery]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const payload = await api.get("/profile");
        setCurrentUserId(payload?.data?.id || "");
      } catch {
        setCurrentUserId("");
      }
    };

    fetchProfile();
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

  const visiblePages = useMemo(
    () => getVisiblePages(pagination.page, pagination.totalPages),
    [pagination.page, pagination.totalPages],
  );

  useEffect(() => {
    setPageInput("");
    setIsJumpInputVisible(false);
  }, [pagination.page]);

  const handleJumpToPage = useCallback(
    (rawInput = pageInput) => {
      const parsed = Number.parseInt(rawInput, 10);

      if (Number.isNaN(parsed)) {
        return;
      }

      const nextPage = Math.min(pagination.totalPages, Math.max(1, parsed));
      setIsJumpInputVisible(false);
      setPageInput("");

      if (nextPage === pagination.page) {
        return;
      }

      updatePageInQuery(nextPage);
    },
    [pageInput, pagination.page, pagination.totalPages, updatePageInQuery],
  );

  const handlePageInputChange = useCallback((event) => {
    const rawValue = event.target.value || "";
    const digitsOnlyValue = rawValue.replace(/\D/g, "");
    setPageInput(digitsOnlyValue);
  }, []);

  useEffect(() => {
    if (!isJumpInputVisible || !pageInput) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      handleJumpToPage(pageInput);
    }, PAGE_JUMP_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [handleJumpToPage, isJumpInputVisible, pageInput]);

  const handleDeleteLogsByFilter = useCallback(async () => {
    if (!currentUserId) {
      toast.error("Không xác định được người dùng hiện tại");
      return;
    }

    const params = {};

    if (deleteScope === "day") {
      if (!deleteDate) {
        toast.error("Vui lòng chọn ngày cần xóa");
        return;
      }
      params.day = deleteDate;
    }

    if (deleteScope === "month") {
      if (!deleteMonth) {
        toast.error("Vui lòng chọn tháng cần xóa");
        return;
      }
      params.month = deleteMonth;
    }

    if (deleteType !== "all") {
      params.type = deleteType;
    }

    setIsDeletingLogs(true);

    try {
      const payload = await api.delete(`/audit-logs/user/${currentUserId}`, {
        params,
      });

      toast.success(payload?.message || "Đã xóa audit log");
      updatePageInQuery(1);
      await fetchLogs();
    } catch (error) {
      const nextMessage =
        error?.response?.data?.error?.message ||
        "Không xóa được audit log. Vui lòng thử lại.";
      toast.error(nextMessage);
    } finally {
      setIsDeletingLogs(false);
    }
  }, [
    currentUserId,
    deleteDate,
    deleteMonth,
    deleteScope,
    deleteType,
    fetchLogs,
    updatePageInQuery,
  ]);

  return (
    <section className="w-full space-y-6 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8">
      {/* Recent Activity summary card removed as requested */}

      {isCleanupPanelOpen && (
        <section className="rounded-[1.5rem] border-[3px] border-border bg-card p-4 comic-shadow">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-black uppercase tracking-wide text-foreground">
              Dọn nhật ký hoạt động
            </h2>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <select
              value={deleteScope}
              onChange={(event) => setDeleteScope(event.target.value)}
              className="h-10 rounded-lg border-[3px] border-border bg-background px-2 text-[0.72rem] font-black uppercase comic-shadow"
              aria-label="Chọn phạm vi xóa log"
            >
              <option value="all">Xóa tất cả thời gian</option>
              <option value="day">Xóa theo ngày</option>
              <option value="month">Xóa theo tháng</option>
            </select>

            <select
              value={deleteType}
              onChange={(event) => setDeleteType(event.target.value)}
              className="h-10 rounded-lg border-[3px] border-border bg-background px-2 text-[0.72rem] font-black uppercase comic-shadow"
              aria-label="Chọn loại log"
            >
              <option value="all">Mọi loại log</option>
              <option value="task.created">Task created</option>
              <option value="task.updated">Task updated</option>
              <option value="task.deleted">Task deleted</option>
            </select>

            {deleteScope === "day" ? (
              <Input
                type="date"
                value={deleteDate}
                onChange={(event) => setDeleteDate(event.target.value)}
                className="h-10 border-[3px] border-border bg-background text-[0.72rem] font-black uppercase comic-shadow"
                aria-label="Chọn ngày xóa log"
              />
            ) : (
              <Input
                type="month"
                value={deleteMonth}
                onChange={(event) => setDeleteMonth(event.target.value)}
                disabled={deleteScope !== "month"}
                className="h-10 border-[3px] border-border bg-background text-[0.72rem] font-black uppercase comic-shadow disabled:opacity-50"
                aria-label="Chọn tháng xóa log"
              />
            )}

            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteLogsByFilter}
              disabled={isDeletingLogs || !currentUserId}
              className="h-10 rounded-lg border-[3px] border-border text-[0.72rem] font-black uppercase"
            >
              {isDeletingLogs ? "Đang xóa..." : "Xóa log theo lọc"}
            </Button>
          </div>

          <p className="mt-2 text-[0.68rem] font-bold uppercase tracking-wide text-muted-foreground">
            Gợi ý: Chọn theo tháng + loại log để dọn nhẹ dữ liệu mà không ảnh hưởng toàn bộ lịch sử.
          </p>
        </section>
      )}

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
        <div className="space-y-5">
          {groupedLogs.map((group) => (
            <section
              key={group.dayKey}
              className="p-0 lg:rounded-[1.6rem] lg:border-[3px] lg:border-border lg:bg-card/95 lg:p-4 lg:comic-shadow"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span
                  className={cn(
                    "rounded-lg border-[3px] border-border px-4 py-2 text-sm font-black uppercase tracking-normal md:tracking-wide",
                    group.tone,
                  )}
                >
                  {group.label}
                </span>

                <span className="inline-flex h-8 items-center rounded-full border-[3px] border-border bg-background px-3 text-[0.65rem] font-black uppercase tracking-wide text-muted-foreground comic-shadow">
                  {group.items.length} hoạt động
                </span>
              </div>

              <div className="relative pl-8 lg:hidden">
                <div className="absolute left-3 top-0 h-full w-1 rounded-full bg-border" />

                <div className="space-y-3">
                  {group.items.map((log) => {
                    const actionLabel =
                      actionLabelMap[log?.action] || log?.action || "Hành động";
                    const actionMarkerTone =
                      actionMarkerToneMap[log?.action] ||
                      "bg-[#ffd400] text-foreground";
                    const taskTitle = resolveTaskTitle(log);
                    const ActionIcon =
                      actionIconMap[log?.action] || CheckCircle2Icon;
                    const updateDetails = getUpdateDetails(log);

                    return (
                      <article
                        key={`mobile-${log?._id || `${log?.entityId}-${log?.createdAt}`}`}
                        className="rounded-[1.3rem] border-[3px] border-border bg-background px-3.5 py-3 comic-shadow"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "inline-flex size-10 shrink-0 items-center justify-center rounded-[0.9rem] border-[3px] border-border comic-shadow",
                              actionMarkerTone,
                            )}
                          >
                            <ActionIcon className="size-5" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-[0.58rem] font-black uppercase tracking-widest text-muted-foreground/50">
                                  Bạn đã
                                </p>

                                <h3 className="mt-0.5 whitespace-normal wrap-break-word text-[1.3rem] leading-[1.08] font-black uppercase tracking-tight text-foreground">
                                  {taskTitle}
                                </h3>

                                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                  <span className="text-[0.78rem] font-black uppercase tracking-tight text-foreground/65">
                                    {actionLabel}
                                  </span>

                                  {updateDetails && (
                                    <span className="text-[0.62rem] font-bold lowercase italic text-muted-foreground">
                                      {updateDetails}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <span className="shrink-0 rounded-full border-2 border-border bg-[#121212] px-2 py-0.5 text-[0.58rem] font-black uppercase text-white">
                                {formatClock(log?.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-2.5 flex items-center justify-between border-t-[3px] border-dashed border-border/15 pt-2">
                          <p className="text-[0.62rem] font-black uppercase text-muted-foreground/60">
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
                                `/tasks/${log.entityId}?from=audit&returnTo=%2Factivities`,
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
                    );
                  })}
                </div>
              </div>

              <div className="hidden lg:grid lg:grid-cols-2 lg:gap-3">
                {group.items.map((log, index) => {
                  const actionLabel =
                    actionLabelMap[log?.action] || log?.action || "Hành động";
                  const actionMarkerTone =
                    actionMarkerToneMap[log?.action] ||
                    "bg-[#ffd400] text-foreground";
                  const taskTitle = resolveTaskTitle(log);
                  const ActionIcon =
                    actionIconMap[log?.action] || CheckCircle2Icon;
                  const updateDetails = getUpdateDetails(log);

                  return (
                    <article
                      key={`desktop-${log?._id || `${log?.entityId}-${log?.createdAt}`}`}
                      className="rounded-[1.4rem] border-[3px] border-border bg-background px-4 py-3.5 comic-shadow desktop-hover-lift"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-start gap-3.5">
                          <div
                            className={cn(
                              "inline-flex size-12 shrink-0 items-center justify-center rounded-[1rem] border-[3px] border-border comic-shadow",
                              actionMarkerTone,
                            )}
                          >
                            <ActionIcon className="size-6" />
                          </div>

                          <div className="min-w-0 flex-1 space-y-1.5">
                            <p className="pt-0.5 text-[0.62rem] leading-none font-black uppercase tracking-widest text-muted-foreground/50">
                              Bạn đã
                            </p>

                            <h3 className="whitespace-normal wrap-break-word text-[1.85rem] leading-[1.02] font-black uppercase tracking-tight text-foreground">
                              {taskTitle}
                            </h3>

                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[0.84rem] font-black uppercase tracking-tight text-foreground/65">
                                {actionLabel}
                              </span>

                              {updateDetails && (
                                <span className="rounded bg-muted/30 px-1.5 py-0.5 text-[0.62rem] font-bold lowercase italic text-muted-foreground">
                                  {updateDetails}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border-[3px] border-border bg-[#121212] px-2.5 text-[0.62rem] font-black uppercase tracking-wide text-white">
                          <span>Mốc {String(index + 1).padStart(2, "0")}</span>
                          <span className="text-white/60">•</span>
                          <span>{formatClock(log?.createdAt)}</span>
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t-[3px] border-dashed border-border/15 pt-2.5">
                        <p className="text-[0.68rem] font-black uppercase text-muted-foreground/60">
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
                               `/tasks/${log.entityId}?from=audit&returnTo=%2Factivities`,
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
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {!isLoading && !errorMessage && pagination.totalPages > 1 && (
        <div className="flex justify-end">
          <div className="w-full overflow-x-auto px-1 pt-1 pb-2 scrollbar-hide">
            <div className="ml-auto flex w-max min-w-full items-center justify-end gap-2.5 pr-2">
              <span className="shrink-0 text-[0.68rem] font-black uppercase tracking-wide text-muted-foreground">
                Tổng {pagination.total} logs
              </span>

              <Pagination className="w-auto shrink-0">
                <PaginationContent className="justify-end">
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => updatePageInQuery(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                    />
                  </PaginationItem>

                  {(() => {
                    let hasRenderedJumpControl = false;

                    return visiblePages.flatMap((pageNumber, index) => {
                      const previousPage = visiblePages[index - 1];
                      const hasGap =
                        index > 0 &&
                        typeof previousPage === "number" &&
                        pageNumber - previousPage > 1;

                      const items = [];

                      if (hasGap) {
                        if (!hasRenderedJumpControl) {
                          hasRenderedJumpControl = true;
                          items.push(
                            <PaginationItem
                              key={`audit-gap-jump-${pageNumber}`}
                            >
                              {isJumpInputVisible ? (
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  maxLength={
                                    String(pagination.totalPages).length
                                  }
                                  value={pageInput}
                                  onChange={handlePageInputChange}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      handleJumpToPage();
                                    }
                                  }}
                                  onBlur={() => {
                                    if (!pageInput) {
                                      setIsJumpInputVisible(false);
                                      return;
                                    }

                                    handleJumpToPage();
                                  }}
                                  className="h-7 w-12 border-[3px] border-border bg-card px-1 text-center text-[0.68rem] font-black uppercase shadow-none"
                                  aria-label="Nhập trang cần chuyển"
                                  autoFocus
                                />
                              ) : (
                                <PaginationLink
                                  onClick={() => {
                                    setIsJumpInputVisible(true);
                                    setPageInput("");
                                  }}
                                  aria-label="Mở nhập số trang"
                                >
                                  ...
                                </PaginationLink>
                              )}
                            </PaginationItem>,
                          );
                        } else {
                          items.push(
                            <PaginationItem key={`audit-gap-${pageNumber}`}>
                              <PaginationLink disabled aria-hidden>
                                ...
                              </PaginationLink>
                            </PaginationItem>,
                          );
                        }
                      }

                      items.push(
                        <PaginationItem key={`audit-page-${pageNumber}`}>
                          <PaginationLink
                            isActive={pageNumber === pagination.page}
                            onClick={() => updatePageInQuery(pageNumber)}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>,
                      );

                      return items;
                    });
                  })()}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => updatePageInQuery(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
