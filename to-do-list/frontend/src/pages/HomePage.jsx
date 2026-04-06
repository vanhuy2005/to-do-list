import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import StatusCounter from "@/components/StatusCounter";
import TaskCard from "@/components/TaskCard";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import taskService from "@/services/taskService";

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

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    const searchParams = new URLSearchParams(location.search);
    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const tag = searchParams.get("tag") || undefined;

    try {
      const payload = await taskService.getTasks({
        page: 1,
        limit: 20,
        sort: "updatedAt",
        order: "desc",
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(tag ? { tag } : {}),
      });
      const normalizedTasks = getTasksFromPayload(payload);
      setTasks(normalizedTasks);
    } catch (error) {
      const nextMessage = getErrorMessage(error);
      setErrorMessage(nextMessage);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [location.search]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const counters = useMemo(() => buildStatusCounter(tasks), [tasks]);

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
    <section className="space-y-4 pb-2">
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
          <Link to="/filter">Xem tất cả</Link>
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
        <div className="space-y-3">
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
