import "../config/env.js";
import OpenAI from "openai";

// ─── Config helpers ──────────────────────────────────────────────────────────

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** Parse a comma-separated env var into a non-empty trimmed array. */
const parseKeyList = (raw) =>
  String(raw || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

// ─── Constants ───────────────────────────────────────────────────────────────

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const MAX_VOICE_TEXT_LENGTH = 800;

/** HTTP status codes that are worth retrying (transient failures). */
const TRANSIENT_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

const VOICE_CACHE_TTL_MS = toNumber(process.env.VOICE_CACHE_TTL_MS, 10 * 60 * 1000);
const VOICE_INFLIGHT_TTL_MS = toNumber(process.env.VOICE_INFLIGHT_TTL_MS, 30 * 1000);
const VOICE_AI_RETRY_ATTEMPTS = toNumber(process.env.VOICE_AI_RETRY_ATTEMPTS, 5);
const VOICE_AI_RETRY_BASE_MS = toNumber(process.env.VOICE_AI_RETRY_BASE_MS, 400);
const VOICE_AI_RETRY_MAX_MS = toNumber(process.env.VOICE_AI_RETRY_MAX_MS, 3000);
const VOICE_AI_CONCURRENCY = toNumber(process.env.VOICE_AI_CONCURRENCY, 10);
const VOICE_AI_QUEUE_MAX = toNumber(process.env.VOICE_AI_QUEUE_MAX, 50);

// ─── API Key Pools (round-robin rotation) ────────────────────────────────────

const OPENROUTER_KEYS = parseKeyList(process.env.OPENROUTER_API_KEY);
const GEMINI_KEYS = parseKeyList(process.env.GEMINI_API_KEY);

let openRouterKeyIndex = 0;
let geminiKeyIndex = 0;

/** Returns the next OpenRouter key in round-robin order. Null if none configured. */
const getNextOpenRouterKey = () => {
  if (OPENROUTER_KEYS.length === 0) return null;
  const key = OPENROUTER_KEYS[openRouterKeyIndex % OPENROUTER_KEYS.length];
  openRouterKeyIndex += 1;
  return key;
};

/** Returns the next Gemini key in round-robin order. Null if none configured. */
const getNextGeminiKey = () => {
  if (GEMINI_KEYS.length === 0) return null;
  const key = GEMINI_KEYS[geminiKeyIndex % GEMINI_KEYS.length];
  geminiKeyIndex += 1;
  return key;
};

// ─── OpenRouter client pool (one client per key, lazy-initialised) ───────────

const openRouterClientPool = new Map();

const getOpenRouterClientForKey = (apiKey) => {
  if (!apiKey) return null;
  if (!openRouterClientPool.has(apiKey)) {
    openRouterClientPool.set(
      apiKey,
      new OpenAI({
        apiKey,
        baseURL: OPENROUTER_BASE_URL,
        defaultHeaders: {
          "HTTP-Referer": process.env.APP_URL || "http://localhost:5173",
          "X-Title": "Todo Voice Assistant",
        },
      }),
    );
  }
  return openRouterClientPool.get(apiKey);
};

// ─── Prompt injection guard ───────────────────────────────────────────────────

const BLOCKED_PATTERNS = [
  /ignore\s+(all|previous)\s+instructions?/gi,
  /system\s+prompt/gi,
  /developer\s+message/gi,
  /bo\s+qua\s+(moi\s+)?(lenh|chi\s+dan)/gi,
  /prompt\s+injection/gi,
];

// ─── System prompt ────────────────────────────────────────────────────────────
//
// Model choice rationale:
//   meta-llama/llama-3.3-70b-instruct:free  → best free JSON + Vietnamese
//   gemini-2.5-flash                        → fast, structured output support
//
// The prompt is deliberately verbose to maximise field extraction accuracy.
// Every field maps 1-to-1 to the Task Mongoose schema.

const SYSTEM_PROMPT = `You are a Vietnamese task-extraction assistant.
You receive a short Vietnamese speech transcript and return EXACTLY ONE JSON object.

## Current date/time (Vietnam, UTC+7)
{CURRENT_ISO}
Day of week: {CURRENT_DOW}

## JSON schema — return ALL fields every time
{
  "title":       "(string, required) short task name, 2-200 chars",
  "description": "(string | null) any extra context, details, or notes",
  "dueDate":     "(ISO 8601 string | null) deadline resolved from current date/time above",
  "status":      "('todo' | 'doing' | 'done' | null)",
  "priority":    "('high' | 'medium' | 'low' | null)",
  "tags":        "(string[], max 3 items)",
  "confidence":  "(number 0-1)"
}

## Field extraction rules

### title (required)
- Extract the core action/task name.
- Strip filler: "nhắc mình", "giúp tôi", "nhớ là", "tôi cần", "tạo nhiệm vụ", "tạo task".
- Keep it concise: "nhắc mình gửi báo cáo cho sếp Minh" → "Gửi báo cáo cho sếp Minh".

### description
- Extract when user says: "chú thích là", "ghi chú", "mô tả là", "với nội dung", "chi tiết là", "nội dung là", "note là".
- Also extract any explanatory clause after the main task, e.g. "mua sữa vì con hết sữa rồi" → description: "Vì con hết sữa rồi".
- If no details mentioned → null.

### dueDate
- CRITICAL: Use the current date/time above as the reference point. DO NOT guess or hallucinate dates.
- Vietnamese time phrases (resolve relative to current date/time):
  - "tối nay" → today at 19:00 (same day)
  - "đêm nay" → today at 22:00 (same day)
  - "sáng mai" → tomorrow at 08:00
  - "chiều mai" → tomorrow at 14:00
  - "trưa mai" → tomorrow at 12:00
  - "tối mai" → tomorrow at 19:00
  - "ngày mai" → tomorrow at 08:00
  - "sáng nay" → today at 08:00 (if already past, keep today's date)
  - "chiều nay" → today at 14:00
  - "trưa nay" → today at 12:00
  - "tuần sau" → next Monday at 08:00
  - "thứ N" → the upcoming weekday N (thứ 2=Monday...chủ nhật=Sunday)
  - "cuối tuần" → upcoming Saturday at 09:00
  - "cuối tháng" → last day of current month at 17:00
  - "lúc N giờ" → today at hour N (if past, tomorrow at hour N)
  - "ngày DD tháng MM" → that date in current year at 08:00
- Always return ISO 8601 format with timezone +07:00, e.g. "2026-05-07T19:00:00+07:00".
- If no time/date mentioned → null.

### status
- "đang làm", "đang xử lý", "đang tiến hành" → "doing"
- "xong rồi", "hoàn thành", "đã xong", "done" → "done"
- "cần làm", "phải làm", "chưa làm", "sẽ làm" → "todo"
- If not mentioned → null.

### priority
- "gấp", "khẩn", "cực kỳ quan trọng", "urgent", "ASAP", "ngay lập tức", "ưu tiên cao" → "high"
- "bình thường", "vừa", "ưu tiên vừa" → "medium"
- "thấp", "không gấp", "từ từ", "khi nào rảnh", "ưu tiên thấp" → "low"
- If not mentioned → null.

### tags
- Extract explicit categories: "công việc", "học tập", "mua sắm", "gia đình", "sức khỏe", "tài chính", etc.
- Max 3 tags. Only use tags the user explicitly stated.
- If none mentioned → empty array [].

### confidence
- 0.9-1.0: Clear task with explicit details
- 0.7-0.89: Reasonably clear task
- 0.4-0.69: Ambiguous but might be a task
- 0.0-0.39: Not a task (noise, test mic, nonsense)

## Error case
If the transcript is noise, mic test, or not a task:
{"error":"Khong nhan dien duoc cong viec","confidence":0}

## Output rules
- Return ONLY the raw JSON object. No markdown fences, no explanation, no extra text.
- Always include ALL fields in the response (use null for missing optional fields).`;

const buildSystemPrompt = () => {
  const now = new Date();

  // ISO 8601 with Vietnam timezone offset for unambiguous date math
  const pad = (n) => String(n).padStart(2, "0");
  const isoVN = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}T${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}Z`;

  // Compute Vietnam local time (UTC+7)
  const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const vnIso = `${vnNow.getUTCFullYear()}-${pad(vnNow.getUTCMonth() + 1)}-${pad(vnNow.getUTCDate())}T${pad(vnNow.getUTCHours())}:${pad(vnNow.getUTCMinutes())}:${pad(vnNow.getUTCSeconds())}+07:00`;

  // Vietnamese day-of-week names
  const dowNames = [
    "Chủ nhật",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
  ];
  const dowVN = dowNames[vnNow.getUTCDay()];

  return SYSTEM_PROMPT
    .replace("{CURRENT_ISO}", vnIso)
    .replace("{CURRENT_DOW}", dowVN);
};

// ─── In-memory caches ─────────────────────────────────────────────────────────

const voiceResultCache = new Map();
const inFlightRequests = new Map();

const buildVoiceCacheKey = (rawText, userId) => {
  const normalizedText = String(rawText || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  const userKey = userId ? String(userId) : "anon";
  return `${userKey}::${normalizedText}`;
};

const getCachedVoiceResult = (key) => {
  const entry = voiceResultCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    voiceResultCache.delete(key);
    return null;
  }
  return entry.value;
};

const setCachedVoiceResult = (key, value) => {
  const now = Date.now();
  voiceResultCache.set(key, { value, expiresAt: now + VOICE_CACHE_TTL_MS });

  // Evict expired entries when cache grows beyond 500
  if (voiceResultCache.size > 500) {
    for (const [cacheKey, entry] of voiceResultCache.entries()) {
      if (entry.expiresAt <= now) {
        voiceResultCache.delete(cacheKey);
      }
    }
  }
};

const getInFlightRequest = (key) => {
  const entry = inFlightRequests.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    inFlightRequests.delete(key);
    return null;
  }
  return entry.promise;
};

const setInFlightRequest = (key, promise) => {
  inFlightRequests.set(key, {
    promise,
    expiresAt: Date.now() + VOICE_INFLIGHT_TTL_MS,
  });
  // Clean up map entry when done. MUST swallow rejection here because
  // the caller (route handler) is the one who .catch()es the original
  // promise — this secondary .then() chain would otherwise create an
  // unhandled promise rejection that crashes the Node process.
  promise.then(
    () => inFlightRequests.delete(key),
    () => inFlightRequests.delete(key),
  );
};

// ─── Concurrency queue ────────────────────────────────────────────────────────

const aiQueue = [];
let aiActiveCount = 0;

const drainAiQueue = () => {
  while (aiActiveCount < VOICE_AI_CONCURRENCY && aiQueue.length > 0) {
    const { task, resolve, reject } = aiQueue.shift();
    aiActiveCount += 1;

    Promise.resolve()
      .then(task)
      .then((result) => {
        aiActiveCount -= 1;
        drainAiQueue();
        resolve(result);
      })
      .catch((error) => {
        aiActiveCount -= 1;
        drainAiQueue();
        reject(error);
      });
  }
};

const enqueueAiRequest = (task) =>
  new Promise((resolve, reject) => {
    if (aiQueue.length >= VOICE_AI_QUEUE_MAX) {
      // Estimate real wait time instead of using a fixed cap
      const estimatedWaitSeconds = Math.ceil(
        (aiQueue.length / VOICE_AI_CONCURRENCY) * 2,
      );
      const error = new Error("AI queue is full");
      error.status = 429;
      error.retryAfter = Math.max(estimatedWaitSeconds, 5);
      reject(error);
      return;
    }

    aiQueue.push({ task, resolve, reject });
    drainAiQueue();
  });

// ─── Retry helpers ────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const jitterDelay = (delayMs) => {
  const jitter = 0.7 + Math.random() * 0.6;
  return Math.max(0, Math.floor(delayMs * jitter));
};

const isTransientAiError = (error) => {
  if (!error) return false;
  if (TRANSIENT_STATUS_CODES.has(error.status)) return true;
  const message = String(error.message || "").toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("temporar") ||
    message.includes("rate limit") ||
    message.includes("overloaded") ||
    message.includes("network")
  );
};

const getHeaderValue = (headers, name) => {
  if (!headers || !name) return null;
  if (typeof headers.get === "function") {
    return headers.get(name) || headers.get(name.toLowerCase());
  }
  const key = name.toLowerCase();
  return headers[name] ?? headers[key] ?? headers[key.toUpperCase()] ?? null;
};

const parseResetHeaderSeconds = (resetValue) => {
  const resetNumber = Number(resetValue);
  if (!Number.isFinite(resetNumber) || resetNumber <= 0) return null;
  const nowMs = Date.now();
  let seconds = null;
  if (resetNumber > 1e11) {
    seconds = Math.ceil((resetNumber - nowMs) / 1000);
  } else if (resetNumber > 1e9) {
    seconds = Math.ceil(resetNumber - Math.floor(nowMs / 1000));
  } else {
    seconds = Math.ceil(resetNumber);
  }
  return seconds && seconds > 0 ? seconds : null;
};

const getRetryAfterSeconds = (error) => {
  const directRetry =
    getHeaderValue(error?.headers, "retry-after") ||
    getHeaderValue(error?.response?.headers, "retry-after");
  const parsedRetry = Number(directRetry);
  if (Number.isFinite(parsedRetry) && parsedRetry > 0) return parsedRetry;

  const resetHeader =
    getHeaderValue(error?.headers, "x-ratelimit-reset") ||
    getHeaderValue(error?.response?.headers, "x-ratelimit-reset") ||
    getHeaderValue(error?.headers, "x-ratelimit-reset-ms") ||
    getHeaderValue(error?.response?.headers, "x-ratelimit-reset-ms");
  return parseResetHeaderSeconds(resetHeader);
};

const computeBackoffDelayMs = (attempt, error) => {
  const retryAfterSeconds = getRetryAfterSeconds(error);
  const retryAfterMs = retryAfterSeconds ? retryAfterSeconds * 1000 : null;
  const exponential = Math.min(
    VOICE_AI_RETRY_MAX_MS,
    VOICE_AI_RETRY_BASE_MS * 2 ** attempt,
  );
  const base = retryAfterMs
    ? Math.min(retryAfterMs, VOICE_AI_RETRY_MAX_MS)
    : exponential;
  return jitterDelay(base);
};

const requestWithRetry = async (fn) => {
  let lastError = null;

  for (let attempt = 0; attempt < VOICE_AI_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retryAfterSeconds = getRetryAfterSeconds(error);
      if (retryAfterSeconds && !error.retryAfter) {
        error.retryAfter = retryAfterSeconds;
      }
      if (!isTransientAiError(error) || attempt >= VOICE_AI_RETRY_ATTEMPTS - 1) {
        break;
      }
      const delayMs = computeBackoffDelayMs(attempt, error);
      if (delayMs > 0) await sleep(delayMs);
    }
  }

  throw lastError || new Error("AI request failed");
};

// ─── Response parsing ─────────────────────────────────────────────────────────

const extractMessageContent = (messageContent) => {
  if (typeof messageContent === "string") return messageContent.trim();
  if (Array.isArray(messageContent)) {
    return messageContent
      .map((part) => {
        if (typeof part === "string") return part;
        if (part?.type === "text" && typeof part.text === "string") return part.text;
        return "";
      })
      .join("")
      .trim();
  }
  return "";
};

/**
 * Robustly extract a JSON object from AI response content.
 *
 * Handles:
 *   - Pure JSON string
 *   - Markdown-fenced JSON (```json ... ```)
 *   - <think>...</think> reasoning tags (DeepSeek R1, etc.)
 *   - Leading prose / trailing explanation around JSON
 *   - Multiple JSON objects (takes the first valid one)
 */
const extractJson = (content) => {
  if (!content || typeof content !== "string") {
    const err = new Error("AI trả về nội dung rỗng. Thử nói lại ngắn gọn hơn.");
    err.userFacing = true;
    throw err;
  }

  // Step 1: Strip common wrappers
  let cleaned = content
    // Remove <think>...</think> blocks (DeepSeek reasoning)
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    // Remove markdown fences  ```json ... ```  or  ``` ... ```
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```/g, "")
    .trim();

  // Step 2: Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch {
    // continue to fallback
  }

  // Step 3: Extract first { ... } block (greedy inner match)
  const braceMatch = cleaned.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0]);
    } catch {
      // Try fixing common issues: trailing commas, single quotes
      const fixed = braceMatch[0]
        .replace(/,\s*([}\]])/g, "$1")      // trailing commas
        .replace(/'/g, '"');                 // single → double quotes
      try {
        return JSON.parse(fixed);
      } catch {
        // continue to error
      }
    }
  }

  // Step 4: Give up with a user-friendly error
  const err = new Error(
    "AI không trả về đúng định dạng. Thử nói ngắn gọn hơn nhé!",
  );
  err.userFacing = true;
  throw err;
};

