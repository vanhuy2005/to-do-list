import { jsonrepair } from 'jsonrepair';
import { z } from 'zod';

// --- Zod Schema (nguồn sự thật duy nhất cho task structure) ---
export const TaskDraftSchema = z.object({
  title: z
    .string()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title too long')
    .transform(s => s.trim()),
  description: z
    .string()
    .max(500, 'Description too long')
    .nullable()
    .optional()
    .default(null)
    .transform(s => (s ? s.trim() : null)),
  datePhrase: z
    .string()
    .nullable()
    .optional()
    .default(null),
  tags: z
    .union([
      z.array(z.string().min(1).max(50)),
      z.string().transform(s => [s]),
    ])
    .transform(arr => arr.slice(0, 5))
    .default([]),
  priority: z
    .enum(['low', 'medium', 'high', 'urgent'])
    .default('medium')
    .transform(p => (p === 'urgent' ? 'high' : p)), // Map urgent to high for DB compatibility
  confidence: z
    .number()
    .min(0)
    .max(1)
    .default(0.8),
}).strict();

/**
 * Pipeline: raw LLM string → validated TaskDraft object
 * Throws ParseError nếu không thể recover
 */
export function recoverAndValidate(rawOutput, fallbackTitle = '') {
  if (!rawOutput || typeof rawOutput !== 'string') {
    return buildFallback(fallbackTitle, 'empty_input');
  }

  let cleaned = rawOutput
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```(?:json)?\s*([\s\S]*?)```/gi, '$1')
    .trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
    console.warn({ event: 'parse.no_json_found', raw_length: rawOutput.length });
    return buildFallback(fallbackTitle, 'no_json_found');
  }
  cleaned = cleaned.slice(firstBrace, lastBrace + 1);

  let repaired;
  try {
    repaired = jsonrepair(cleaned);
  } catch (err) {
    console.warn({ event: 'parse.jsonrepair_failed', error: err.message });
    return buildFallback(fallbackTitle, 'jsonrepair_failed');
  }

  let parsed;
  try {
    parsed = JSON.parse(repaired);
  } catch (err) {
    console.warn({ event: 'parse.json_parse_failed', error: err.message });
    return buildFallback(fallbackTitle, 'json_parse_failed');
  }

  const result = TaskDraftSchema.safeParse(parsed);
  if (!result.success) {
    const fieldErrors = result.error.errors
      .map(e => `${e.path.join('.')}: ${e.message}`)
      .join('; ');
    console.warn({ event: 'parse.schema_fail', field_errors: fieldErrors });
    const salvageTitle = typeof parsed?.title === 'string' ? parsed.title.trim() : fallbackTitle;
    return buildFallback(salvageTitle, 'schema_fail');
  }

  console.info({ event: 'parse.success', has_description: !!result.data.description });
  return result.data;
}

function buildFallback(title, reason) {
  console.info({ event: 'parse.fallback', reason, title_length: title.length });
  return {
    title: title.slice(0, 150) || 'Untitled task',
    description: null,
    datePhrase: null,
    tags: [],
    priority: 'medium',
    confidence: 0.2,
  };
}

export class ParseError extends Error {
  constructor(message, rawOutput) {
    super(message);
    this.name = 'ParseError';
    this.rawOutput = rawOutput; // giữ lại để log, KHÔNG expose ra client
  }
}
