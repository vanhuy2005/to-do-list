import OpenAI from 'openai';
import { governor } from './concurrencyGovernor.js';
import { recoverAndValidate } from './outputRecovery.js';
import { parseDateFromText, extractPriority } from './nlpService.js';

// --- Constants & Config ---
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

const parseKeyList = (raw) =>
  String(raw || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

const OPENROUTER_KEYS = parseKeyList(process.env.OPENROUTER_API_KEY);
const GEMINI_KEYS = parseKeyList(process.env.GEMINI_API_KEY);

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:1.5b';
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;

let openRouterKeyIndex = 0;
let geminiKeyIndex = 0;

const getNextOpenRouterKey = () => {
  if (OPENROUTER_KEYS.length === 0) return null;
  return OPENROUTER_KEYS[openRouterKeyIndex++ % OPENROUTER_KEYS.length];
};

const getNextGeminiKey = () => {
  if (GEMINI_KEYS.length === 0) return null;
  return GEMINI_KEYS[geminiKeyIndex++ % GEMINI_KEYS.length];
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

const SYSTEM_PROMPT = `You are a smart task extraction assistant embedded in a Vietnamese to-do app.
Your job: analyze a voice transcript and extract a structured task.

OUTPUT: Return ONLY a valid JSON object. No markdown, no explanation, no text before or after the JSON.

JSON schema (follow exactly):
{
  "title": string,       // The SHORT core action. Max 60 chars. What is the main thing to DO?
  "description": string | null,  // Supporting details, sub-items, or context. Max 300 chars. Null if nothing extra.
  "datePhrase": string | null,   // COPY the exact time expression from the transcript. Do NOT convert to a date. Null if none.
  "tags": string[],     // 1-4 short category tags (lowercase). Infer from context.
  "priority": "low" | "medium" | "high" | "urgent",
  "confidence": number  // 0.0 to 1.0. How certain are you about this extraction?
}

CRITICAL RULES:
- title = the ACTION (verb + core object). Short. Think "what is the task name in a task manager?"
- description = details, items, sub-tasks, people involved, context. NOT a repeat of the title.
- datePhrase = copy EXACT words ("sáng mai", "thứ 6 tuần sau", "Friday morning"). NEVER calculate the date yourself.
- tags = category hints like ["shopping", "work", "meeting", "personal", "urgent"]. Use Vietnamese or English matching the transcript language.
- priority = infer intent (e.g. "gấp", "quan trọng", "urgent" -> high/urgent; "rảnh", "khi nào cũng được" -> low; otherwise medium).
- If the transcript is a reminder/notification ("nhắc tôi...", "remind me to..."), strip the reminder phrase — extract what to DO.

---
FEW-SHOT EXAMPLES (learn the pattern from these):

Input: "Nhắc tôi đi siêu thị mua trứng và sữa vào sáng mai"
Output: {"title":"Đi siêu thị","description":"Mua trứng và sữa","datePhrase":"sáng mai","tags":["mua sắm","thực phẩm"],"priority":"medium","confidence":0.95}

Input: "Call meeting with the marketing team on Friday to discuss Q3 campaign"
Output: {"title":"Meeting với marketing team","description":"Thảo luận chiến dịch Q3","datePhrase":"Friday","tags":["meeting","marketing","work"],"priority":"medium","confidence":0.92}

Input: "Gửi báo cáo tháng 5 cho anh Nam trước 5 giờ chiều hôm nay"
Output: {"title":"Gửi báo cáo tháng 5 cho anh Nam","description":null,"datePhrase":"5 giờ chiều hôm nay","tags":["công việc","báo cáo"],"priority":"medium","confidence":0.93}

Input: "Đặt lịch khám răng tuần sau, nhớ mang theo bảo hiểm y tế"
Output: {"title":"Đặt lịch khám răng","description":"Mang theo bảo hiểm y tế","datePhrase":"tuần sau","tags":["sức khỏe","khám bệnh"],"priority":"medium","confidence":0.91}

Input: "Remind me to buy a birthday gift for mom, something related to cooking"
Output: {"title":"Mua quà sinh nhật cho mẹ","description":"Liên quan đến nấu ăn","datePhrase":null,"tags":["mua sắm","gia đình"],"priority":"medium","confidence":0.88}

Input: "Họp standup hàng ngày lúc 9 giờ sáng với team backend"
Output: {"title":"Họp standup với team backend","description":null,"datePhrase":"9 giờ sáng","tags":["meeting","work","backend"],"priority":"medium","confidence":0.94}

Input: "Fix bug đăng nhập bị lỗi 401 khi dùng token hết hạn, ảnh hưởng production gấp"
Output: {"title":"Fix bug lỗi 401 đăng nhập","description":"Token hết hạn gây lỗi trên production","datePhrase":null,"tags":["bug","backend","production"],"priority":"urgent","confidence":0.97}

Input: "Ôn thi cuối kỳ môn toán, tập trung phần tích phân và đạo hàm"
Output: {"title":"Ôn thi cuối kỳ môn toán","description":"Tập trung phần tích phân và đạo hàm","datePhrase":null,"tags":["học tập","thi cử"],"priority":"medium","confidence":0.90}
---

Now extract the task from the user's transcript. Return ONLY the JSON.`;

/**
 * Full pipeline: transcript → enriched task draft
 */
export async function extractIntent({ transcript, requestId }) {
  const startAt = Date.now();

  let aiDraft = null;
  const providers = ['openrouter', 'gemini', 'ollama'];
  const requestFns = {
    openrouter: () => requestOpenRouter(transcript),
    gemini: () => requestGemini(transcript),
    ollama: () => requestOllama(transcript),
  };

  for (const provider of providers) {
    try {
      const rawOutput = await governor.run(provider, transcript, requestFns[provider]);
      aiDraft = recoverAndValidate(rawOutput, transcript);

      console.info({
        event: 'intent.provider_success',
        provider,
        request_id: requestId,
        confidence: aiDraft.confidence,
        has_description: !!aiDraft.description,
      });
      break; 
    } catch (err) {
      console.warn({
        event: 'intent.provider_fail',
        provider,
        error: err.message,
        code: err.code ?? 'UNKNOWN',
        request_id: requestId,
      });
    }
  }

  if (!aiDraft) {
    console.warn({ event: 'intent.fallback', request_id: requestId, reason: 'All AI providers failed' });
    aiDraft = {
      title: transcript.slice(0, 100).trim() || 'Untitled task',
      description: null,
      datePhrase: null,
      tags: [],
      priority: 'medium',
      confidence: 0.15,
    };
  }

  const dueDate = parseDateFromText(aiDraft.datePhrase ?? transcript);
  const priority = extractPriority(transcript);

  const latency = Date.now() - startAt;
  console.info({
    event: 'intent.complete',
    request_id: requestId,
    latency_ms: latency,
    has_due_date: !!dueDate,
    has_description: !!aiDraft.description,
    priority: aiDraft.priority || priority,
    confidence: aiDraft.confidence,
  });

  return {
    title: aiDraft.title,
    description: aiDraft.description,
    datePhrase: aiDraft.datePhrase,
    dueDate,
    priority: aiDraft.priority || priority,
    tags: aiDraft.tags,
    confidence: aiDraft.confidence,
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