// ─── Provider implementations ─────────────────────────────────────────────────

/**
 * Call OpenRouter with the next key in the rotation pool.
 * Each call advances the round-robin index → distributes 429 risk across keys.
 */
const requestOpenRouter = async (rawText) => {
  const apiKey = getNextOpenRouterKey();
  if (!apiKey) throw new Error("No OPENROUTER_API_KEY configured");

  const client = getOpenRouterClientForKey(apiKey);

  return requestWithRetry(async () => {
    const completion = await client.chat.completions.create({
      model: process.env.AI_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: rawText },
      ],
      max_tokens: 512,
      temperature: 0,
    });

    const content = extractMessageContent(
      completion?.choices?.[0]?.message?.content,
    );
    return extractJson(content);
  });
};

/**
 * Call Gemini REST API with the next key in the rotation pool.
 */
const requestGemini = async (rawText) => {
  const apiKey = getNextGeminiKey();
  if (!apiKey) throw new Error("No GEMINI_API_KEY configured");

  if (typeof fetch !== "function") {
    throw new Error("Global fetch is not available in this runtime");
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  return requestWithRetry(async () => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: buildSystemPrompt() }],
          },
          contents: [{ role: "user", parts: [{ text: rawText }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 512,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(
        `Gemini request failed: ${response.status} ${errorText}`,
      );
      error.status = response.status;
      const retryAfter = response.headers.get("retry-after");
      if (retryAfter) {
        const parsed = Number(retryAfter);
        if (Number.isFinite(parsed)) error.retryAfter = parsed;
      }
      throw error;
    }

    const data = await response.json();
    const content = extractMessageContent(
      data?.candidates?.[0]?.content?.parts?.map((part) => part?.text).join(""),
    );
    return extractJson(content);
  });
};

