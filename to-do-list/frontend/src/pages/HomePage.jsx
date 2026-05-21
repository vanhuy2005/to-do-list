import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import StatusCounter from "@/components/StatusCounter";
import TaskCard from "@/components/TaskCard";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
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
import taskService from "@/services/taskService";

const HOME_PAGE_SIZE = 6;
const PAGE_JUMP_DEBOUNCE_MS = 450;

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

const getPaginationFromPayload = (payload) => {
  const pagination = payload?.data?.pagination;

  if (!pagination) {
    return {
      page: 1,
      limit: HOME_PAGE_SIZE,
      total: 0,
      totalPages: 1,
    };
  }

  return {
    page: Math.max(1, Number.parseInt(pagination.page, 10) || 1),
    limit: Math.max(1, Number.parseInt(pagination.limit, 10) || HOME_PAGE_SIZE),
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

const getErrorMessage = (error) => {
  if (error?.response?.status === 401) {
    return "Bạn cần đăng nhập để xem danh sách công việc.";
  }

  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    "Không thể tải danh sách công việc. Vui lòng thử lại."
  );
};

const buildStatusCounter = (tasks) => {
  return tasks.reduce(
    (accumulator, task) => {
      const status = task?.status;

      if (status === "doing") {
        accumulator.doing += 1;
      } else if (status === "done") {
        accumulator.done += 1;
      } else {
        accumulator.todo += 1;
      }

      return accumulator;
    },
    { todo: 0, doing: 0, done: 0 },
  );
};

function HomeSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: HOME_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pageInput, setPageInput] = useState("");
  const [isJumpInputVisible, setIsJumpInputVisible] = useState(false);

  const currentPage = useMemo(
    () => getPageFromSearch(location.search),
    [location.search],
  );

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

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    const searchParams = new URLSearchParams(location.search);
    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const tag = searchParams.get("tag") || undefined;
    const search = searchParams.get("search") || undefined;

    try {
      const payload = await taskService.getTasks({
        page: currentPage,
        limit: HOME_PAGE_SIZE,
        sort: "updatedAt",
        order: "desc",
        projectId: "null", // Only show tasks without a project
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(tag ? { tag } : {}),
        ...(search ? { search } : {}),
      });

      const nextPagination = getPaginationFromPayload(payload);
      if (currentPage > nextPagination.totalPages) {
        updatePageInQuery(nextPagination.totalPages);
        return;
      }

      const normalizedTasks = getTasksFromPayload(payload);
      setPagination(nextPagination);
      setTasks(normalizedTasks);
    } catch (error) {
      const nextMessage = getErrorMessage(error);
      setErrorMessage(nextMessage);
      setPagination({
        page: currentPage,
        limit: HOME_PAGE_SIZE,
        total: 0,
        totalPages: 1,
      });
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [location.search, currentPage, updatePageInQuery]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const counters = useMemo(() => buildStatusCounter(tasks), [tasks]);
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

  const handleOpenTask = (task) => {
    if (!task?._id) {
      return;
    }

    navigate(`/tasks/${task._id}`);
  };

  const handleEditTask = (task) => {
    if (!task?._id) return;
    navigate(`/tasks/${task._id}/edit`);
  };

  const handleDeleteTask = (task) => {
    setDeleteTarget(task);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?._id) return;
    setIsDeleting(true);
    try {
      await taskService.deleteTask(deleteTarget._id);
      toast.success("Đã xóa!", {
        description: "Nhiệm vụ đã được chuyển vào thùng rác.",
      });
      setDeleteTarget(null);
      fetchTasks();
    } catch (error) {
      const msg =
        error?.response?.data?.error?.message ||
        "Không thể xóa nhiệm vụ. Vui lòng thử lại.";
      toast.error("Lỗi!", { description: msg });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateTask = () => {
    navigate("/tasks/new");
  };

  return (
    <section className="space-y-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <StatusCounter
        todo={counters.todo}
        doing={counters.doing}
        done={counters.done}
      />

      <div className="flex items-center justify-between gap-3 pt-2">
        <h2 className="text-2xl font-black uppercase leading-none">
          Hôm nay làm gì ?
        </h2>

        <Button asChild variant="secondary" size="xs">
          <Link to={`/view-all${location.search}`}>Xem tất cả</Link>
        </Button>
      </div>

      {isLoading && <HomeSkeleton />}

      {!isLoading && errorMessage && (
        <ErrorState message={errorMessage} onRetry={fetchTasks} />
      )}

      {!isLoading && !errorMessage && tasks.length === 0 && (
        <EmptyState
          title="Chưa có task nào"
          description="Tạo công việc đầu tiên để bắt đầu quản lý tiến độ hôm nay."
          ctaLabel="Tạo task mới"
          onCta={handleCreateTask}
        />
      )}

      {!isLoading && !errorMessage && tasks.length > 0 && (
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          {tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onOpen={handleOpenTask}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
            />
          ))}
        </div>
      )}

      {!isLoading && !errorMessage && pagination.total > 0 && (
        <div className="flex justify-end pt-1">
          <div className="w-full">
            {pagination.totalPages > 1 ? (
              <div className="w-full overflow-x-auto px-1 pt-1 pb-2 scrollbar-hide">
                <div className="ml-auto flex w-max min-w-full items-center justify-end gap-2.5 pr-2">
                  <span className="shrink-0 text-[0.68rem] font-black uppercase tracking-wide text-muted-foreground">
                    Tổng {pagination.total} task
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
                                  key={`home-gap-jump-${pageNumber}`}
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
                                <PaginationItem key={`home-gap-${pageNumber}`}>
                                  <PaginationLink disabled aria-hidden>
                                    ...
                                  </PaginationLink>
                                </PaginationItem>,
                              );
                            }
                          }

                          items.push(
                            <PaginationItem key={`home-page-${pageNumber}`}>
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
            ) : (
              <div className="text-right text-[0.68rem] font-black uppercase tracking-wide text-muted-foreground">
                Tổng {pagination.total} task
              </div>
            )}
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        taskTitle={deleteTarget?.title || ""}
      />
    </section>
  );
}
