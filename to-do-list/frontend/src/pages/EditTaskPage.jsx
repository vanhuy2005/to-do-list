import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Loader2Icon,
  PlusIcon,
  XIcon,
  ZapIcon,
  ChevronDownIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import DeadlinePicker from "@/components/DeadlinePicker";
import TaskModalShell from "@/components/TaskModalShell";
import TaskModalTopBar from "@/components/TaskModalTopBar";
import { cn } from "@/lib/utils";
import {
  taskModalFooterClass,
  taskOptionButtonClass,
} from "@/lib/taskModalDesignSystem";
import { taskSchema } from "@/lib/taskSchema";
import taskService from "@/services/taskService";

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
          isOpen
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

function EditSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="h-32 w-full rounded-lg border-2 border-border/20 bg-muted/30" />
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 flex-1 rounded-lg" />
      </div>
      <Skeleton className="h-20 w-full rounded-lg" />
    </div>
  );
}

export default function EditTaskPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [isLoadingTask, setIsLoadingTask] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      dueDate: "",
      tags: [],
    },
  });

  useEffect(() => {
    register("status");
    register("priority");
    register("dueDate");
    register("tags");
  }, [register]);

  const watchedTitle = watch("title");
  const watchedStatus = watch("status");
  const watchedPriority = watch("priority");
  const watchedDueDate = watch("dueDate");
  const watchedTags = watch("tags") || [];

  const fetchTask = useCallback(async () => {
    setIsLoadingTask(true);
    setLoadError("");
    try {
      const payload = await taskService.getTaskById(id);
      const t = payload?.data || payload;
      reset({
        title: t.title || "",
        description: t.description || "",
        status: t.status || "todo",
        priority: t.priority || "medium",
        dueDate: t.dueDate || "",
        tags: t.tags || [],
      });
    } catch (error) {
      const msg =
        error?.response?.data?.error?.message ||
        "Không thể tải thông tin nhiệm vụ.";
      setLoadError(msg);
    } finally {
      setIsLoadingTask(false);
    }
  }, [id, reset]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

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

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const payload = {
        title: data.title,
        description: data.description || undefined,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate || null,
        tags: data.tags?.length > 0 ? data.tags : undefined,
      };

      await taskService.updateTask(id, payload);
      toast.success("Cập nhật thành công!", {
        description: `Nhiệm vụ "${data.title}" đã được cập nhật.`,
      });
      navigate(`/tasks/${id}`, { replace: true });
    } catch (error) {
      const msg =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        "Không thể cập nhật task. Vui lòng thử lại.";
      toast.error("Lỗi!", { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TaskModalShell closeTo={`/tasks/${id}`}>
      <section className="space-y-5 pb-6">
        <TaskModalTopBar
          title="Chỉnh sửa công việc"
          onClose={() => navigate(`/tasks/${id}`, { replace: true })}
        />

        {isLoadingTask && <EditSkeleton />}

        {!isLoadingTask && loadError && (
          <div className="rounded-lg border-[3px] border-border bg-[#ffe4ec] p-4 comic-shadow">
            <p className="text-sm font-bold">{loadError}</p>
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={fetchTask}
            >
              Thử lại
            </Button>
          </div>
        )}

        {!isLoadingTask && !loadError && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <FieldLabel required>Tiêu đề</FieldLabel>
              <Input
                id="edit-task-title"
                placeholder="Tên nhiệm vụ..."
                {...register("title")}
                aria-invalid={!!errors.title}
              />
              <FieldError message={errors.title?.message} />
            </div>

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
                          taskOptionButtonClass(watchedPriority === opt.value),
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
            <CollapsibleSection label="Hạn chót" defaultOpen={!!watchedDueDate}>
              <DeadlinePicker
                value={watchedDueDate}
                onChange={(iso) => setValue("dueDate", iso, { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
                onClear={() => setValue("dueDate", "", { shouldDirty: true, shouldTouch: true, shouldValidate: true })}
              />
            </CollapsibleSection>

            {/* Description — collapsible */}
            <CollapsibleSection
              label="Mô tả chi tiết"
              defaultOpen={!!watch("description")}
            >
              <Textarea
                id="edit-task-description"
                placeholder="Mô tả nhiệm vụ..."
                rows={3}
                {...register("description")}
                aria-invalid={!!errors.description}
              />
              <FieldError message={errors.description?.message} />
            </CollapsibleSection>

            {/* Tags — collapsible */}
            <CollapsibleSection
              label={`Gắn thẻ (Tags) — tối đa 8`}
              defaultOpen={watchedTags.length > 0}
            >
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

            {/* Submit */}
            <div className={cn("-mx-4 -mb-6", taskModalFooterClass)}>
              <Button
                type="submit"
                disabled={isSubmitting || !watchedTitle}
                className="w-full gap-2 py-6 text-lg font-black uppercase"
              >
                {isSubmitting ? (
                  <>
                    <Loader2Icon className="size-5 animate-spin" />
                    Đang cập nhật...
                  </>
                ) : (
                  <>
                    <ZapIcon className="size-5" />
                    Cập nhật!
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
