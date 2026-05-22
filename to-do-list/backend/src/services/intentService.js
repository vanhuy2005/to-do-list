import OpenAI from 'openai';
import { governor } from './concurrencyGovernor.js';
import { recoverAndValidate } from './outputRecovery.js';
import { parseDateFromText, extractPriority } from './nlpService.js';


const withTimeout = (fn, ms, label) => async () => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([fn(), timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

// --- Constants & Config ---
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

const parseKeyList = (raw) =>
  String(raw || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

const getOpenRouterKeys = () => parseKeyList(process.env.OPENROUTER_API_KEY);
const getGeminiKeys = () => parseKeyList(process.env.GEMINI_API_KEY);

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:1.5b';
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;

let openRouterKeyIndex = 0;
let geminiKeyIndex = 0;

const getNextOpenRouterKey = () => {
  const keys = getOpenRouterKeys();
  if (keys.length === 0) return null;
  return keys[openRouterKeyIndex++ % keys.length];
};

const getNextGeminiKey = () => {
  const keys = getGeminiKeys();
  if (keys.length === 0) return null;
  return keys[geminiKeyIndex++ % keys.length];
};

const openRouterClientPool = new Map();
const getOpenRouterClientForKey = (apiKey) => {
  if (!apiKey) return null;
  if (!openRouterClientPool.has(apiKey)) {
    openRouterClientPool.set(apiKey, new OpenAI({
      apiKey,
      baseURL: OPENROUTER_BASE_URL,
      defaultHeaders: {
        "HTTP-Referer": process.env.APP_URL || "http://localhost:5173",
        "X-Title": "Todo Voice Assistant",
      },
    }));
  }
  return openRouterClientPool.get(apiKey);
};

const SYSTEM_PROMPT = `You are a smart, enterprise-grade Task Voice Agent embedded in a Vietnamese to-do app.
Your job: Analyze a voice transcript and extract a highly structured task intent in valid JSON.

JSON Schema to follow strictly:
{
  "intent": "create" | "update" | "complete" | "search",
  "confidence": number, // 0.0 to 1.0
  "isClarificationRequired": boolean, // Set to true if crucial info is missing (e.g., missing time for recurring tasks)
  "clarificationQuestion": string | null, // Vietnamese polite question asking for missing info, or null
  "missingFields": string[], // e.g. ["time"] or []
  
  "task": {
    "title": string | null, // Core action, 2-60 chars. Strip fillers like "nhắc tôi", "hãy", "giúp". Null if not create.
    "description": string | null, // Supporting details, sub-items, or context like reasons introduced by "vì", "để", "nhớ"
    "datePhrase": string | null, // Exact Vietnamese date/time phrase copied from transcript, e.g. "sáng mai", "1 giờ đêm", "thứ sáu tuần sau"
    "dueDate": null, // Always null
    "isRecurring": boolean,
    "recurrence": "daily" | "weekly" | "monthly" | null,
    "time": string | null, // Format "HH:mm" (24h) if a specific time is mentioned, e.g., "06:00" for "6 giờ sáng"
    "priority": "low" | "medium" | "high", // Only allow "low", "medium", or "high" (urgent maps to high)
    "tags": string[] // 1-3 short lowercase category tags
  } | null,
  
  "updateData": {
    "taskQuery": string | null, // The search query/title of the task to be updated
    "updates": {
      "title": string | optional,
      "description": string | optional,
      "dueDate": string | optional,
      "priority": "low" | "medium" | "high" | optional,
      "tags": string[] | optional
    } | null
  } | null,
  
  "completeData": {
    "taskQuery": string | null // The search query/title of the task to complete
  } | null,
  
  "searchData": {
    "searchQuery": string | null // The query to search tasks
  } | null
}

CRITICAL RULES:
1. Intent Mapping:
   - "Nhắc tôi...", "Tạo task...", "Đi tập...", "Mua sữa..." -> "create"
   - "Cập nhật...", "Đổi deadline...", "Thay đổi..." -> "update"
   - "Hoàn thành...", "Đánh dấu xong...", "Xong task..." -> "complete"
   - "Tìm kiếm...", "Liệt kê...", "Xem các task..." -> "search"
2. Recurring Tasks:
   - "mỗi ngày", "hàng ngày" -> isRecurring: true, recurrence: "daily"
   - "mỗi tuần", "hàng tuần", "thứ hai hàng tuần" -> isRecurring: true, recurrence: "weekly"
   - "mỗi tháng", "hàng tháng" -> isRecurring: true, recurrence: "monthly"
   - If user asks for a recurring task (e.g., "mỗi ngày đi tập gym") but does not specify a time, set isClarificationRequired: true, add "time" to missingFields, and write a polite Vietnamese clarificationQuestion: "Bạn muốn tôi nhắc đi tập gym vào mấy giờ mỗi ngày?"
3. Priority Mapping:
   - Only allow "low", "medium", or "high". "urgent" maps to "high". DO NOT add "urgent" to tags.
4. Description:
   - DO NOT merge or swallow descriptions into titles. Keep title very short (e.g. "Mua sữa"). Keep description for extra details (e.g. "Vì con hết sữa").

---
FEW-SHOT EXAMPLES:

Input: "Nhắc tôi mỗi ngày đi tập gym lúc 6 giờ sáng"
Output: {
  "intent": "create",
  "confidence": 0.98,
  "isClarificationRequired": false,
  "clarificationQuestion": null,
  "missingFields": [],
  "task": {
    "title": "Đi tập gym",
    "description": null,
    "datePhrase": "mỗi ngày lúc 6 giờ sáng",
    "dueDate": null,
    "isRecurring": true,
    "recurrence": "daily",
    "time": "06:00",
    "priority": "medium",
    "tags": ["sức khỏe", "thể thao"]
  },
  "updateData": null,
  "completeData": null,
  "searchData": null
}

Input: "Nhắc tôi mỗi ngày đi tập gym"
Output: {
  "intent": "create",
  "confidence": 0.95,
  "isClarificationRequired": true,
  "clarificationQuestion": "Bạn muốn tôi nhắc đi tập gym vào mấy giờ mỗi ngày?",
  "missingFields": ["time"],
  "task": {
    "title": "Đi tập gym",
    "description": null,
    "datePhrase": "mỗi ngày",
    "dueDate": null,
    "isRecurring": true,
    "recurrence": "daily",
    "time": null,
    "priority": "medium",
    "tags": ["sức khỏe", "thể thao"]
  },
  "updateData": null,
  "completeData": null,
  "searchData": null
}

Input: "Hoàn thành task mua sữa"
Output: {
  "intent": "complete",
  "confidence": 0.97,
  "isClarificationRequired": false,
  "clarificationQuestion": null,
  "missingFields": [],
  "task": null,
  "updateData": null,
  "completeData": {
    "taskQuery": "mua sữa"
  },
  "searchData": null
}

Input: "Cập nhật task chạy bộ thành lúc 7 giờ tối"
Output: {
  "intent": "update",
  "confidence": 0.95,
  "isClarificationRequired": false,
  "clarificationQuestion": null,
  "missingFields": [],
  "task": null,
  "updateData": {
    "taskQuery": "chạy bộ",
    "updates": {
      "dueDate": "7 giờ tối"
    }
  },
  "completeData": null,
  "searchData": null
}

Input: "Tìm các task về học tập"
Output: {
  "intent": "search",
  "confidence": 0.96,
  "isClarificationRequired": false,
  "clarificationQuestion": null,
  "missingFields": [],
  "task": null,
  "updateData": null,
  "completeData": null,
  "searchData": {
    "searchQuery": "học tập"
  }
}
`;

/**
 * Correct Vietnamese phonetic tone/vowel confusion errors safely.
 */
export function phoneticCorrect(transcript) {
  if (!transcript || typeof transcript !== 'string') return transcript;
  
  const rules = [
    { pattern: /\btạm\s+giờ\b/gi, replacement: 'tám giờ' },
    { pattern: /\blam\s+giờ\b/gi, replacement: 'lăm giờ' },
    { pattern: /\bchim\s+nay\b/gi, replacement: 'chiều nay' },
  ];
  
  let corrected = transcript;
  for (const { pattern, replacement } of rules) {
    corrected = corrected.replace(pattern, replacement);
  }
  return corrected;
}

/**
 * Full pipeline: transcript → enriched task draft
 */
export async function extractIntent({ transcript, requestId }) {
  const startAt = Date.now();
  const correctedTranscript = phoneticCorrect(transcript);

  // 1. Dynamic Provider Chain based on key availability
  const openRouterKeys = getOpenRouterKeys();
  const geminiKeys = getGeminiKeys();

  const providers = [];
  const hasAnyKey = openRouterKeys.length > 0 || geminiKeys.length > 0;
  if (openRouterKeys.length > 0 || (!hasAnyKey && process.env.NODE_ENV === 'test')) {
    providers.push('openrouter');
  }
  if (geminiKeys.length > 0 || (!hasAnyKey && process.env.NODE_ENV === 'test')) {
    providers.push('gemini');
  }
  if (process.env.OLLAMA_ENABLED === 'true') {
    providers.push('ollama');
  }

  const requestFns = {
    openrouter: withTimeout(() => requestOpenRouter(correctedTranscript), 15000, 'OpenRouter'),
    gemini: withTimeout(() => requestGemini(correctedTranscript), 15000, 'Gemini'),
    ollama: withTimeout(() => requestOllama(correctedTranscript), 8000, 'Ollama'),
  };

  let aiDraft = null;
  let chosenProvider = null;

  for (const provider of providers) {
    const providerStart = Date.now();
    try {
      const rawOutput = await governor.run(provider, correctedTranscript, requestFns[provider]);
      aiDraft = recoverAndValidate(rawOutput, correctedTranscript);
      chosenProvider = provider;

      console.info({
        event: 'intent.provider_success',
        provider,
        request_id: requestId,
        confidence: aiDraft.confidence,
        latency_ms: Date.now() - providerStart,
      });
      break; 
    } catch (err) {
      console.warn({
        event: 'intent.provider_fail',
        provider,
        error: err.message,
        code: err.code ?? 'UNKNOWN',
        request_id: requestId,
        latency_ms: Date.now() - providerStart,
      });
    }
  }

  if (!aiDraft) {
    console.warn({ event: 'intent.fallback', request_id: requestId, reason: 'All AI providers failed' });
    aiDraft = {
      intent: 'create',
      confidence: 0.3,
      isClarificationRequired: false,
      clarificationQuestion: null,
      missingFields: [],
      task: {
        title: correctedTranscript.slice(0, 100).trim() || '[Task từ giọng nói]',
        description: null,
        datePhrase: null,
        dueDate: null,
        isRecurring: false,
        recurrence: null,
        time: null,
        priority: 'medium',
        tags: []
      }
    };
  }

  // 2. Normalize and check fields based on old/new schema
  const isNewSchema = 'intent' in aiDraft;
  
  let intent = isNewSchema ? aiDraft.intent : 'create';
  let confidence = aiDraft.confidence ?? 0.8;
  let isClarificationRequired = isNewSchema ? (aiDraft.isClarificationRequired ?? false) : false;
  let clarificationQuestion = isNewSchema ? (aiDraft.clarificationQuestion ?? null) : null;
  let missingFields = isNewSchema ? (aiDraft.missingFields ?? []) : [];

  let task = null;
  let updateData = isNewSchema ? aiDraft.updateData : null;
  let completeData = isNewSchema ? aiDraft.completeData : null;
  let searchData = isNewSchema ? aiDraft.searchData : null;

  // Resolve priority
  const priority = extractPriority(correctedTranscript);

  // Reconstruct unified response fields
  let title = '[Task từ giọng nói]';
  let description = null;
  let datePhrase = null;
  let dueDate = null;
  let tags = [];
  let finalPriority = 'medium';

  if (isNewSchema) {
    if (aiDraft.task) {
      task = { ...aiDraft.task };
      
      // Resolve dueDate
      if (task.datePhrase) {
        task.dueDate = parseDateFromText(task.datePhrase);
      } else {
        task.dueDate = parseDateFromText(correctedTranscript);
      }

      // Map priority: only allow "low", "medium", "high"
      let p = task.priority || 'medium';
      
      // Determine finalPriority (root-level, maintains 'urgent')
      let rootPriority = p;
      if (priority && priority !== 'medium') {
        rootPriority = priority;
      }
      
      // task.priority maps 'urgent' to 'high'
      if (rootPriority === 'urgent') {
        p = 'high';
      } else {
        p = rootPriority;
      }
      
      task.priority = p;

      // Extract details
      title = task.title?.trim() || title;
      description = task.description || null;
      datePhrase = task.datePhrase || null;
      dueDate = task.dueDate || null;
      tags = task.tags || [];
      // Support clean mapped priority (low/medium/high) for the new schema
      finalPriority = rootPriority;
    }
  } else {
    // Legacy schema fallback/mock support
    let p = aiDraft.priority || 'medium';
    if (priority && priority !== 'medium') p = priority;
    
    datePhrase = aiDraft.datePhrase || null;
    dueDate = parseDateFromText(datePhrase ?? correctedTranscript);
    title = aiDraft.title?.trim() || title;
    description = aiDraft.description || null;
    tags = aiDraft.tags || [];
    finalPriority = p;

    let taskPriority = finalPriority;
    if (taskPriority === 'urgent') taskPriority = 'high';

    task = {
      title,
      description,
      datePhrase,
      dueDate,
      isRecurring: false,
      recurrence: null,
      time: null,
      priority: taskPriority,
      tags
    };
  }

  // 3. Structured log metrics for observability
  const latency = Date.now() - startAt;
  console.info({
    event: 'intent.complete',
    request_id: requestId,
    provider: chosenProvider || 'fallback',
    latency_ms: latency,
    intent,
    confidence,
    parse_success: !!chosenProvider,
    fallback_used: !chosenProvider,
    missing_fields: missingFields,
  });

  return {
    // Backward compatibility fields
    title,
    description,
    datePhrase,
    dueDate,
    priority: finalPriority,
    tags,
    confidence,

    // Rich Voice Agent fields
    intent,
    isClarificationRequired,
    clarificationQuestion,
    missingFields,
    task,
    updateData,
    completeData,
    searchData,
    provider: chosenProvider || 'fallback',
    latency_ms: latency
  };
}

async function requestOpenRouter(transcript) {
  const apiKey = getNextOpenRouterKey();
  if (!apiKey) throw new Error("No OPENROUTER_API_KEY");

  const client = getOpenRouterClientForKey(apiKey);
  const completion = await client.chat.completions.create({
    model: process.env.AI_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: transcript },
    ],
    temperature: 0,
  });

  return completion?.choices?.[0]?.message?.content || "";
}

async function requestGemini(transcript) {
  const apiKey = getNextGeminiKey();
  if (!apiKey) throw new Error("No GEMINI_API_KEY");

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [{ text: `${SYSTEM_PROMPT}\n\nTranscript: ${transcript}` }]
      }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) throw new Error(`Gemini failed: ${response.status}`);
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function requestOllama(transcript) {
  const url = `${OLLAMA_HOST}/api/generate`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      ...(OLLAMA_API_KEY && { "Authorization": `Bearer ${OLLAMA_API_KEY}` })
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: `${SYSTEM_PROMPT}\n\nTranscript: ${transcript}`,
      stream: false,
      options: {
        temperature: 0,
        num_predict: 512,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama failed: ${response.status} ${errorText}`);
  }
  
  const data = await response.json();
  return data?.response || "";
}