/**
 * Call local Ollama as last-resort fallback.
 * Only used when OLLAMA_URL is set in the environment.
 */
const requestOllama = async (rawText) => {
  const ollamaUrl = process.env.OLLAMA_URL;
  if (!ollamaUrl) throw new Error("OLLAMA_URL is not configured");

  const ollamaModel = process.env.OLLAMA_MODEL || "llama3";

  if (typeof fetch !== "function") {
    throw new Error("Global fetch is not available in this runtime");
  }

  return requestWithRetry(async () => {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        prompt: `${buildSystemPrompt()}\n\nUser: ${rawText}\nAssistant:`,
        stream: false,
        options: { temperature: 0, num_predict: 512 },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(
        `Ollama request failed: ${response.status} ${errorText}`,
      );
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    const content = data?.response?.trim() || "";
    if (!content || content.length < 10) {
      throw new Error("Ollama response is empty or too short");
    }
    return extractJson(content);
  });
};

// ─── Auto-cascade logic ───────────────────────────────────────────────────────
//
// Build an ordered list of available providers at call-time and try them
// in sequence. This correctly handles all combinations of configured keys.
//
// Priority: OpenRouter → Gemini → Ollama

const buildProviderChain = (providerOverride) => {
  const p = (providerOverride || process.env.AI_PROVIDER || "openrouter").toLowerCase();

  if (p === "openrouter") return [requestOpenRouter];
  if (p === "gemini") return [requestGemini];
  if (p === "ollama") return [requestOllama];

  // "auto" mode: include every provider that is configured
  const chain = [];
  if (OPENROUTER_KEYS.length > 0) chain.push(requestOpenRouter);
  if (GEMINI_KEYS.length > 0) chain.push(requestGemini);
  if (process.env.OLLAMA_URL) chain.push(requestOllama);

  if (chain.length === 0) {
    throw new Error(
      "No AI provider configured. Set OPENROUTER_API_KEY or GEMINI_API_KEY.",
    );
  }
  return chain;
};

