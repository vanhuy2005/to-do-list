/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, memo } from "react";
import { CalendarIcon, PencilIcon, Loader2Icon } from "lucide-react";

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

// ─── Helper component: Enrichable ─────────────────────────────────────────────
// This component is defined outside of the main render function to avoid the
// “Cannot create components during render” warning.
// It receives the current draft and the set of fields the user has edited so
// it can decide whether to show a skeleton while AI enrichment is in progress.
const Enrichable = memo(function Enrichable({
  field,
  draft,
  userEditedFields,
  isLoading,
  render,
  skeletonWidth = "w-24",
}) {
  const isEmpty =
    !draft[field] || (Array.isArray(draft[field]) && draft[field].length === 0);
  if (isLoading && isEmpty && !userEditedFields.has(field)) {
    return <Skeleton className={cn("h-6 rounded-full", skeletonWidth)} />;
  }
  return render(draft[field]);
});

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

  // Sync draft from task when the task prop changes (e.g., after AI enrichment).
  // We only overwrite fields that the user hasn't edited yet.
  useEffect(() => {
    if (!task) return;
    setDraft(prev => {
      let changed = false;
      const next = { ...prev };
      if (!userEditedFields.has("title") && task.title !== prev.title) {
        next.title = task.title ?? prev.title;
        changed = true;
      }
      if (!userEditedFields.has("description") && task.description !== prev.description) {
        next.description = task.description ?? prev.description;
        changed = true;
      }
      if (!userEditedFields.has("status") && task.status !== prev.status) {
        next.status = task.status ?? prev.status;
        changed = true;
      }
      if (!userEditedFields.has("priority") && task.priority !== prev.priority) {
        next.priority = task.priority ?? prev.priority;
        changed = true;
      }
      if (!userEditedFields.has("dueDate") && task.dueDate !== prev.dueDate) {
        next.dueDate = task.dueDate ?? prev.dueDate;
        changed = true;
      }
      if (!userEditedFields.has("tags") && Array.isArray(task.tags)) {
        if (prev.tags.length !== task.tags.length || prev.tags.some((t, i) => t !== task.tags[i])) {
          next.tags = [...task.tags];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [task, userEditedFields]);

  const [tagInput, setTagInput] = useState("");

  if (!task) return null;

  // ── Draft updaters ──────────────────────────────────────────────────────

  const updateDraft = (field, value) => {
    setUserEditedFields((prev) => new Set(prev).add(field));
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const HANDLE_ADD_TAG = () => {
    const trimmed = tagInput.trim();
    if (!trimmed || draft.tags.length >= 8) return;
    if (draft.tags.includes(trimmed)) {
      setTagInput("");
      return;
    }
    updateDraft("tags", [...draft.tags, trimmed]);
    setTagInput("");
  };

  // ── Actions ─────────────────────────────────────────────────────────────

  const handleToggleEdit = () => setEditMode((prev) => !prev);

  const handleConfirm = () => {
    const finalDraft = editMode ? draft : draft; // draft already reflects the latest state
    const title = (finalDraft.title || "").trim();
    if (!title) return;
    onConfirm?.({ ...finalDraft, title });
  };

  // ── Helper for Skeletons ────────────────────────────────────────────────

  const isEnriching = uiState === "ENRICHING";

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <Card className="border-4 comic-shadow">
      {/* Header — AI Draft badge + raw transcript */}
      <CardHeader className="gap-2 bg-secondary/10 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="h-6 rounded-full bg-secondary text-[10px] uppercase font-black text-foreground">
            {isEnriching ? "AI is thinking..." : "AI Draft"}
          </Badge>
          <span className="text-xs font-bold text-muted-foreground italic">{rawText}</span>
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
              draft={draft}
              userEditedFields={userEditedFields}
              isLoading={isEnriching}
              skeletonWidth="w-full h-10"
              render={(v) =>
                v && (
                  <p className="text-xs font-bold text-muted-foreground line-clamp-2 italic">
                    {v}
                  </p>
                )
              }
            />

            {/* Metadata chips with Skeletons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Due date */}
              <Enrichable
                field="dueDate"
                draft={draft}
                userEditedFields={userEditedFields}
                isLoading={isEnriching}
                skeletonWidth="w-32"
                render={(v) => (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border-[3px] border-border px-3 py-1 text-xs font-bold comic-shadow-sm",
                      v ? "bg-background text-foreground" : "bg-muted/30 text-muted-foreground opacity-50",
                    )}
                  >
                    <CalendarIcon className="size-3" />
                    {v ? formatViDate(v) : "Chưa có ngày"}
                  </span>
                )}
              />

              {/* Priority */}
              <Enrichable
                field="priority"
                draft={draft}
                userEditedFields={userEditedFields}
                isLoading={isEnriching}
                skeletonWidth="w-24"
                render={(v) => (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border-[3px] border-border px-3 py-1 text-xs font-bold comic-shadow-sm",
                      v === "high" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
                    )}
                  >
                    Ưu tiên: {priorityLabel[v] || "Vừa"}
                  </span>
                )}
              />

              {/* Tags */}
              <Enrichable
                field="tags"
                draft={draft}
                userEditedFields={userEditedFields}
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
                    ) : (
                      !isEnriching && <span className="text-[10px] font-bold text-muted-foreground opacity-50">#no-tags</span>
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
