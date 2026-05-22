import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import KanbanColumn from "@/components/KanbanColumn";
import taskService from "@/services/taskService";
import projectService from "@/services/projectService";
import authService from "@/services/authService";
import ablyService from "@/services/ablyService";
import ProjectMembersModal from "@/components/ProjectMembersModal";
import TaskCommentsModal from "@/components/TaskCommentsModal";
import UserAvatar from "@/components/UserAvatar";
import { toast } from "sonner";
import ProjectIcon from "@/components/ProjectIcon";
import { 
  UsersIcon, 
  PlusIcon, 
  Trash2Icon, 
  ArchiveIcon, 
  LogOutIcon, 
  CrownIcon,
  FolderLockIcon,
  RefreshCwIcon,
  EyeIcon,
  PenToolIcon,
  MessageSquareIcon,
  AlertTriangleIcon,
  GripVerticalIcon,
  CalendarDaysIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const STATUS_ORDER = ["todo", "doing", "done"];
const PRIORITY_BORDER_OVERLAY = {
  high: "border-l-[#ff3b57]",
  medium: "border-l-[#ffd400]",
  low: "border-l-[#84e11f]",
};

// Helper for parsing short dates
const formatShortDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
};

function DragOverlayCard({ task }) {
  if (!task) return null;
  const priorityValue = task.priority || "medium";
  const borderClass = PRIORITY_BORDER_OVERLAY[priorityValue] || PRIORITY_BORDER_OVERLAY.medium;

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
      <span className="inline-flex flex-shrink-0 items-center gap-0.5 text-[0.6rem] font-bold text-muted-foreground whitespace-nowrap">
        <CalendarDaysIcon className="size-2 flex-shrink-0" />
        {task.dueDate ? formatShortDate(task.dueDate) : "CHƯA CÓ HẠN"}
      </span>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Project & Task States
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Collaborative & Presence States
  const [onlineMembers, setOnlineMembers] = useState([]);
  const [membersOpen, setMembersOpen] = useState(false);
  const [expandedStatus, setExpandedStatus] = useState("");
  const [activeDragTask, setActiveDragTask] = useState(null);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentTaskId, setCommentTaskId] = useState(null);
  const [commentTaskTitle, setCommentTaskTitle] = useState("");

  const handleOpenComments = (task) => {
    setCommentTaskId(task._id);
    setCommentTaskTitle(task.title);
    setCommentsOpen(true);
  };

  const currentUser = authService.getUser();
  const currentUserId = currentUser?._id || currentUser?.id;

  // Determine permissions
  const myMembership = project?.members?.find((m) => {
    const mId = m.userId?._id || m.userId;
    return mId === currentUserId;
  });
  
  const myRole = myMembership?.role || (project?.ownerId === currentUserId ? "owner" : "viewer");
  const isOwner = project?.ownerId?._id === currentUserId || project?.ownerId === currentUserId;
  const canEdit = isOwner || myRole === "editor";
  const canComment = canEdit || myRole === "comment";
  const canManage = isOwner || myRole === "editor";

  // DnD Sensors
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  // Fetch Project & Tasks
  const fetchProject = useCallback(async () => {
    const shouldShowFullLoading = !project || project._id !== id;
    if (shouldShowFullLoading) {
      setIsLoading(true);
    }
    try {
      const p = await projectService.getProject(id);
      setProject(p?.data || p);
      
      const response = await taskService.getTasks({
        page: 1,
        limit: 100,
        projectId: id,
      });

      let tasksList = [];
      if (Array.isArray(response?.data?.tasks)) {
        tasksList = response.data.tasks;
      } else if (Array.isArray(response?.data)) {
        tasksList = response.data;
      } else if (Array.isArray(response?.tasks)) {
        tasksList = response.tasks;
      }
      setTasks(tasksList);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải thông tin dự án.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // Real-time synchronization subscription via Ably
  useEffect(() => {
    if (!id) return;

    console.log(`Subscribing to Ably for project: ${id}`);
    
    const channel = ablyService.subscribeToProject(id, {
      onTaskCreated: (data) => {
        const newTask = data.task;
        if (!newTask) return;
        setTasks((prev) => {
          if (prev.some((t) => t._id === newTask._id)) return prev;
          return [...prev, newTask];
        });
        toast.info(`Nhiệm vụ mới được tạo: "${newTask.title}"`);
      },
      onTaskUpdated: (data) => {
        const updatedTask = data.task;
        if (!updatedTask) return;
        setTasks((prev) => prev.map((t) => (t._id === updatedTask._id ? updatedTask : t)));
      },
      onTaskDeleted: (data) => {
        const deletedTaskId = data.taskId;
        if (!deletedTaskId) return;
        setTasks((prev) => prev.filter((t) => t._id !== deletedTaskId));
      },
      onPresenceUpdate: (members) => {
        console.log("Realtime Online Members updated:", members);
        setOnlineMembers(members);
      },
    });

    return () => {
      ablyService.unsubscribeFromProject(id);
    };
  }, [id]);

  // Group tasks by status for columns
  const tasksByStatus = useMemo(() => {
    const grouped = { todo: [], doing: [], done: [] };
    for (const task of tasks) {
      const status = task.status || "todo";
      if (grouped[status]) {
        grouped[status].push(task);
      } else {
        grouped.todo.push(task);
      }
    }
    return grouped;
  }, [tasks]);

  const handleOpenTask = useCallback(
    (task) => {
      if (!task?._id) return;
      navigate(`/tasks/${task._id}`, {
        state: { returnTo: `/projects/${id}` },
      });
    },
    [navigate, id],
  );

  // --- Actions ---

  const handleLeaveProject = async () => {
    setIsLeaving(true);
    try {
      await projectService.leaveProject(id);
      toast.success("Bạn đã rời khỏi dự án.");
      navigate("/projects");
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Rời dự án thất bại.");
    } finally {
      setIsLeaving(false);
    }
  };

  const handleDeleteProject = async () => {
    setIsDeleting(true);
    try {
      await projectService.deleteProject(id);
      toast.success("Dự án đã được đưa vào thùng rác.");
      navigate("/projects");
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Xóa dự án thất bại.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchiveProject = async () => {
    const isArchived = project?.status === "archived";
    try {
      if (isArchived) {
        await projectService.unarchiveProject(id);
        toast.success("Đã mở lưu trữ dự án thành công!");
      } else {
        await projectService.archiveProject(id);
        toast.success("Đã đưa dự án vào lưu trữ!");
      }
      fetchProject();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Thao tác thất bại.");
    }
  };

  // --- Drag & Drop Handlers ---

  const handleDragStart = useCallback(
    (event) => {
      if (!canEdit) {
        toast.warning("Bạn không có quyền chỉnh sửa (Editor/Owner) để di chuyển task!");
        return;
      }
      const taskId = event.active.id;
      const draggedTask = tasks.find((t) => t._id === taskId);
      setActiveDragTask(draggedTask || null);
    },
    [tasks, canEdit],
  );

  const handleDragEnd = useCallback(
    async (event) => {
      setActiveDragTask(null);
      if (!canEdit) return;

      const { active, over } = event;
      if (!over || !active) return;

      const taskId = active.id;
      const newStatus = over.id;

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
      } catch {
        // Rollback on failure
        setTasks((prev) =>
          prev.map((t) =>
            t._id === taskId ? { ...t, status: previousStatus } : t,
          ),
        );
        toast.error("Lỗi đồng bộ!", {
          description: "Không thể kéo thả. Vui lòng kiểm tra lại kết nối.",
        });
      }
    },
    [tasks, canEdit],
  );

  const handleDragCancel = useCallback(() => {
    setActiveDragTask(null);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="border-4 border-border rounded-[2.5rem] bg-card p-6 comic-shadow flex flex-col md:flex-row justify-between gap-6">
          <div className="flex items-center gap-3 w-full">
            <Skeleton className="size-14 rounded-2xl shrink-0" />
            <div className="space-y-2 w-full max-w-sm">
              <Skeleton className="h-8 w-3/4 rounded-md" />
              <Skeleton className="h-4 w-1/2 rounded-md" />
            </div>
          </div>
          <div className="flex gap-2 self-start md:self-auto shrink-0">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-24 rounded-xl" />
          </div>
        </div>

        {/* Board Skeleton */}
        <div className="space-y-4 md:flex md:items-start md:gap-4 md:space-y-0">
          {["todo", "doing", "done"].map((col) => (
            <div key={col} className="w-full md:w-1/3 border-[3px] border-border rounded-[1.8rem] bg-card p-4 comic-shadow space-y-4 min-h-[350px]">
              <div className="flex justify-between items-center pb-2 border-b-2 border-border/10">
                <Skeleton className="h-6 w-24 rounded-md" />
                <Skeleton className="h-6 w-8 rounded-full" />
              </div>
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="border-[3px] border-border rounded-xl bg-[#fffaf0] p-3 comic-shadow space-y-2">
                    <Skeleton className="h-4 w-3/4 rounded-md" />
                    <Skeleton className="h-3 w-1/2 rounded-md" />
                    <div className="flex justify-between items-center pt-2">
                      <Skeleton className="h-4 w-10 rounded-full" />
                      <Skeleton className="h-4 w-14 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="rounded-[2rem] border-4 border-border bg-[#fff1f2] p-8 text-center comic-shadow max-w-xl mx-auto mt-12">
        <AlertTriangleIcon className="size-16 text-[#ff3b57] mx-auto rotate-12" />
        <h2 className="text-2xl font-black uppercase text-foreground mt-4">Không tìm thấy dự án</h2>
        <p className="text-sm font-bold text-muted-foreground mt-2 uppercase">
          Bạn không có quyền truy cập dự án này hoặc liên kết không tồn tại.
        </p>
        <Button onClick={() => navigate("/projects")} className="mt-6 uppercase font-black tracking-wider comic-shadow">
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  // Get active role visual details
  const getRoleIcon = (role) => {
    if (role === "owner") return <CrownIcon className="size-3 text-foreground" />;
    if (role === "editor") return <PenToolIcon className="size-3 text-foreground" />;
    if (role === "comment") return <MessageSquareIcon className="size-3 text-foreground" />;
    return <EyeIcon className="size-3 text-foreground" />;
  };

  return (
    <section className="space-y-6 pb-16">
      
      {/* Dynamic Pop Art Workspace Header */}
      <header className="relative border-4 border-border rounded-[2.5rem] bg-[#FFFDF7] p-6 comic-shadow overflow-visible">
        {/* Comic dot grid inside header */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(0,0,0,0.035)_1px,transparent_1px)] bg-[size:16px_16px] rounded-[2.2rem]" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 min-w-0">
            {/* Title & Emoji */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="shrink-0 size-14 flex items-center justify-center rounded-2xl border-[3px] border-border bg-white comic-shadow rotate-[-3deg]">
                <ProjectIcon emoji={project.emoji || "📁"} className="size-8" />
              </span>
              <div className="min-w-0">
                <h1 className="text-[2.2rem] sm:text-[2.6rem] leading-none font-black uppercase text-foreground truncate">
                  {project.name}
                </h1>
                
                {/* User role badge */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge className={cn("border-2 border-border text-[9px] uppercase font-black px-2 py-0.5 shadow-none",
                    isOwner 
                      ? "bg-[#ffd400] text-foreground" 
                      : myRole === "editor" 
                        ? "bg-[#00C2FF] text-white" 
                        : "bg-[#e2e8f0] text-muted-foreground"
                  )}>
                    <span className="flex items-center gap-1">
                      {getRoleIcon(myRole)}
                      Quyền: {isOwner ? "Chủ dự án" : myRole}
                    </span>
                  </Badge>

                  {project.status === "archived" && (
                    <Badge className="border-2 border-border text-[9px] uppercase font-black px-2 py-0.5 bg-[#ff3b57] text-white">
                      Đã lưu trữ
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {project.description && (
              <p className="text-sm font-bold text-muted-foreground uppercase max-w-2xl pl-1">
                {project.description}
              </p>
            )}

            {/* REAL-TIME COLLABORATORS AVATAR STACK (T-FE-02) */}
            <div className="flex flex-col gap-2 pt-2 pl-1">
              <div className="text-[9px] font-black uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#7de228] animate-ping" />
                Đang trực tuyến ({onlineMembers.length})
              </div>
              <div className="flex -space-x-3 items-center overflow-visible">
                {onlineMembers.map((m, idx) => (
                  <div key={m.connectionId || idx} className="group relative">
                    <UserAvatar
                      avatarUrl={m.avatarUrl}
                      displayName={m.displayName}
                      email={m.email}
                      sizeClassName="size-10"
                      className="border-[3px] hover:z-20 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                    />
                    {/* Active pulsing green dot */}
                    <span className="absolute bottom-0 right-0 size-3 rounded-full bg-[#7de228] border-2 border-border z-30" />

                    {/* Pop Art Custom Tooltip on Hover */}
                    <div className="absolute top-12 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all duration-200 z-50 pointer-events-none rounded-xl border-2 border-border bg-white p-2 text-center text-[10px] font-black text-foreground comic-shadow w-44">
                      <div className="uppercase line-clamp-1">{m.displayName}</div>
                      <div className="text-[8px] font-bold text-muted-foreground line-clamp-1">{m.email}</div>
                    </div>
                  </div>
                ))}
                {onlineMembers.length === 0 && (
                  <span className="text-xs font-bold text-muted-foreground pl-1">Chỉ có bạn trực tuyến</span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons controls (T-FE-04) */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0 z-20">
            {canManage && (
              <Button
                onClick={() => setMembersOpen(true)}
                className="h-10 rounded-xl border-[3px] border-border bg-[#ffd400] text-foreground font-black uppercase text-xs comic-shadow hover:bg-[#ffd400]/95"
              >
                <UsersIcon className="size-4 mr-1" />
                Thành viên
              </Button>
            )}

            {canEdit && (
              <Button
                onClick={() => navigate(`/tasks/new?projectId=${id}`)}
                className="h-10 rounded-xl border-[3px] border-border bg-[#00C2FF] text-white font-black uppercase text-xs comic-shadow"
              >
                <PlusIcon className="size-4 mr-1" />
                Tạo task
              </Button>
            )}

            {/* Archive / Delete for Owner */}
            {isOwner && (
              <>
                <Button
                  variant="secondary"
                  onClick={handleArchiveProject}
                  className="h-10 rounded-xl border-[3px] border-border bg-white text-foreground font-black uppercase text-xs comic-shadow"
                >
                  <ArchiveIcon className="size-4 mr-1" />
                  {project.status === "archived" ? "Mở lưu" : "Lưu trữ"}
                </Button>
                <Button
                  variant="secondary"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteConfirm(true)}
                  className="h-10 rounded-xl border-[3px] border-border bg-[#ff3b57] text-white font-black uppercase text-xs comic-shadow hover:bg-[#ff3b57]/90"
                >
                  <Trash2Icon className="size-4 mr-1" />
                  {isDeleting ? "Đang xóa..." : "Xóa"}
                </Button>
              </>
            )}

            {/* Leave project for regular member */}
            {!isOwner && (
              <Button
                variant="secondary"
                disabled={isLeaving}
                onClick={() => setShowLeaveConfirm(true)}
                className="h-10 rounded-xl border-[3px] border-border bg-[#ff3b57] text-white font-black uppercase text-xs comic-shadow hover:bg-[#ff3b57]/90"
              >
                <LogOutIcon className="size-4 mr-1" />
                {isLeaving ? "Đang rời..." : "Rời nhóm"}
              </Button>
            )}
            
            <Button
              size="icon"
              variant="secondary"
              onClick={fetchProject}
              className="h-10 w-10 rounded-xl border-[3px] border-border bg-white text-foreground font-black comic-shadow"
            >
              <RefreshCwIcon className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Real-time Synced Kanban Board with DnD support */}
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
              onOpenComments={handleOpenComments}
            />
          ))}
        </div>

        {/* Drag overlay ghost card */}
        <DragOverlay dropAnimation={null}>
          <DragOverlayCard task={activeDragTask} />
        </DragOverlay>
      </DndContext>

      {/* Members & Invite Management Modal */}
      <ProjectMembersModal
        open={membersOpen}
        onOpenChange={setMembersOpen}
        project={project}
        onMembersUpdated={fetchProject}
      />

      {/* Leave Project Confirmation Dialog */}
      <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="bg-[#ff3b57]">
            <DialogTitle className="uppercase text-white">Xác nhận rời dự án</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2 text-foreground font-bold">
            <p>Bạn có chắc chắn muốn rời khỏi dự án này không?</p>
            <p className="text-xs text-muted-foreground uppercase">
              ⚠️ CẢNH BÁO: BẠN SẼ MẤT TOÀN BỘ QUYỀN TRUY CẬP VÀO KHÔNG GIAN VÀ CÁC NHIỆM VỤ LIÊN QUAN!
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={isLeaving}
              onClick={() => setShowLeaveConfirm(false)}
              className="border-[3px] border-border bg-white text-foreground comic-shadow font-black uppercase text-xs h-11"
            >
              Hủy
            </Button>
            <Button
              disabled={isLeaving}
              onClick={async () => {
                setShowLeaveConfirm(false);
                await handleLeaveProject();
              }}
              className="border-[3px] border-border bg-[#ff3b57] text-white comic-shadow font-black uppercase text-xs h-11 hover:bg-[#ff3b57]/90"
            >
              {isLeaving ? "Đang rời..." : "Xác nhận rời"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="bg-[#ff3b57]">
            <DialogTitle className="uppercase text-white">Xác nhận xóa dự án</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2 text-foreground font-bold">
            <p>Bạn có chắc chắn muốn xóa dự án này không?</p>
            <p className="text-xs text-muted-foreground uppercase">
              ⚠️ CẢNH BÁO CHỦ SỞ HỮU: TẤT CẢ CÁC NHIỆM VỤ CON CỦA DỰ ÁN CŨNG SẼ BỊ ẨN ĐI VÀ LƯU VÀO THÙNG RÁC.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={isDeleting}
              onClick={() => setShowDeleteConfirm(false)}
              className="border-[3px] border-border bg-white text-foreground comic-shadow font-black uppercase text-xs h-11"
            >
              Hủy
            </Button>
            <Button
              disabled={isDeleting}
              onClick={async () => {
                setShowDeleteConfirm(false);
                await handleDeleteProject();
              }}
              className="border-[3px] border-border bg-[#ff3b57] text-white comic-shadow font-black uppercase text-xs h-11 hover:bg-[#ff3b57]/90"
            >
              {isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskCommentsModal
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        taskId={commentTaskId}
        taskTitle={commentTaskTitle}
      />
    </section>
  );
}
