import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  CalendarIcon,
  Loader2Icon,
  PlusIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import TaskModalShell from "@/components/TaskModalShell";
import TaskModalTopBar from "@/components/TaskModalTopBar";
import { cn } from "@/lib/utils";
import {
  taskModalFooterClass,
  taskOptionButtonClass,
  taskOptionGridClass,
} from "@/lib/taskModalDesignSystem";
import { taskSchema, taskDefaultValues } from "@/lib/taskSchema";
import taskService from "@/services/taskService";

const statusOptions = [
  { value: "todo", label: "Chờ làm" },
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

export default function NewTaskPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);

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

  const watchedStatus = watch("status");
  const watchedPriority = watch("priority");
  const watchedDueDate = watch("dueDate");
  const watchedTags = watch("tags") || [];

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
        dueDate: data.dueDate || undefined,
        tags: data.tags?.length > 0 ? data.tags : undefined,
      };

      await taskService.createTask(payload);
      toast.success("Tạo thành công!", {
        description: `Nhiệm vụ "${data.title}" đã được tạo.`,
      });
      navigate("/");
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <FieldLabel required>Tiêu đề</FieldLabel>
            <Input
              id="task-title"
              placeholder="Tên nhiệm vụ cực ngầu..."
              {...register("title")}
              aria-invalid={!!errors.title}
            />
            <FieldError message={errors.title?.message} />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <FieldLabel>Mô tả chi tiết</FieldLabel>
            <Textarea
              id="task-description"
              placeholder="Chi tiết kế hoạch giải cứu thế giới..."
              rows={4}
              {...register("description")}
              aria-invalid={!!errors.description}
            />
            <FieldError message={errors.description?.message} />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <FieldLabel>Trạng thái</FieldLabel>
            <div className={taskOptionGridClass}>
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValue("status", opt.value)}
                  className={cn(
                    taskOptionButtonClass(watchedStatus === opt.value),
                    "text-[0.78rem] sm:text-xs",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <FieldLabel>Độ ưu tiên</FieldLabel>
            <div className={taskOptionGridClass}>
              {priorityOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValue("priority", opt.value)}
                  className={taskOptionButtonClass(
                    watchedPriority === opt.value,
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <FieldLabel>Hạn chót</FieldLabel>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  className={cn(
                    "w-full justify-start gap-2 bg-card text-left font-semibold",
                    !watchedDueDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="size-4" />
                  {watchedDueDate
                    ? format(new Date(watchedDueDate), "dd/MM/yyyy", {
                        locale: vi,
                      })
                    : "mm/dd/yyyy"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={
                    watchedDueDate ? new Date(watchedDueDate) : undefined
                  }
                  onSelect={(date) => {
                    setValue("dueDate", date ? date.toISOString() : "");
                    setCalendarOpen(false);
                  }}
                  locale={vi}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <FieldLabel>
              Gắn thẻ (Tags){" "}
              <span className="normal-case text-muted-foreground">
                — tối đa 8
              </span>
            </FieldLabel>
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
          </div>

          {/* Submit */}
          <div className={cn("-mx-4 -mb-6", taskModalFooterClass)}>
            <Button
              type="submit"
              disabled={isSubmitting}
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
      </section>
    </TaskModalShell>
  );
}
