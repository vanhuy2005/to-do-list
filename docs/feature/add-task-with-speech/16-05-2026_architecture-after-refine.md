# Kiến trúc Production — Voice-to-Task (Refined v2)

> **Nguyên tắc thiết kế:** Mỗi layer có contract đầu vào và đầu ra rõ ràng. Dữ liệu **không được** đi qua boundary mà không được validate. Failure ở layer nào thì xử lý ở đúng layer đó, không leak lên layer trên.

---

## 1. So sánh Tổng quan

| Thành phần | Kiến trúc Cũ (MVP) | Kiến trúc Mới (Production) |
|:---|:---|:---|
| **STT** | Web Speech API (browser-dependent) | Groq Whisper v3 (server-side) |
| **AI scope** | LLM làm tất cả (STT fix + date + priority + title) | LLM chỉ làm: title + tags + datePhrase |
| **Date parsing** | LLM tính → hallucination thường xuyên | `chrono-node` deterministic, UTC+7 cố định |
| **Priority** | LLM guess | Rule engine (regex pattern matching) |
| **JSON parsing** | `JSON.parse` trực tiếp → crash khi AI output sai | `jsonrepair` → `JSON.parse` → Zod validation |
| **Concurrency** | Retry + round-robin key (request amplification) | Global semaphore + per-provider token bucket |
| **UX** | Blocking: spinner 3–5s | Optimistic: card hiện ngay, AI enrich dần |
| **Error handling** | Generic 500/422, khó debug | Typed errors với code, field-level validation log |

---

## 2. Luồng Dữ Liệu Tổng Thể

```
[User Voice]
    │  audio blob (webm/mp4, ≤25MB)
    ▼
[Frontend: MediaRecorder]
    │  POST /api/voice/stt  (multipart/form-data)
    │  ← { transcript, language, duration_ms }
    │  
    │  (ngay lập tức) optimistic draft hiện ra UI
    │
    │  POST /api/voice-task  (JSON: { transcript })
    ▼
[Backend: STT Layer]           ← Groq Whisper v3
    │  Contract out: { transcript: string, language: string }
    ▼
[Backend: Normalization]       ← strip noise, detect language
    │  Contract out: { cleanTranscript: string }
    ▼
[Backend: Concurrency Governor]← global semaphore + token bucket
    │  Contract: đảm bảo ≤3 AI calls đồng thời
    ▼
[Backend: Intent Layer (LLM)]  ← chỉ extract: title, datePhrase, tags
    │  Raw string output (có thể malformed)
    ▼
[Backend: Recovery Layer]      ← jsonrepair → JSON.parse → Zod
    │  Contract out: { title, datePhrase, tags, confidence }
    ▼
[Backend: NLP Engine]          ← chrono-node (date) + regex (priority)
    │  Contract out: { dueDate: ISO8601|null, priority: enum }
    ▼
[Backend: Response Assembly]
    │  { title, dueDate, priority, tags, confidence }
    ▼
[Frontend: Task Preview Card]
    │  User confirm/edit
    ▼
[POST /api/tasks → MongoDB]
```

---

## 3. Chi Tiết Từng Layer & Data Contract

### Layer A — Audio Capture (Frontend)

**Trách nhiệm:** Thu âm, detect format, gửi lên server. KHÔNG làm gì với audio.

**Input:** User action (tap mic button)

**Output contract (gửi lên server):**
```
Content-Type: multipart/form-data
Field: audio  (Blob)
  - mimeType: audio/webm;codecs=opus | audio/mp4 | audio/ogg
  - maxSize: 25MB
  - maxDuration: 60 giây (auto-stop)
```

**Failure modes & xử lý:**
```
getUserMedia denied   → state IDLE, toast "Cần quyền truy cập microphone"
Network timeout       → state ERROR, toast "Không kết nối được, thử lại"
Blob size > 25MB      → state ERROR, toast "Ghi âm quá dài"
```

**Điều cần tránh:**
- KHÔNG dùng Web Speech API làm primary (chỉ dùng làm emergency fallback nếu Groq down).
- KHÔNG gửi raw audio URI hay base64 — chỉ gửi Blob qua multipart.

