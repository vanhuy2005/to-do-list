import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { CalendarDaysIcon, ClockIcon, AlertTriangleIcon, Edit3Icon, Trash2Icon } from "lucide-react";

import useCountdown from "@/hooks/useCountdown";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import TaskModalShell from "@/components/TaskModalShell";
import TaskModalTopBar from "@/components/TaskModalTopBar";
import { cn } from "@/lib/utils";
import { taskModalFooterClass } from "@/lib/taskModalDesignSystem";
import taskService from "@/services/taskService";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";

/* ── colour maps ─────────────────────────────────────────── */
const statusTone = {
  todo: "bg-[#ffe4ec] text-foreground",
  doing: "bg-secondary text-foreground",
  done: "bg-[#d9f99d] text-foreground",
};
const statusLabel = { todo: "Cần làm", doing: "Đang làm", done: "Hoàn thành" };

const priorityTone = {
  low: "bg-card text-foreground",
  medium: "bg-[#ffd400] text-foreground",
  high: "bg-primary text-primary-foreground",
};
const priorityLabel = { low: "Thấp", medium: "Vừa", high: "Cao" };

/* ── skeleton ────────────────────────────────────────────── */
function DetailSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <Skeleton className="h-6 w-28 rounded-md" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="flex gap-2">
        <Skeleton className="h-7 w-24 rounded-md" />
        <Skeleton className="h-7 w-28 rounded-md" />
      </div>
      <Skeleton className="h-6 w-40 rounded-md" />
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  );
}

/* ── due date detail component ───────────────────────────── */
function DueDateDetail({ dueDate, status }) {
  const countdown = useCountdown(dueDate);

  if (!dueDate) {
    return (
      <div className="flex items-center gap-2 rounded-lg border-[3px] border-border bg-card px-3 py-2.5 comic-shadow">
        <CalendarDaysIcon className="size-4 text-muted-foreground" />
        <span className="text-xs font-extrabold uppercase text-muted-foreground">
          Hạn chót công việc
        </span>
        <span className="ml-auto text-sm font-black text-muted-foreground">
          Chưa đặt
        </span>
      </div>
    );
  }

  const dateObj = new Date(dueDate);
  const dateText = dateObj.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const timeText = dateObj.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const isDone = status === "done";

  return (
    <div className="space-y-2">
      {/* Row 1: Exact date+time */}
      <div className="flex items-center gap-2 rounded-lg border-[3px] border-border bg-card px-3 py-2.5 comic-shadow">
        <CalendarDaysIcon className="size-4 text-muted-foreground" />
        <span className="text-xs font-extrabold uppercase text-muted-foreground">
          Hạn chót
        </span>
        <span className="ml-auto text-sm font-black">
          {dateText} lúc {timeText}
        </span>
      </div>

      {/* Row 2: Countdown / Overdue warning */}
      {!isDone && countdown.label && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border-[3px] border-border px-3 py-2.5 comic-shadow",
            countdown.isOverdue
              ? "bg-[#ff3b57]/10 border-[#ff3b57]"
              : "bg-[#e8f5e9]",
          )}
        >
          {countdown.isOverdue ? (
            <AlertTriangleIcon className="size-4 text-[#ff3b57]" />
          ) : (
            <ClockIcon className="size-4 text-[#2e7d32]" />
          )}
          <span
            className={cn(
              "text-sm font-black uppercase",
              countdown.isOverdue ? "text-[#ff3b57]" : "text-[#2e7d32]",
            )}
          >
            {countdown.label}
          </span>
        </div>
      )}

      {isDone && (
        <div className="flex items-center gap-2 rounded-lg border-[3px] border-border bg-[#d9f99d] px-3 py-2.5 comic-shadow">
          <ClockIcon className="size-4 text-[#2e7d32]" />
          <span className="text-sm font-black uppercase text-[#2e7d32]">
            Đã hoàn thành ✓
          </span>
        </div>
      )}
    </div>
  );
}

