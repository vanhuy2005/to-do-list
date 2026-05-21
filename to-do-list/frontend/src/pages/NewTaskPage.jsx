import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Loader2Icon,
  PlusIcon,
  SparklesIcon,
  XIcon,
  ChevronDownIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import DeadlinePicker from "@/components/DeadlinePicker";
import TaskPreviewCard from "@/components/TaskPreviewCard";
import TaskModalShell from "@/components/TaskModalShell";
import TaskModalTopBar from "@/components/TaskModalTopBar";
import VoiceMicButton from "@/components/VoiceMicButton";
import { cn } from "@/lib/utils";
import {
  taskModalFooterClass,
  taskOptionButtonClass,
} from "@/lib/taskModalDesignSystem";
import { taskSchema, taskDefaultValues } from "@/lib/taskSchema";
import taskService from "@/services/taskService";
import projectService from "@/services/projectService";

const statusOptions = [
  { value: "todo", label: "Cần làm" },
  { value: "doing", label: "Đang làm" },
  { value: "done", label: "Hoàn thành" },
];

const priorityOptions = [
  { value: "low", label: "Thấp" },
  { value: "medium", label: "Vừa" },
  { value: "high", label: "Cao" },
];

function FieldLabel({ children, required }) {
  return (
    <label className="block text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
      {children}
      {required && <span className="text-primary"> *</span>}
    </label>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1 text-xs font-bold text-destructive">{message}</p>;
}

/**
 * Collapsible section — hiện/ẩn phần mở rộng với animation.
 * Mặc định ẩn, user click để mở.
 */
function CollapsibleSection({ label, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-1.5 text-left"
      >
        <ChevronDownIcon
          className={cn(
            "size-3.5 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
        <span className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </button>
      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

export default function NewTaskPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVoiceSaving, setIsVoiceSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [voiceDraft, setVoiceDraft] = useState(null);
  const [voiceRawText, setVoiceRawText] = useState("");
  const [voiceUiState, setVoiceUiState] = useState("IDLE");
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [projectError, setProjectError] = useState("");

  // Get projectId from query params or use selected one
  const queryProjectId = searchParams.get("projectId");
  const finalProjectId = queryProjectId || selectedProjectId;

  // Load projects if no projectId in query params
  useEffect(() => {
    if (queryProjectId) {
      setSelectedProjectId(queryProjectId);
      return;
    }

    const loadProjects = async () => {
      setIsLoadingProjects(true);
      setProjectError("");
      try {
        const response = await projectService.getProjects();
        const projectList = response?.data || [];
        if (projectList.length === 0) {
          setProjectError("Bạn chưa có dự án nào. Hãy tạo một dự án trước.");
          return;
        }
        setProjects(projectList);
      } catch (error) {
        setProjectError("Không thể tải danh sách dự án.", error);
      } finally {
        setIsLoadingProjects(false);
      }
    };

    loadProjects();
  }, [queryProjectId]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: taskDefaultValues,
  });

  const watchedTitle = watch("title");
  const watchedStatus = watch("status");
  const watchedPriority = watch("priority");
  const watchedDueDate = watch("dueDate");
  const watchedTags = watch("tags") || [];

  // Progressive: cho phép hiện phần tiếp theo khi title có nội dung
  const hasTitle = (watchedTitle || "").trim().length > 0;

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed || watchedTags.length >= 8) return;
    if (watchedTags.includes(trimmed)) {
      setTagInput("");
      return;
    }
    setValue("tags", [...watchedTags, trimmed]);
    setTagInput("");
  };

  const handleRemoveTag = (index) => {
    setValue(
      "tags",
      watchedTags.filter((_, i) => i !== index),
    );
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const normalizeVoiceDueDate = (dueDate) => {
    if (!dueDate) return undefined;
    const parsed = new Date(dueDate);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed.toISOString();
  };

  const handleVoiceDraftReady = (draft, rawText, uiState) => {
    setVoiceDraft(draft);
    setVoiceRawText(rawText || "");
    setVoiceUiState(uiState || "PREVIEW");
  };

  const resetVoiceDraft = () => {
    setVoiceDraft(null);
    setVoiceRawText("");
    setVoiceUiState("IDLE");
  };

  const handleConfirmVoiceTask = async (draft) => {
    const title = String(draft?.title || "").trim();
    if (!title) {
      toast.error("Lỗi!", { description: "Tiêu đề task không hợp lệ." });
      return;
    }

    if (!finalProjectId) {
      toast.error("Lỗi!", { description: "Vui lòng chọn một dự án." });
      return;
    }

    setIsVoiceSaving(true);
    try {
      const payload = {
        title,
        description: draft?.description?.trim() || undefined,
        status: draft?.status || "todo",
        priority: draft?.priority || "medium",
        dueDate: normalizeVoiceDueDate(draft?.dueDate),
        tags: draft?.tags?.length ? draft.tags : undefined,
        projectId: finalProjectId,
      };

      await taskService.createTask(payload);
      toast.success("Tạo thành công!", {
        description: `Nhiệm vụ "${title}" đã được tạo.`,
      });
      resetVoiceDraft();
      navigate(`/projects/${finalProjectId}`);
    } catch (error) {
      const msg =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        "Không thể tạo task. Vui lòng thử lại.";
      toast.error("Lỗi!", { description: msg });
    } finally {
      setIsVoiceSaving(false);
    }
  };

  const onSubmit = async (data) => {
    if (!finalProjectId) {
      toast.error("Lỗi!", { description: "Vui lòng chọn một dự án." });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: data.title,
        description: data.description || undefined,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate || undefined,
        tags: data.tags?.length > 0 ? data.tags : undefined,
        projectId: finalProjectId,
      };

      await taskService.createTask(payload);
      toast.success("Tạo thành công!", {
        description: `Nhiệm vụ "${data.title}" đã được tạo.`,
      });
      navigate(`/projects/${finalProjectId}`);
    } catch (error) {
      const msg =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        "Không thể tạo task. Vui lòng thử lại.";
      toast.error("Lỗi!", { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TaskModalShell>
      <section className="space-y-5 pb-6">
        <TaskModalTopBar
          title="Thêm công việc"
          onClose={() => navigate("/", { replace: true })}
        />

        {/* Project Selector — hiện nếu chưa có projectId */}
        {!finalProjectId && (
          <div className="space-y-3 rounded-xl border-[3px] border-border bg-card p-4 comic-shadow">
            <div className="space-y-2">
              <p className="text-sm font-black uppercase tracking-wide text-foreground">
                Chọn Dự Án
              </p>
              <p className="text-xs text-muted-foreground">
                Task phải được tạo trong một dự án. Chọn dự án của bạn.
              </p>
            </div>

            {isLoadingProjects && (
              <div className="flex items-center justify-center py-6">
                <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {projectError && (
              <div className="space-y-2">
                <p className="text-sm font-bold text-destructive">
                  {projectError}
                </p>
                <Button
                  onClick={() => navigate("/projects", { replace: true })}
                  size="sm"
                  variant="secondary"
                >
                  Tạo Dự Án
                </Button>
              </div>
            )}

            {!isLoadingProjects && !projectError && projects.length > 0 && (
              <div className="grid gap-2">
                {projects.map((project) => (
                  <button
                    key={project._id}
                    type="button"
                    onClick={() => setSelectedProjectId(project._id)}
                    className={cn(
                      "rounded-lg border-2 p-3 text-left transition-all",
                      selectedProjectId === project._id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-muted/50",
                    )}
                  >
                    <div className="font-bold">{project.name}</div>
                    {project.description && (
                      <div className="text-xs text-muted-foreground">
                        {project.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {finalProjectId && (
          <div className="space-y-3 rounded-xl border-[3px] border-border bg-card p-4 comic-shadow">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black uppercase tracking-wide text-foreground">
                Dự Án Đã Chọn
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedProjectId(null)}
                disabled={!!queryProjectId}
              >
                Đổi
              </Button>
            </div>
            <div className="text-sm font-bold">
              {projects.find((p) => p._id === finalProjectId)?.name ||
                queryProjectId}
            </div>
          </div>
        )}

        <div className="space-y-3 rounded-xl border-[3px] border-border bg-card p-4 comic-shadow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                Voice to Task
              </p>
              <p className="text-sm font-bold text-foreground">
                Nói một câu ngắn để tạo task nhanh.
              </p>
            </div>
            <VoiceMicButton
              onDraftReady={handleVoiceDraftReady}
              disabled={isSubmitting || isVoiceSaving || !finalProjectId}
            />
          </div>

          {voiceDraft ? (
            <TaskPreviewCard
              key={`voice-draft-${voiceRawText || voiceDraft?.title || ""}`}
              task={voiceDraft}
              rawText={voiceRawText}
              uiState={voiceUiState}
              onCancel={resetVoiceDraft}
              onConfirm={handleConfirmVoiceTask}
              isSaving={isVoiceSaving}
            />
          ) : (
            <p className="text-xs font-bold text-muted-foreground">
              Gợi ý: "Nhắc mình gửi báo cáo cho sếp Minh vào sáng thứ 6".
            </p>
          )}
        </div>

        {finalProjectId && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Title — luôn hiển thị */}
            <div className="space-y-1.5">
              <FieldLabel required>Tiêu đề</FieldLabel>
              <Input
                id="task-title"
                placeholder="Tên nhiệm vụ cực ngầu..."
                autoFocus
                {...register("title")}
                aria-invalid={!!errors.title}
              />
              <FieldError message={errors.title?.message} />
            </div>

            {/* Sau khi có title → hiện các section tiếp theo */}
            <div
              className={cn(
                "space-y-4 transition-all duration-300",
                hasTitle
                  ? "opacity-100 max-h-[2000px]"
                  : "pointer-events-none max-h-0 overflow-hidden opacity-0",
              )}
            >
              {/* Status + Priority — single row with labels */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <div className="space-y-1">
                    <FieldLabel>Trạng thái</FieldLabel>
                    <div className="flex gap-1">
                      {statusOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setValue("status", opt.value)}
                          className={cn(
                            taskOptionButtonClass(watchedStatus === opt.value),
                            "h-8 text-[0.58rem] px-2",
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-10 w-px bg-border/40" />

                  <div className="space-y-1">
                    <FieldLabel>Ưu tiên</FieldLabel>
                    <div className="flex gap-1">
                      {priorityOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setValue("priority", opt.value)}
                          className={cn(
                            taskOptionButtonClass(
                              watchedPriority === opt.value,
                            ),
                            "h-8 text-[0.58rem] px-2",
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Due Date — collapsible */}
              <CollapsibleSection
                label="Hạn chót"
                defaultOpen={!!watchedDueDate}
              >
                <DeadlinePicker
                  value={watchedDueDate}
                  onChange={(iso) => setValue("dueDate", iso)}
                  onClear={() => setValue("dueDate", "")}
                />
              </CollapsibleSection>

              {/* Description — collapsible */}
              <CollapsibleSection label="Mô tả chi tiết">
                <Textarea
                  id="task-description"
                  placeholder="Chi tiết kế hoạch giải cứu thế giới..."
                  rows={3}
                  {...register("description")}
                  aria-invalid={!!errors.description}
                />
                <FieldError message={errors.description?.message} />
              </CollapsibleSection>

              {/* Tags — collapsible */}
              <CollapsibleSection label={`Gắn thẻ (Tags) — tối đa 8`}>
                <div className="flex flex-wrap items-center gap-1.5">
                  {watchedTags.map((tag, i) => (
                    <Badge
                      key={`${tag}-${i}`}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(i)}
                        className="ml-0.5 rounded-full hover:bg-destructive/20"
                      >
                        <XIcon className="size-3" />
                      </button>
                    </Badge>
                  ))}

                  {watchedTags.length < 8 && (
                    <div className="flex items-center gap-1">
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        placeholder="Thêm tag..."
                        className="h-7 w-24 text-xs"
                      />
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="secondary"
                        onClick={handleAddTag}
                      >
                        <PlusIcon className="size-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <FieldError message={errors.tags?.message} />
              </CollapsibleSection>
            </div>

            {/* Submit — luôn hiển thị */}
            <div className={cn("-mx-4 -mb-6", taskModalFooterClass)}>
              <Button
                type="submit"
                disabled={isSubmitting || !hasTitle}
                className="w-full gap-2 py-6 text-lg font-black uppercase"
              >
                {isSubmitting ? (
                  <>
                    <Loader2Icon className="size-5 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="size-5" />
                    Tạo mới!
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </section>
    </TaskModalShell>
  );
}