---

### Layer B — STT Service (Backend, Groq Whisper)

**Trách nhiệm:** Nhận audio blob, trả về transcript chuẩn hóa.

**Input contract:**
```javascript
{
  audioBuffer: Buffer,   // raw bytes từ multipart upload
  mimeType: string,      // audio/webm | audio/mp4 | audio/ogg
  requestId: string,     // UUID, dùng cho tracing
}
```

**Output contract (khi thành công):**
```javascript
{
  transcript: string,    // text đã có dấu câu, trim, không rỗng
  language: string,      // "vi" | "en" | "unknown"
  duration_ms: number,   // latency của Groq call
}
```

**Error contract:**
```javascript
// Throw STTError với .code:
'GROQ_TIMEOUT'       → HTTP 504 → frontend toast "Server quá tải, thử lại"
'GROQ_REJECTED'      → HTTP 502 → frontend toast "Lỗi nhận diện giọng nói"
'EMPTY_TRANSCRIPT'   → HTTP 422 → frontend toast "Không nghe thấy gì rõ"
'FILE_TOO_LARGE'     → HTTP 413 → frontend toast "Ghi âm quá dài"
```

**Cấu hình Groq quan trọng:**
```javascript
model: 'whisper-large-v3'  // KHÔNG dùng turbo nếu cần đa ngôn ngữ
response_format: 'verbose_json'  // để nhận language detection
language: undefined         // auto-detect (tiếng Việt + tiếng Anh đều ok)
timeout: 15_000             // 15 giây hard limit
```

**Tại sao Whisper thắng Web Speech API:**
```
Web Speech API:
  - Phụ thuộc Chrome/Safari locale
  - "Call meeting với team" → "co mít tinh với tim"
  - Không reliable với mixed-language (Việt + Anh)

Groq Whisper v3:
  - Server-side, không phụ thuộc browser
  - Mixed-language native support
  - Tự restore dấu câu
  - Latency ~0.3–1s với Groq infrastructure
```

---

### Layer C — Normalization (Backend)

**Trách nhiệm:** Làm sạch transcript trước khi đưa vào AI. Phát hiện và loại bỏ noise.

**Input:** `transcript: string` từ Whisper

**Output contract:**
```javascript
{
  cleanTranscript: string,  // đã trim, normalize whitespace
  detectedLang: 'vi' | 'en' | 'mixed' | 'unknown',
  wordCount: number,
  isLikelyCommand: boolean, // true nếu có từ task-related
}
```

**Xử lý trong layer này:**
```javascript
function normalizeTranscript(transcript, detectedLang) {
  let clean = transcript
    .trim()
    .replace(/\s+/g, ' ')                        // normalize whitespace
    .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF.,!?:;@#\-]/g, '') // giữ tiếng Việt Unicode
    .slice(0, 500);                              // hard cap 500 chars cho AI

  // Detect language mix
  const hasVietnamese = /[àáâãèéêìíòóôõùúăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệ]/i.test(clean);
  const hasEnglish = /[a-zA-Z]{3,}/.test(clean);
  const detectedLang =
    hasVietnamese && hasEnglish ? 'mixed' :
    hasVietnamese ? 'vi' :
    hasEnglish ? 'en' : 'unknown';

  return { cleanTranscript: clean, detectedLang, wordCount: clean.split(' ').length };
}
```

**Gate check — KHÔNG đi tiếp nếu:**
```javascript
if (wordCount < 2) throw new ValidationError('Transcript too short', 'TOO_SHORT');
if (wordCount > 100) clean = clean.split(' ').slice(0, 100).join(' '); // truncate nhẹ
```

---

### Layer D — Concurrency Governor (Backend)

**Trách nhiệm:** Kiểm soát số lượng request đồng thời. KHÔNG để request amplification xảy ra.

**Cơ chế hoạt động:**
```
Request đến
    │
    ├─ Kiểm tra in-flight cache (cùng transcript trong 30s?) → return cached promise
    │
    ├─ Kiểm tra global semaphore (≤3 concurrent?) 
    │     Không → xếp hàng chờ
    │     Chờ quá 8s → throw GovernorError('QUEUE_TIMEOUT')
    │
    └─ Kiểm tra per-provider token bucket
          Provider: openrouter (20 RPM), gemini (15 RPM), groq (30 RPM)
          Hết token → Bottleneck tự queue và delay, không reject
```

