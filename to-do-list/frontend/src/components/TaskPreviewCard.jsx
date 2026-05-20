import { useState, useEffect } from "react";
import {
  CalendarIcon,
  FileTextIcon,
  PencilIcon,
  PlusIcon,
  TagIcon,
  XIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import DeadlinePicker from "@/components/DeadlinePicker";
import { cn } from "@/lib/utils";
import { taskOptionButtonClass } from "@/lib/taskModalDesignSystem";

// ─── Option constants ─────────────────────────────────────────────────────────

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

const priorityLabel = { high: "Cao", medium: "Vừa", low: "Thấp" };

// ─── Component ────────────────────────────────────────────────────────────────

export default function TaskPreviewCard({
  task,
  rawText,
  uiState = "PREVIEW",
  onConfirm,
  onCancel,
  isSaving = false,
}) {
  const [editMode, setEditMode] = useState(false);
  const [userEditedFields, setUserEditedFields] = useState(new Set());

  // Draft state — mirrors the full task schema
  const [draft, setDraft] = useState(() => ({
    title: task?.title || "",
    description: task?.description || "",
    status: task?.status || "todo",
    priority: task?.priority || "medium",
    dueDate: task?.dueDate || "",
    tags: Array.isArray(task?.tags) ? [...task.tags] : [],
  }));

  // Sync draft from task when AI enrichment updates the task prop
  useEffect(() => {
    if (task) {
      setDraft(prev => {
        const next = { ...prev };
        // Only update fields that the user hasn't touched yet
        if (!userEditedFields.has("title")) next.title = task.title || prev.title;
        if (!userEditedFields.has("description")) next.description = task.description || prev.description;
        if (!userEditedFields.has("status")) next.status = task.status || prev.status;
        if (!userEditedFields.has("priority")) next.priority = task.priority || prev.priority;
        if (!userEditedFields.has("dueDate")) next.dueDate = task.dueDate || prev.dueDate;
        if (!userEditedFields.has("tags") && Array.isArray(task.tags)) next.tags = [...task.tags];
        return next;
      });
    }
  }, [task, userEditedFields]);

  const [tagInput, setTagInput] = useState("");

  if (!task) return null;

  // ── Draft updaters ──────────────────────────────────────────────────────

  const updateDraft = (field, value) => {
    setUserEditedFields(prev => new Set(prev).add(field));
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed || draft.tags.length >= 8) return;
    if (draft.tags.includes(trimmed)) {
      setTagInput("");
      return;
    }
    updateDraft("tags", [...draft.tags, trimmed]);
    setTagInput("");
  };

  const handleRemoveTag = (index) =>
    updateDraft(
      "tags",
      draft.tags.filter((_, i) => i !== index),
    );

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  // ── Actions ─────────────────────────────────────────────────────────────

  const handleToggleEdit = () => {
    setEditMode((prev) => !prev);
  };

  const handleConfirm = () => {
    const finalDraft = editMode ? draft : draft; // draft is already synced or edited
    const title = (finalDraft.title || "").trim();
    if (!title) return;
    onConfirm?.({
      ...finalDraft,
      title,
    });
  };

  // ── Helper for Skeletons ────────────────────────────────────────────────

  const isEnriching = uiState === "ENRICHING";

  function Enrichable({ field, isLoading, render, skeletonWidth = "w-24" }) {
    // If AI is enriching AND the value is still null/empty, show skeleton
    const isEmpty = !draft[field] || (Array.isArray(draft[field]) && draft[field].length === 0);
    if (isLoading && isEmpty && !userEditedFields.has(field)) {
      return <Skeleton className={cn("h-6 rounded-full", skeletonWidth)} />;
    }
    return render(draft[field]);
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <Card className="border-4 comic-shadow">
      {/* Header — AI Draft badge + raw transcript */}
      <CardHeader className="gap-2 bg-secondary/10 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="h-6 rounded-full bg-secondary text-[10px] uppercase font-black text-foreground">
            {isEnriching ? "AI is thinking..." : "AI Draft"}
          </Badge>
          <span className="text-xs font-bold text-muted-foreground italic">
            "{rawText}"
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {editMode ? (
          /* ── EDIT MODE: Full task form ──────────────────────────────── */
          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1">
              <label className="text-[0.65rem] font-extrabold uppercase tracking-wide text-muted-foreground">
                Tiêu đề <span className="text-primary">*</span>
              </label>
              <Input
                value={draft.title}
                onChange={(e) => updateDraft("title", e.target.value)}
                className="h-10 text-base font-bold"
                placeholder="Tên nhiệm vụ..."
                autoFocus
              />
            </div>

            {/* Status + Priority row */}
            <div className="flex items-start gap-3">
              <div className="space-y-1 flex-1">
                <label className="text-[0.65rem] font-extrabold uppercase tracking-wide text-muted-foreground">
                  Trạng thái
                </label>
                <div className="flex gap-1">
                  {statusOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateDraft("status", opt.value)}
                      className={cn(
                        taskOptionButtonClass(draft.status === opt.value),
                        "h-8 text-[0.55rem] px-1.5",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 flex-1">
                <label className="text-[0.65rem] font-extrabold uppercase tracking-wide text-muted-foreground">
                  Ưu tiên
                </label>
                <div className="flex gap-1">
                  {priorityOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateDraft("priority", opt.value)}
                      className={cn(
                        taskOptionButtonClass(draft.priority === opt.value),
                        "h-8 text-[0.55rem] px-1.5",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-1">
              <label className="text-[0.65rem] font-extrabold uppercase tracking-wide text-muted-foreground">
                Hạn chót
              </label>
              <DeadlinePicker
                value={draft.dueDate}
                onChange={(iso) => updateDraft("dueDate", iso)}
                onClear={() => updateDraft("dueDate", "")}
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-[0.65rem] font-extrabold uppercase tracking-wide text-muted-foreground">
                Mô tả
              </label>
              <Textarea
                value={draft.description}
                onChange={(e) => updateDraft("description", e.target.value)}
                className="text-xs font-bold"
                placeholder="Thêm chi tiết..."
                rows={3}
              />
            </div>
          </div>
        ) : (
          /* ── READ-ONLY MODE: Preview display ───────────────────────── */
          <div className="space-y-3">
            <h3 className="text-lg font-black text-foreground leading-tight">
              {draft.title}
            </h3>

            {/* Description Preview */}
            <Enrichable
              field="description"
              isLoading={isEnriching}
              skeletonWidth="w-full h-10"
              render={(v) => v && (
                <p className="text-xs font-bold text-muted-foreground line-clamp-2 italic">
                  {v}
                </p>
              )}
            />

            {/* Metadata chips with Skeletons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Due date */}
              <Enrichable
                field="dueDate"
                isLoading={isEnriching}
                skeletonWidth="w-32"
                render={(v) => (
                  <span className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border-[3px] border-border px-3 py-1 text-xs font-bold comic-shadow-sm",
                    v ? "bg-background text-foreground" : "bg-muted/30 text-muted-foreground opacity-50"
                  )}>
                    <CalendarIcon className="size-3" />
                    {v ? formatViDate(v) : "Chưa có ngày"}
                  </span>
                )}
              />

              {/* Priority */}
              <Enrichable
                field="priority"
                isLoading={isEnriching}
                skeletonWidth="w-24"
                render={(v) => (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border-[3px] border-border px-3 py-1 text-xs font-bold comic-shadow-sm",
                      v === "high"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground",
                    )}
                  >
                    Ưu tiên: {priorityLabel[v] || "Vừa"}
                  </span>
                )}
              />

              {/* Tags */}
              <Enrichable
                field="tags"
                isLoading={isEnriching}
                skeletonWidth="w-40"
                render={(v) => (
                  <div className="flex flex-wrap gap-1">
                    {v && v.length > 0 ? (
                      v.slice(0, 3).map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] px-2 py-0">
                          #{tag}
                        </Badge>
                      ))
                    ) : !isEnriching && (
                      <span className="text-[10px] font-bold text-muted-foreground opacity-50">#no-tags</span>
                    )}
                  </div>
                )}
              />
            </div>
          </div>
        )}
      </CardContent>

      {/* Footer actions */}
      <CardFooter className="grid grid-cols-3 gap-2 border-t-[3px] border-border/50 bg-muted/5 p-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-1.5 font-bold h-9"
          onClick={handleToggleEdit}
          disabled={isSaving}
        >
          <PencilIcon className="size-3" />
          {editMode ? "Xong" : "Sửa"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="font-bold h-9"
          onClick={onCancel}
          disabled={isSaving}
        >
          Hủy
        </Button>
        <Button
          type="button"
          size="sm"
          className="font-black uppercase h-9"
          onClick={handleConfirm}
          disabled={isSaving || (isEnriching && !draft.title)}
        >
          {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : "Tạo ngay"}
        </Button>
      </CardFooter>
    </Card>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatViDate(isoString) {
  if (!isoString) return null;
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}
