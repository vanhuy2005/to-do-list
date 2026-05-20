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
  // Direct support for object types (e.g. from test mocks)
  if (rawOutput && typeof rawOutput === 'object') {
    const result = TaskDraftSchema.safeParse(rawOutput);
    if (!result.success) {
      const fieldErrors = result.error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      throw new ParseError(`Schema validation failed: ${fieldErrors}`, JSON.stringify(rawOutput));
    }
    return result.data;
  }

  if (!rawOutput || typeof rawOutput !== 'string') {
    throw new ParseError('Empty or invalid string input', rawOutput);
  }

  let cleaned = rawOutput
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```(?:json)?\s*([\s\S]*?)```/gi, '$1')
    .trim();

  const firstBrace = cleaned.indexOf('{');
  if (firstBrace === -1) {
    throw new ParseError('No JSON object found', rawOutput);
  }
  
  const lastBrace = cleaned.lastIndexOf('}');
  if (lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  } else {
    cleaned = cleaned.slice(firstBrace);
  }

  let repaired;
  try {
    repaired = jsonrepair(cleaned);
  } catch (err) {
    // Attempt auto-closing of braces for truncated outputs
    try {
      repaired = jsonrepair(cleaned + '}');
    } catch (e2) {
      try {
        repaired = jsonrepair(cleaned + ']}');
      } catch (e3) {
        throw new ParseError(`JSON repair failed: ${err.message}`, rawOutput);
      }
    }
  }

  let parsed;
  try {
    parsed = JSON.parse(repaired);
  } catch (err) {
    throw new ParseError(`JSON parse failed: ${err.message}`, rawOutput);
  }

  const result = TaskDraftSchema.safeParse(parsed);
  if (!result.success) {
    const fieldErrors = result.error.errors
      .map(e => `${e.path.join('.')}: ${e.message}`)
      .join('; ');
    throw new ParseError(`Schema validation failed: ${fieldErrors}`, rawOutput);
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
    confidence: 0.3,
  };
}

export class ParseError extends Error {
  constructor(message, rawOutput) {
    super(message);
    this.name = 'ParseError';
    this.rawOutput = rawOutput; // giữ lại để log, KHÔNG expose ra client
  }
}