**Tại sao cần layer này:**

```
Không có Governor:
  User spam mic 5 lần
  → 5 concurrent requests
  → 5 × retry × fallback = 15–25 requests
  → Provider thấy burst → 429 cascade
  → Tất cả fail

Có Governor:
  User spam mic 5 lần
  → Request 1,2,3: chạy ngay (≤3 concurrent)
  → Request 4,5: xếp hàng chờ
  → In-flight dedup: nếu cùng transcript → chỉ 1 AI call
  → Provider nhận max 3 requests cùng lúc → không 429
```

**Metrics log từ governor:**
```javascript
// Mỗi request log:
{
  event: 'governor.enqueue',
  global_active: N,
  global_pending: M,
  provider: 'openrouter',
  dedup: false
}
```

---

### Layer E — Intent Extraction (LLM)

**Trách nhiệm:** AI chỉ làm đúng 2 việc: tóm tắt title và suy luận tags. KHÔNG tính ngày, KHÔNG gán priority.

**Input:**
```javascript
{ cleanTranscript: string }  // max 500 chars
```

**System Prompt (chính xác — không thêm bớt):**
```
You are a task extraction assistant. Given a voice transcript (may be Vietnamese, English, or mixed), extract a task.

Return ONLY valid JSON — no markdown, no explanation, no extra text:
{
  "title": "concise task title (max 100 chars, preserve original language)",
  "datePhrase": "exact time phrase from transcript or null if none",
  "tags": ["tag1", "tag2"],
  "confidence": 0.0-1.0
}

Rules:
- title: summarize what needs to be done
- datePhrase: copy the EXACT words from the transcript — do NOT convert to a date
- tags: infer from context (max 5, short lowercase words)
- If uncertain, use null or empty array
```

**Output contract (raw từ LLM — CHƯA trusted):**
```
string (có thể là: JSON thuần, JSON trong markdown, JSON có think blocks, prose, garbage)
```

**Mô hình được dùng:**
```
Primary:   OpenRouter → Llama 3.3 70B (hoặc Qwen 2.5 72B)
Fallback1: Gemini Flash 1.5
Fallback2: Ollama (local) — chỉ khi 2 cái trên đều down

Lưu ý: KHÔNG cần model lớn. Task extraction là bài toán nhỏ.
Gemini Flash 1.5 đủ dùng và nhanh hơn Llama 70B nhiều.
```

---

### Layer F — Output Recovery (Backend)

**Đây là layer quan trọng nhất — không được skip.**

**Trách nhiệm:** Biến raw LLM output (unreliable) thành structured object (reliable).

**Pipeline xử lý từng bước:**

```
Raw string từ LLM
    │
    ▼ [Step 1: Strip noise]
    │  - Xóa <think>...</think> blocks (DeepSeek)
    │  - Xóa ```json ... ``` markdown fences  
    │  - Xóa text trước ký tự '{' đầu tiên
    │  - Xóa text sau ký tự '}' cuối cùng
    │
    ▼ [Step 2: jsonrepair]
    │  - Fix trailing commas: {"a":1,} → {"a":1}
    │  - Fix missing quotes: {title: "test"} → {"title":"test"}
    │  - Fix truncated JSON: {"title":"test" → {"title":"test"}
    │  - Fix escaped chars sai
    │
    ▼ [Step 3: JSON.parse]
    │  Nếu fail sau repair → throw ParseError (KHÔNG retry AI)
    │
    ▼ [Step 4: Zod validation với strict schema]
    │  Schema: { title: string, datePhrase: string|null, tags: string[], confidence: number }
    │  .strict() → reject fields lạ (dueDate, priority, etc. — AI không được phép điền)
    │  Coerce: tags không phải array → wrap thành array
    │
    ▼ [Step 5: Output]
    { title: string, datePhrase: string|null, tags: string[], confidence: number }
```