const runWithFallback = async (rawText, providerOverride) => {
  const chain = buildProviderChain(providerOverride);
  let lastError = null;

  for (const provider of chain) {
    try {
      return await provider(rawText);
    } catch (error) {
      lastError = error;
      // Always cascade to the next provider regardless of error type.
      // Provider-specific errors (404 wrong model, bad key, etc.) should
      // not prevent trying the next provider in auto mode.
    }
  }

  throw lastError || new Error("All AI providers failed");
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const sanitizeVoiceText = (rawText) => {
  const safeText = String(rawText || "");
  let cleaned = safeText.replace(/[\u0000-\u001F\u007F]/g, " ");

  for (const pattern of BLOCKED_PATTERNS) {
    cleaned = cleaned.replace(pattern, "");
  }

  cleaned = cleaned.replace(/\s+/g, " ").trim();

  if (cleaned.length > MAX_VOICE_TEXT_LENGTH) {
    cleaned = cleaned.slice(0, MAX_VOICE_TEXT_LENGTH).trim();
  }

  return cleaned;
};

/**
 * Process a voice transcript through the AI pipeline.
 *
 * Layered optimisations (in order):
 *   1. Result cache (per userId+text, TTL 10 min)
 *   2. In-flight dedup (concurrent identical requests share one promise)
 *   3. Concurrency queue (max 10 parallel calls, max 50 queued)
 *   4. Round-robin key rotation across all configured keys
 *   5. Provider cascade: OpenRouter → Gemini → Ollama
 *   6. Exponential backoff with jitter (respects Retry-After / x-ratelimit-reset)
 *
 * @param {string} rawText  – sanitized transcript text
 * @param {{ userId?: string, providerOverride?: string }} options
 */
export const processVoiceTask = async (rawText, options = {}) => {
  const normalizedOptions =
    typeof options === "string" ? { providerOverride: options } : options;
  const providerOverride = normalizedOptions?.providerOverride;
  const userId = normalizedOptions?.userId;

  const cacheKey = buildVoiceCacheKey(rawText, userId);

  const cached = getCachedVoiceResult(cacheKey);
  if (cached) return cached;

  const inflight = getInFlightRequest(cacheKey);
  if (inflight) return inflight;

  const requestPromise = enqueueAiRequest(async () => {
    const result = await runWithFallback(rawText, providerOverride);
    setCachedVoiceResult(cacheKey, result);
    return result;
  });

  setInFlightRequest(cacheKey, requestPromise);
  return requestPromise;
};
