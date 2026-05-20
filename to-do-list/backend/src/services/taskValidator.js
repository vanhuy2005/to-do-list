import { z } from "zod";

// ─── Zod schema — mirrors the Task Mongoose model fields exactly ──────────────
//
// Fields intentionally included:
//   title       → required (AI must provide)
//   description → optional (AI fills when user mentions details)
//   dueDate     → optional (AI resolves relative dates)
//   status      → optional (AI infers from phrasing: "đang làm" → "doing")
//   priority    → optional (AI infers: "gấp" → "high")
//   tags        → optional (AI extracts explicit tags, max 3)
//   confidence  → internal (AI self-scores; low confidence → 422)

const TaskSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(500).nullable().optional(),
  dueDate: z.string().nullable().optional(),
  status: z.enum(["todo", "doing", "done"]).nullable().optional(),
  priority: z.enum(["high", "medium", "low"]).nullable().optional(),
  tags: z.array(z.string().min(1).max(30)).max(3).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

// ─── Normalizers ──────────────────────────────────────────────────────────────

const normalizeTitle = (title) =>
  String(title || "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeDescription = (description) => {
  if (!description) return null;
  const cleaned = String(description).trim();
  return cleaned.length > 0 ? cleaned : null;
};

const normalizePriority = (priority) => {
  const value = String(priority || "").toLowerCase();
  if (value === "high" || value === "low" || value === "medium") return value;
  return "medium";
};

const normalizeStatus = (status) => {
  const value = String(status || "").toLowerCase();
  if (value === "todo" || value === "doing" || value === "done") return value;
  return null; // let the frontend/route apply the default
};

const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) return [];
  return Array.from(
    new Set(
      tags
        .map((tag) => String(tag).trim())
        .filter(Boolean),
    ),
  ).slice(0, 3);
};

const normalizeDueDate = (dueDate) => {
  if (!dueDate) return null;
  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Validate and normalise AI output against the Task schema.
 *
 * @param {unknown} aiOutput – raw parsed JSON from the AI provider
 * @returns {{ valid: true, task: object } | { valid: false, error: string }}
 */
export const validateAndCleanTask = (aiOutput) => {
  if (!aiOutput || typeof aiOutput !== "object") {
    return { valid: false, error: "Dữ liệu không hợp lệ từ AI." };
  }

  if (aiOutput.error) {
    return { valid: false, error: String(aiOutput.error) };
  }

  const normalized = {
    title: normalizeTitle(aiOutput.title),
    description: normalizeDescription(aiOutput.description),
    dueDate: aiOutput.dueDate ?? null,
    status: normalizeStatus(aiOutput.status),
    priority: aiOutput.priority ? normalizePriority(aiOutput.priority) : "medium",
    tags: normalizeTags(aiOutput.tags),
    confidence:
      typeof aiOutput.confidence === "number" ? aiOutput.confidence : 0.7,
  };

  const parsed = TaskSchema.safeParse(normalized);
  if (!parsed.success) {
    return { valid: false, error: "Dữ liệu không hợp lệ từ AI." };
  }

  if (parsed.data.confidence < 0.4) {
    return {
      valid: false,
      error: "Không chắc chắn đây là task. Thử nói rõ hơn nhé!",
    };
  }

  return {
    valid: true,
    task: {
      title: normalized.title,
      description: normalized.description,
      dueDate: normalizeDueDate(parsed.data.dueDate),
      // status null → frontend decides default ("todo"); non-null → AI suggestion
      status: normalized.status,
      priority: normalized.priority,
      tags: normalized.tags,
      confidence: parsed.data.confidence,
    },
  };
};