**Failure handling:**
```javascript
// Nếu recover hoàn toàn thất bại:
→ KHÔNG throw ra user
→ Return fallback draft:
  { title: transcript.slice(0, 100), datePhrase: null, tags: [], confidence: 0.2 }
→ Log đầy đủ rawOutput để debug
```

**Các pattern AI hay fail (và cách recovery xử lý):**

| LLM output | Sau recovery |
|:---|:---|
| `` ```json\n{"title":"Test"}\n``` `` | `{"title":"Test"}` |
| `{"title":"Test","dueDate":"2026-05-17"}` | Strip `dueDate` (strict schema) |
| `{"title":"Test",}` | `{"title":"Test"}` |
| `Here is the task: {"title":"Test"}` | Strip prefix |
| `<think>reasoning</think>{"title":"Test"}` | Strip think block |
| `{"title":"Test"` (truncated) | jsonrepair bổ sung `}` |

---

### Layer G — NLP Engine (Deterministic)

**Trách nhiệm:** Tính toán `dueDate` và `priority` HOÀN TOÀN không phụ thuộc AI.

**Input:**
```javascript
{
  datePhrase: string | null,  // từ AI: "sáng mai", "Friday next week"
  cleanTranscript: string,    // fallback nếu datePhrase null
}
```

**Output contract:**
```javascript
{
  dueDate: string | null,  // ISO 8601 với timezone Asia/Ho_Chi_Minh, hoặc null
  priority: 'urgent' | 'high' | 'medium' | 'low',
}
```

**Date parsing logic:**
```
1. Thử parse datePhrase (nếu AI extract được)
2. Nếu không có datePhrase, thử parse từ cleanTranscript
3. Nếu cả hai fail → dueDate = null (KHÔNG default về hôm nay)

Lý do KHÔNG default: "Mua sữa" không nên tự dưng có deadline hôm nay.
```

**Vietnamese date mapping (chrono-node không biết tiếng Việt):**
```javascript
const VI_DATE_MAP = {
  'mai':              'tomorrow',
  'mốt':             'day after tomorrow',
  'hôm nay':         'today',
  'tuần sau':        'next week',
  'tuần tới':        'next week',
  'cuối tháng':      'end of month',
  'sáng':            'at 8:00 AM',
  'chiều':           'at 2:00 PM',
  'tối':             'at 7:00 PM',
  'thứ 2':           'Monday',
  'thứ 3':           'Tuesday',
  'thứ 4':           'Wednesday',
  'thứ 5':           'Thursday',
  'thứ 6':           'Friday',
  'thứ 7':           'Saturday',
  'chủ nhật':        'Sunday',
};
```

**Priority rule engine (thứ tự ưu tiên từ cao xuống thấp):**
```javascript
const PRIORITY_RULES = [
  { pattern: /gấp|urgent|asap|ngay bây giờ|immediately/i, level: 'urgent' },
  { pattern: /deadline|hạn chót|hết hạn|quan trọng|important|critical/i, level: 'high' },
  { pattern: /low|thấp|không gấp|khi rảnh|whenever/i, level: 'low' },
  // Default: medium
];
```

---

### Layer H — Response Assembly & Final Validation

**Trách nhiệm:** Ghép kết quả từ LLM layer (title, tags) và NLP layer (dueDate, priority). Validate lần cuối trước khi trả về frontend.

**Final output schema (nguồn sự thật cuối cùng):**
```javascript
const VoiceTaskResponseSchema = z.object({
  title:       z.string().min(1).max(200),
  dueDate:     z.string().datetime().nullable(),  // ISO 8601 hoặc null
  priority:    z.enum(['urgent', 'high', 'medium', 'low']),
  tags:        z.array(z.string()).max(5),
  confidence:  z.number().min(0).max(1),
  // Internal fields — KHÔNG expose ra frontend
}).strip();  // strip() loại bỏ mọi field dư thừa
```

**HTTP response shape (frontend expects):**
```json
{
  "title": "Gửi báo cáo cho Nam",
  "dueDate": "2026-05-17T08:00:00+07:00",
  "priority": "high",
  "tags": ["work", "report"],
  "confidence": 0.87
}
```