/* ── page ────────────────────────────────────────────────── */
export default function TaskDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);

  const [task, setTask] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const auditLog = location.state?.auditLog || null;
  const closeTo =
    location.state?.returnTo || searchParams.get("returnTo") || "/";
  const openedFromAudit = auditLog || searchParams.get("from") === "audit";

  const auditFallbackTask = auditLog
    ? {
        _id: auditLog.entityId || id,
        title:
          auditLog.summaryAfter?.title ||
          auditLog.summaryBefore?.title ||
          "Nhiệm vụ không có tiêu đề",
        description:
          auditLog.summaryAfter?.description ||
          auditLog.summaryBefore?.description ||
          "",
        status:
          auditLog.summaryAfter?.status ||
          auditLog.summaryBefore?.status ||
          "todo",
        priority:
          auditLog.summaryAfter?.priority ||
          auditLog.summaryBefore?.priority ||
          "medium",
        dueDate:
          auditLog.summaryAfter?.dueDate ||
          auditLog.summaryBefore?.dueDate ||
          null,
        tags: auditLog.summaryAfter?.tags || auditLog.summaryBefore?.tags || [],
      }
    : null;

  const fetchTask = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const payload = await taskService.getTaskById(id);
      const taskData = payload?.data || payload;
      setTask(taskData);
    } catch (error) {
      const msg =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        "Không thể tải thông tin nhiệm vụ.";
      if (auditFallbackTask) {
        setTask(auditFallbackTask);
        setErrorMessage("");
        return;
      }

      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await taskService.deleteTask(id);
      toast.success("Đã xóa!", {
        description: "Nhiệm vụ đã được chuyển vào thùng rác.",
      });
      navigate("/");
    } catch (error) {
      const msg =
        error?.response?.data?.error?.message ||
        "Không thể xóa nhiệm vụ. Vui lòng thử lại.";
      toast.error("Lỗi!", { description: msg });
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  const handleCloseDetail = () => {
    if (openedFromAudit) {
      window.location.replace(closeTo);
      return;
    }

    navigate(closeTo, { replace: true });
  };

  /* ── render states ─────────────────────────────────────── */
  if (isLoading) {
    return (
      <TaskModalShell closeTo={closeTo} forceCloseTo>
        <section className="space-y-5 pb-6">
          <TaskModalTopBar
            title="Chi tiết công việc"
            onClose={handleCloseDetail}
          />
          <DetailSkeleton />
        </section>
      </TaskModalShell>
    );
  }

  if (errorMessage) {
    return (
      <TaskModalShell closeTo={closeTo} forceCloseTo>
        <section className="space-y-5 pb-6">
          <TaskModalTopBar title="Lỗi" onClose={handleCloseDetail} />
          <div className="rounded-lg border-[3px] border-border bg-[#ffe4ec] p-4 comic-shadow">
            <p className="text-sm font-bold">{errorMessage}</p>
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={fetchTask}
            >
              Thử lại
            </Button>
          </div>
        </section>
      </TaskModalShell>
    );
  }

  if (!task) return null;

  const statusVal = task.status || "todo";
  const priorityVal = task.priority || "medium";
  const isAuditFallback = !!auditLog;

  return (
    <TaskModalShell closeTo={closeTo} forceCloseTo bodyClassName="pb-0">
      <section className="space-y-5 pb-0">
        <TaskModalTopBar
          title="Chi tiết công việc"
          onClose={handleCloseDetail}
        />

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {task.tags.map((tag, i) => (
              <Badge
                key={`${tag}-${i}`}
                variant="default"
                className="text-xs uppercase"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Title */}
        <h2 className="text-[1.75rem] leading-[1.08] font-black uppercase">
          {task.title || "Nhiệm vụ chưa có tiêu đề"}
        </h2>

        {/* Status + Priority */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={cn("h-7 px-3 text-xs uppercase", statusTone[statusVal])}
          >
            {statusLabel[statusVal]}
          </Badge>
          <Badge
            className={cn(
              "h-7 px-3 text-xs uppercase",
              priorityTone[priorityVal],
            )}
          >
            Ưu tiên: {priorityLabel[priorityVal]}
          </Badge>
        </div>

        {/* Due Date + Countdown */}
        <DueDateDetail dueDate={task.dueDate} status={task.status} />

        {/* Description */}
        {task.description && (
          <div className="space-y-1.5">
            <p className="text-xs font-extrabold uppercase text-muted-foreground">
              Yêu cầu bao gồm:
            </p>
            <div className="rounded-lg border-[3px] border-border bg-card p-3 comic-shadow">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {task.description}
              </p>
            </div>
          </div>
        )}

        {/* Footer actions */}
        {!isAuditFallback ? (
          <div
            className={cn("-mx-4 grid grid-cols-2 gap-2", taskModalFooterClass)}
          >
            <Button
              type="button"
              variant="secondary"
              className="gap-2 font-bold uppercase"
              onClick={() => navigate(`/tasks/${id}/edit`)}
            >
              <Edit3Icon className="size-4" />
              Sửa
            </Button>
            <Button
              type="button"
              variant="primary"
              className="gap-2 bg-destructive font-bold uppercase text-destructive-foreground hover:bg-destructive/90"
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2Icon className="size-4" />
              Xóa công việc
            </Button>
          </div>
        ) : (
          <div className={cn("-mx-4", taskModalFooterClass)}>
            <div className="rounded-xl border-[3px] border-border bg-card p-3 comic-shadow">
              <p className="text-sm font-black uppercase">
                Đây là dữ liệu từ lịch sử hoạt động.
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                Task gốc có thể đã bị xóa, nên chỉ hiển thị thông tin audit log.
              </p>
            </div>
          </div>
        )}

        {/* Delete Dialog */}
        <DeleteConfirmDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
          taskTitle={task.title}
        />
      </section>
    </TaskModalShell>
  );
}
