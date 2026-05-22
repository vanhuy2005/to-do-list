import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  CalendarDaysIcon,
  ClockIcon,
  AlertTriangleIcon,
  Edit3Icon,
  Trash2Icon,
  Share2Icon,
  UserRoundIcon,
  UserXIcon,
} from "lucide-react";

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
import TaskCommentsModal from "@/components/TaskCommentsModal";

const sharePermissionLabel = {
  owner: "Chủ sở hữu",
  view: "Chỉ xem",
  comment: "Nhận xét",
  edit: "Chỉnh sửa",
};

const parseSharesFromPayload = (payload) => {
  if (Array.isArray(payload?.data?.shares)) {
    return payload.data.shares;
  }

  if (Array.isArray(payload?.shares)) {
    return payload.shares;
  }

  return [];
};

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
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [shares, setShares] = useState([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePermission, setSharePermission] = useState("view");
  const [isSharing, setIsSharing] = useState(false);
  const [pendingPermissionUserId, setPendingPermissionUserId] = useState("");
  const [pendingRemoveUserId, setPendingRemoveUserId] = useState("");
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

  const fetchShares = useCallback(async () => {
    if (!id) {
      return;
    }

    setIsLoadingShares(true);
    try {
      const payload = await taskService.getTaskShares(id);
      setShares(parseSharesFromPayload(payload));
    } catch (error) {
      setShares([]);
      const status = error?.response?.status;
      if (status !== 403) {
        const msg =
          error?.response?.data?.error?.message ||
          "Không tải được danh sách chia sẻ.";
        toast.error("Lỗi chia sẻ", { description: msg });
      }
    } finally {
      setIsLoadingShares(false);
    }
  }, [id]);

  useEffect(() => {
    if (!task || openedFromAudit || task.accessLevel !== "owner") {
      setShares([]);
      return;
    }

    fetchShares();
  }, [fetchShares, openedFromAudit, task]);

  const handleShareTask = async () => {
    const email = shareEmail.trim();
    if (!email) {
      toast.error("Thiếu email", {
        description: "Nhập email người bạn muốn chia sẻ.",
      });
      return;
    }

    setIsSharing(true);
    try {
      const payload = await taskService.shareTask(id, {
        email,
        permission: sharePermission,
      });

      setShares(parseSharesFromPayload(payload));
      setShareEmail("");
      toast.success("Đã chia sẻ", {
        description: `Đã cấp quyền ${sharePermissionLabel[sharePermission].toLowerCase()} cho ${email}.`,
      });
    } catch (error) {
      const msg =
        error?.response?.data?.error?.message ||
        "Không thể chia sẻ task lúc này.";
      toast.error("Chia sẻ thất bại", { description: msg });
    } finally {
      setIsSharing(false);
    }
  };

  const handleUpdatePermission = async (collaboratorId, permission) => {
    if (!collaboratorId) {
      return;
    }

    setPendingPermissionUserId(collaboratorId);
    try {
      const payload = await taskService.updateTaskShare(id, collaboratorId, {
        permission,
      });
      setShares(parseSharesFromPayload(payload));
      toast.success("Đã cập nhật quyền", {
        description: `Quyền mới: ${sharePermissionLabel[permission]}.`,
      });
    } catch (error) {
      const msg =
        error?.response?.data?.error?.message ||
        "Không thể cập nhật quyền chia sẻ.";
      toast.error("Cập nhật thất bại", { description: msg });
    } finally {
      setPendingPermissionUserId("");
    }
  };

  const handleRemoveShare = async (collaboratorId) => {
    if (!collaboratorId) {
      return;
    }

    setPendingRemoveUserId(collaboratorId);
    try {
      const payload = await taskService.removeTaskShare(id, collaboratorId);
      setShares(parseSharesFromPayload(payload));
      toast.success("Đã thu hồi quyền", {
        description: "Người dùng này không còn truy cập task.",
      });
    } catch (error) {
      const msg =
        error?.response?.data?.error?.message || "Không thể thu hồi quyền.";
      toast.error("Thu hồi thất bại", { description: msg });
    } finally {
      setPendingRemoveUserId("");
    }
  };

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
  const accessLevel = task.accessLevel || null;
  const canEdit = accessLevel === "owner" || accessLevel === "edit";
  const canDelete = accessLevel === "owner";
  const canManageShares = accessLevel === "owner";

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

        {!isAuditFallback && (
          <div className="space-y-2.5 rounded-xl border-[3px] border-border bg-card p-3 comic-shadow">
            <div className="flex items-center gap-2">
              <Share2Icon className="size-4" />
              <p className="text-xs font-extrabold uppercase text-muted-foreground">
                Quyền truy cập
              </p>
              <Badge className="ml-auto text-xs uppercase" variant="secondary">
                {sharePermissionLabel[accessLevel] || "Không xác định"}
              </Badge>
            </div>

            {!canManageShares && (
              <p className="text-sm font-medium text-muted-foreground">
                Bạn chỉ có quyền{" "}
                {sharePermissionLabel[accessLevel]?.toLowerCase() || "truy cập"}
                . Chỉ chủ sở hữu mới quản lý danh sách chia sẻ.
              </p>
            )}

            {canManageShares && (
              <>
                <div className="grid gap-2 md:grid-cols-[1fr_150px_auto]">
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(event) => setShareEmail(event.target.value)}
                    placeholder="email người nhận quyền"
                    className="h-10 rounded-lg border-[3px] border-border bg-background px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#00C2FF]"
                  />

                  <select
                    value={sharePermission}
                    onChange={(event) => setSharePermission(event.target.value)}
                    className="h-10 rounded-lg border-[3px] border-border bg-background px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#00C2FF]"
                  >
                    <option value="view">Chỉ xem</option>
                    <option value="comment">Nhận xét</option>
                    <option value="edit">Chỉnh sửa</option>
                  </select>

                  <Button
                    type="button"
                    variant="secondary"
                    className="font-bold uppercase"
                    onClick={handleShareTask}
                    disabled={isSharing}
                  >
                    {isSharing ? "Đang cấp quyền..." : "Chia sẻ"}
                  </Button>
                </div>

                <div className="space-y-2">
                  {isLoadingShares ? (
                    <Skeleton className="h-12 w-full rounded-lg" />
                  ) : shares.length === 0 ? (
                    <p className="text-sm font-medium text-muted-foreground">
                      Task này chưa chia sẻ cho ai.
                    </p>
                  ) : (
                     shares.map((share) => {
                       const collaboratorId = share?.userId;
                       const isUpdating =
                         pendingPermissionUserId ===
                         String(collaboratorId || "");
                       const isRemoving =
                         pendingRemoveUserId === String(collaboratorId || "");

                       return (
                         <div
                           key={share.isPending ? `pending-${share.email}` : String(collaboratorId)}
                           className="grid gap-2 rounded-lg border-[3px] border-border bg-background p-2.5 md:grid-cols-[1fr_140px_auto] md:items-center"
                         >
                           {share.isPending ? (
                             <div className="min-w-0">
                               <span className="inline-flex items-center rounded-md bg-[#fff1f2] border border-[#ffcdcf] px-1.5 py-0.5 text-[10px] font-black uppercase text-[#ff3b57] mb-1">
                                 Lời mời đang chờ
                               </span>
                               <p className="truncate text-xs font-bold text-foreground">
                                 Đã gửi lời mời tới <span className="font-extrabold">{share.email}</span>. Đang chờ chấp nhận.
                               </p>
                             </div>
                           ) : (
                             <div className="min-w-0">
                               <p className="truncate text-sm font-black">
                                 {share.displayName || "Người dùng"}
                               </p>
                               <p className="truncate text-xs font-medium text-muted-foreground">
                                 {share.email || "Không có email"}
                               </p>
                             </div>
                           )}

                           <select
                             value={share.permission}
                             onChange={(event) =>
                               handleUpdatePermission(
                                 collaboratorId,
                                 event.target.value,
                               )
                             }
                             disabled={isUpdating || isRemoving || share.isPending}
                             className="h-9 rounded-lg border-[3px] border-border bg-card px-2 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-[#00C2FF]"
                           >
                             <option value="view">Chỉ xem</option>
                             <option value="comment">Nhận xét</option>
                             <option value="edit">Chỉnh sửa</option>
                           </select>

                           <Button
                             type="button"
                             variant="secondary"
                             className="gap-1.5 font-bold uppercase"
                             onClick={() => handleRemoveShare(collaboratorId)}
                             disabled={isRemoving || isUpdating}
                           >
                             {isRemoving ? (
                               "Đang thu hồi..."
                             ) : (
                               <>
                                 <UserXIcon className="size-4" />
                                 Thu hồi
                               </>
                             )}
                           </Button>
                         </div>
                       );
                     })
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer actions */}
        {!isAuditFallback ? (
          <div
            className={cn("-mx-4 grid grid-cols-3 gap-2", taskModalFooterClass)}
          >
            <Button
              type="button"
              variant="secondary"
              className="gap-2 font-bold uppercase"
              onClick={() => setIsCommentsOpen(true)}
            >
              💬 Bình luận
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="gap-2 font-bold uppercase"
              onClick={() => navigate(`/tasks/${id}/edit`)}
              disabled={!canEdit}
            >
              <Edit3Icon className="size-4" />
              {canEdit ? "Sửa" : "Không sửa"}
            </Button>
            <Button
              type="button"
              variant="primary"
              className="gap-2 bg-destructive font-bold uppercase text-destructive-foreground hover:bg-destructive/90"
              onClick={() => setIsDeleteOpen(true)}
              disabled={!canDelete}
            >
              <Trash2Icon className="size-4" />
              {canDelete ? "Xóa" : "Chỉ owner"}
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

        {/* Comments Modal */}
        <TaskCommentsModal
          open={isCommentsOpen}
          onOpenChange={setIsCommentsOpen}
          taskId={id}
          taskTitle={task.title}
        />

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