**Error responses (không bao giờ expose stack trace):**
```json
// 422 — schema fail (không ẩn, frontend cần biết để hiện graceful UI)
{ "error": "Could not extract a valid task", "code": "PARSE_FAILED" }

// 503 — queue full
{ "error": "System too busy, please try again in a moment", "code": "QUEUE_TIMEOUT" }

// 504 — STT timeout
{ "error": "Speech recognition timed out", "code": "STT_TIMEOUT" }
```

---

## 4. UX Flow — Optimistic Async

**Cốt lõi:** User không bao giờ stare vào spinner trắng. Luôn có nội dung để nhìn.

```
T+0s    User dừng nói
T+0.3s  MediaRecorder stop, gửi blob lên /api/voice/stt
T+1.2s  Whisper trả về transcript → hiện TaskPreviewCard với title = transcript thô
        (dueDate, priority, tags hiển thị skeleton pulse)
T+1.2s  (song song) Gọi /api/voice-task với transcript → AI pipeline
T+2.5s  AI trả về enriched data → skeleton replace bằng data thật
        User thấy card hoàn chỉnh — total perceived latency: ~1.2s
```

**State machine frontend:**
```
IDLE
  │ (tap mic)
  ▼
RECORDING
  │ (stop tap / auto-stop 60s)
  ▼
TRANSCRIBING   ← chờ Whisper (~0.3–1s)
  │ (transcript ready)
  ▼
ENRICHING      ← TaskPreviewCard hiện với skeleton, chờ AI (~1–2s)
  │ (AI done) ─────────────────── (AI failed)
  ▼                                ▼
PREVIEW                          PREVIEW (với dữ liệu tối giản)
  │ (confirm)
  ▼
IDLE
```

---

## 5. Điều Không Thay Đổi (Giữ Nguyên Từ MVP)

| Component | Lý do giữ |
|:---|:---|
| `taskValidator.js` (Zod) | Đã có, chỉ update schema |
| MongoDB Task model | Không thay đổi data structure |
| `voiceRateLimit.js` | Vẫn cần per-user rate limit (governor là per-system) |
| Confirm/Edit flow ở `TaskPreviewCard` | UX tốt, giữ nguyên |
| Provider fallback chain (OpenRouter → Gemini → Ollama) | Giữ, chỉ thu hẹp scope của AI call |

---

## 6. Observability — Metrics Cần Track

```javascript
// Metrics theo thứ tự debug priority:

voice.stt.latency_ms          // Groq Whisper latency
voice.stt.detected_language   // vi | en | mixed | unknown
voice.stt.error_code          // GROQ_TIMEOUT | EMPTY_TRANSCRIPT

voice.intent.latency_ms       // AI call latency
voice.intent.provider         // openrouter | gemini | ollama
voice.intent.confidence       // 0–1

voice.parse.fail_count        // số lần jsonrepair fail
voice.parse.repair_needed     // số lần jsonrepair cứu được

voice.governor.queue_depth    // số request đang chờ
voice.governor.dedup_hit      // số lần skip nhờ in-flight cache
voice.governor.timeout_count  // số lần reject vì chờ quá 8s

voice.nlp.date_found          // chrono-node tìm được ngày
voice.nlp.priority_rule_hit   // rule engine tìm được priority

voice.e2e.latency_ms          // tổng thời gian từ transcript → response
voice.e2e.error_rate          // % request fail trong 5 phút
```

---

## 7. Mục Tiêu Đạt Được Sau Upgrade

| Metric | Trước | Sau |
|:---|:---|:---|
| Lỗi 429 | Thường xuyên | Gần về 0 (governor kiểm soát) |
| Lỗi 422 | Thường xuyên | < 5% (recovery layer + strict schema) |
| Tiếng Việt accuracy | ~60% (Web Speech) | ~95% (Whisper v3) |
| Mixed language (Việt + Anh) | Fail thường xuyên | Hoạt động tốt (Whisper native) |
| AI date hallucination | Thường xuyên | Loại bỏ hoàn toàn (chrono-node) |
| Perceived latency | 3–5s (blocking) | ~1.2s (optimistic UI) |
| Debug khi fail | Khó (generic 500) | Rõ ràng (typed errors + request_id) |
