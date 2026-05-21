# Voice-to-Task Feature — Implementation Runbook

> **Dự án:** To-Do List App — Voice Input với AI Screening (Tiếng Việt)
> **Phiên bản:** 1.0
> **Ngày cập nhật:** 2026-05-04
> **Mục tiêu chi phí API:** $0/tháng (cho đến khi scale production)

---

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Tech Stack & Lý do chọn](#2-tech-stack--lý-do-chọn)
3. [Cấu hình Free AI API (Zero Cost)](#3-cấu-hình-free-ai-api-zero-cost)
4. [Phase 1 — Frontend Voice UI](#4-phase-1--frontend-voice-ui)
5. [Phase 2 — Backend AI Proxy](#5-phase-2--backend-ai-proxy)
6. [Phase 3 — AI Prompt Engineering](#6-phase-3--ai-prompt-engineering)
7. [Phase 4 — Integration & State Management](#7-phase-4--integration--state-management)
8. [Phase 5 — Edge Cases & Error Handling](#8-phase-5--edge-cases--error-handling)
9. [Checklist Deploy](#9-checklist-deploy)
10. [Kế hoạch Scale (khi có người dùng thật)](#10-kế-hoạch-scale-khi-có-người-dùng-thật)

---

## 1. Tổng quan kiến trúc

### Luồng xử lý chính (Happy Path)

```
[User nhấn mic]
      │
      ▼
[Browser: Web Speech API]  ← STT chạy LOCAL, không tốn phí, không upload audio
      │  transcript thô (string)
      ▼
[React Client]  ──── POST /api/voice-task ────▶  [Node.js/Express Backend]
                      { text, timestamp }                │
                                                         │  Lắp vào Prompt Template
                                                         ▼
                                               [OpenRouter API — Free Model]
                                                         │  JSON response
                                                         ▼
                                               [Validate JSON Schema]
                                                         │
                                               [Save to Database]
                                                         │
                      ◀──── 201 Created ────────────────┘
                      { task object }
      │
      ▼
[Hiển thị Preview Card → User xác nhận → Task vào list]
```

### Nguyên tắc thiết kế kiến trúc

- **STT xảy ra 100% tại client** — không upload file âm thanh lên server, giảm latency và chi phí bandwidth
- **Backend là proxy** — giấu API key, xử lý prompt, validate output trước khi vào DB
- **AI chỉ nhận text** — input nhỏ, token ít, phù hợp với rate limit của free tier
- **Preview trước khi lưu** — tránh tạo task rác, cho phép user sửa lỗi STT

---

## 2. Tech Stack & Lý do chọn

| Layer | Công nghệ | Lý do chọn |
|---|---|---|
| Frontend STT | **Web Speech API** native | Miễn phí, hỗ trợ `vi-VN`, không cần thư viện ngoài |
| React wrapper | **react-speech-recognition** | Quản lý state (listening/transcript/error) dễ hơn, abort controller sẵn |
| AI Service | **OpenRouter (free tier)** | 33+ free models, API OpenAI-compatible, 0đ/tháng |
| AI Model | **`deepseek/deepseek-r1-0528:free`** hoặc `openrouter/free` | Mạnh, miễn phí, hiểu tiếng Việt tốt |
| Backend | **Node.js + Express** | Proxy API key, xử lý prompt, validate schema |
| Database | **MongoDB + mongoose** (đã có sẵn) | Không thay đổi stack hiện tại |
| State | **React useState + useReducer** | Đủ cho feature này, không cần thêm Redux |

### 4.4 CSS States (tham khảo - điều chỉnh để đúng với ràng buộc Pop Art style)
tận dụng Framer Motion (thay vì viết CSS keyframes thuần) sẽ giúp các chuyển động layout mượt mà hơn rất nhiều thiết kế đảm bảo pop art style
```css
/* mic-btn trạng thái listening: pulse animation */
@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}

.mic-btn.listening {
  animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  background: var(--primary-foreground);
}

/* waveform animation trong modal */
.waveform-bar {
  animation: waveform-rise 0.3s ease-out;
  background: linear-gradient(to top, var(--primary), #ff4e50);
}

@keyframes waveform-rise {
  from { transform: scaleY(0); }
  to { transform: scaleY(1); }
}
```

### Tại sao KHÔNG dùng Google Cloud STT

Google Cloud STT chính xác hơn nhưng tốn **$0.006/phút** audio. Với Web Speech API:
- Miễn phí hoàn toàn
- Hỗ trợ `vi-VN` với Chrome, Edge, Safari
- Latency thấp hơn (chạy local)
- Đủ tốt cho câu lệnh task ngắn (< 30 giây)

> **Ghi chú:** Nếu sau này accuracy Web Speech API không đủ với giọng địa phương (Miền Nam, vùng sâu), xem xét migrate sang Whisper API của Groq (free tier, hỗ trợ Vietnamese).

---

## 3. Cấu hình Free AI API (Zero Cost)

### Option A — OpenRouter (Khuyến nghị cho MVP)

**Ưu điểm:** 33+ free models, 20 req/phút, 200 req/ngày, không cần credit card, API OpenAI-compatible.

**Bước 1: Đăng ký**
```
1. Truy cập https://openrouter.ai
2. Sign up bằng Google/GitHub
3. Vào Settings → API Keys → Create Key
4. Copy key: sk-or-v1-xxxxxxxxxxxx
```

**Bước 2: Chọn model**

Model khuyến nghị theo thứ tự ưu tiên:

```
1. openrouter/free            ← auto-chọn best free model, dùng khi không quan tâm model cụ thể
2. deepseek/deepseek-r1-0528:free  ← reasoning tốt, hiểu tiếng Việt
3. google/gemini-flash-1.5:free    ← nhanh, hiểu ngữ cảnh tốt
4. meta-llama/llama-3.3-70b-instruct:free  ← fallback ổn định
```

**Bước 3: Test nhanh**
```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openrouter/free",
    "messages": [{"role": "user", "content": "Xin chào, bạn có thể hiểu tiếng Việt không?"}]
  }'
```

### Option B — Google AI Studio / Gemini API (Fallback)

Nếu OpenRouter rate limit ảnh hưởng UX:
```
Free tier: 15 RPM, 1,500 req/ngày, 1M tokens/ngày
Model: gemini-1.5-flash (hỗ trợ tiếng Việt tốt nhất)
Đăng ký: https://aistudio.google.com → Get API Key
```

### Cấu hình `.env` Backend

```env
# Primary: OpenRouter
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxx
AI_PROVIDER=openrouter
AI_MODEL=openrouter/free

# Fallback: Google Gemini
GEMINI_API_KEY=AIzaxxxxxxxxxx

# App
NODE_ENV=development
PORT=3001
DB_URL=postgresql://...
```

---

## 4. Phase 1 — Frontend Voice UI

**Thời gian ước tính: 2 ngày**

### 4.1 Cài đặt dependencies

```bash
npm install react-speech-recognition regenerator-runtime
```

### 4.2 VoiceMicButton Component

Tạo file `src/components/VoiceMicButton/index.jsx`:

```jsx
import { useState, useEffect } from 'react'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'

// 5 trạng thái UI của nút mic
const STATE = {
  IDLE: 'idle',           // Chờ user nhấn
  LISTENING: 'listening', // Đang ghi âm — hiện waveform
  PROCESSING: 'processing', // Đang gọi AI — hiện spinner
  PREVIEW: 'preview',     // AI trả về — hiện draft task
  ERROR: 'error',         // Lỗi — hiện message + retry
}

export default function VoiceMicButton({ onTaskCreated }) {
  const [uiState, setUiState] = useState(STATE.IDLE)
  const [draftTask, setDraftTask] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition()

  // Tự động xử lý khi STT dừng (user thả nút)
  useEffect(() => {
    if (!listening && uiState === STATE.LISTENING && transcript) {
      handleProcessTranscript(transcript)
    }
  }, [listening])

  if (!browserSupportsSpeechRecognition) {
    return <p>Trình duyệt không hỗ trợ voice input. Vui lòng dùng Chrome.</p>
  }

  const startListening = async () => {
    if (!isMicrophoneAvailable) {
      setErrorMsg('Vui lòng cấp quyền microphone trong cài đặt trình duyệt.')
      setUiState(STATE.ERROR)
      return
    }
    resetTranscript()
    setUiState(STATE.LISTENING)
    SpeechRecognition.startListening({
      language: 'vi-VN',
      continuous: false, // Tự dừng sau khi user ngừng nói
    })
  }

  const stopListening = () => {
    SpeechRecognition.stopListening()
    // useEffect sẽ handle phần còn lại
  }

  const handleProcessTranscript = async (text) => {
    if (!text || text.trim().length < 3) {
      setErrorMsg('Không nghe rõ. Bạn hãy nói to và rõ hơn nhé!')
      setUiState(STATE.ERROR)
      return
    }

    setUiState(STATE.PROCESSING)

    try {
      const res = await fetch('/api/voice-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, timestamp: new Date().toISOString() }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Không nhận diện được task. Thử lại nhé!')
        setUiState(STATE.ERROR)
        return
      }

      setDraftTask(data)
      setUiState(STATE.PREVIEW)
    } catch (err) {
      setErrorMsg('Lỗi kết nối. Kiểm tra mạng và thử lại.')
      setUiState(STATE.ERROR)
    }
  }

  const confirmTask = async () => {
    await onTaskCreated(draftTask)
    setDraftTask(null)
    setUiState(STATE.IDLE)
    resetTranscript()
  }

  const cancelPreview = () => {
    setDraftTask(null)
    setUiState(STATE.IDLE)
    resetTranscript()
  }

  const retry = () => {
    setErrorMsg('')
    setUiState(STATE.IDLE)
  }

  return (
    <div className="voice-mic-wrapper">
      {/* Nút Mic chính */}
      {(uiState === STATE.IDLE || uiState === STATE.LISTENING) && (
        <button
          className={`mic-btn mic-btn--${uiState}`}
          onMouseDown={startListening}
          onMouseUp={stopListening}
          onTouchStart={startListening}
          onTouchEnd={stopListening}
          aria-label="Giữ để nói"
        >
          <MicIcon />
          {uiState === STATE.IDLE && <span className="mic-hint">Giữ để nói</span>}
          {uiState === STATE.LISTENING && (
            <>
              <WaveformAnimation />
              <span className="mic-hint mic-hint--active">Đang nghe...</span>
            </>
          )}
        </button>
      )}

      {/* Processing spinner */}
      {uiState === STATE.PROCESSING && (
        <div className="voice-processing">
          <Spinner />
          <p>AI đang xử lý...</p>
        </div>
      )}

      {/* Preview Card */}
      {uiState === STATE.PREVIEW && draftTask && (
        <TaskPreviewCard
          task={draftTask}
          rawText={transcript}
          onConfirm={confirmTask}
          onCancel={cancelPreview}
          onEdit={(updatedTask) => setDraftTask(updatedTask)}
        />
      )}

      {/* Error state */}
      {uiState === STATE.ERROR && (
        <div className="voice-error">
          <p>{errorMsg}</p>
          <button onClick={retry}>Thử lại</button>
        </div>
      )}

      {/* Tooltip hướng dẫn khi idle */}
      {uiState === STATE.IDLE && (
        <p className="voice-tooltip">
          Thử nói: <em>"Nhắc mình gửi báo cáo cho sếp vào thứ 6 tuần này"</em>
        </p>
      )}
    </div>
  )
}
```

### 4.3 TaskPreviewCard Component

Tạo file `src/components/TaskPreviewCard/index.jsx`:

```jsx
export default function TaskPreviewCard({ task, rawText, onConfirm, onCancel, onEdit }) {
  const [editMode, setEditMode] = useState(false)
  const [localTask, setLocalTask] = useState(task)

  const priorityLabel = { high: '🔴 Cao', medium: '🟡 Trung bình', low: '🟢 Thấp' }

  return (
    <div className="task-preview-card">
      <div className="task-preview-card__header">
        <span className="task-preview-card__badge">AI Draft</span>
        <span className="task-preview-card__raw">"{rawText}"</span>
      </div>

      <div className="task-preview-card__body">
        {editMode ? (
          <input
            value={localTask.title}
            onChange={(e) => setLocalTask({ ...localTask, title: e.target.value })}
            className="task-preview-card__edit-input"
            autoFocus
          />
        ) : (
          <h3 className="task-preview-card__title">{localTask.title}</h3>
        )}

        <div className="task-preview-card__meta">
          {localTask.dueDate && (
            <span className="meta-chip">
              📅 {formatViDate(localTask.dueDate)}
            </span>
          )}
          <span className="meta-chip">{priorityLabel[localTask.priority]}</span>
          {localTask.tags?.map((tag) => (
            <span key={tag} className="meta-chip meta-chip--tag">#{tag}</span>
          ))}
        </div>
      </div>

      <div className="task-preview-card__actions">
        <button onClick={() => setEditMode(!editMode)} className="btn-ghost">
          {editMode ? 'Xong' : 'Sửa'}
        </button>
        <button onClick={onCancel} className="btn-ghost btn-ghost--danger">Hủy</button>
        <button onClick={() => onConfirm(localTask)} className="btn-primary">
          Tạo task ✓
        </button>
      </div>
    </div>
  )
}

function formatViDate(isoString) {
  if (!isoString) return null
  return new Date(isoString).toLocaleDateString('vi-VN', {
    weekday: 'short', day: 'numeric', month: 'numeric',
  })
}
```

### 4.4 CSS States (tham khảo - điều chỉnh để đúng với ràng buộc Pop Art style)

```css
/* mic-btn trạng thái listening: pulse animation */
.mic-btn--listening {
  animation: pulse-ring 1.2s ease-out infinite;
  background-color: var(--color-danger);
}

@keyframes pulse-ring {
  0%   { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.4); }
  70%  { box-shadow: 0 0 0 14px rgba(220, 53, 69, 0); }
  100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
}

/* Waveform bars */
.waveform { display: flex; gap: 3px; align-items: center; height: 20px; }
.waveform span {
  width: 3px; background: white; border-radius: 2px;
  animation: wave 0.8s ease-in-out infinite;
}
.waveform span:nth-child(2) { animation-delay: 0.1s; }
.waveform span:nth-child(3) { animation-delay: 0.2s; }
.waveform span:nth-child(4) { animation-delay: 0.3s; }
@keyframes wave {
  0%, 100% { height: 4px; }
  50% { height: 16px; }
}
```

---

## 5. Phase 2 — Backend AI Proxy

**Thời gian ước tính: 1–2 ngày**

### 5.1 Cài đặt dependencies

```bash
npm install express openai zod dotenv
# openai package hoạt động với OpenRouter qua base_url override
```

### 5.2 Cấu trúc thư mục backend

```
server/
├── routes/
│   └── voiceTask.js       ← Route chính
├── services/
│   ├── aiService.js       ← Gọi OpenRouter API
│   └── taskValidator.js   ← Validate JSON từ AI
├── middleware/
│   └── rateLimit.js       ← Giới hạn request per user
└── app.js
```

### 5.3 AI Service (`server/services/aiService.js`)

```javascript
import OpenAI from 'openai'

// OpenRouter hoàn toàn tương thích với OpenAI SDK
const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
    'X-Title': 'TodoApp Voice Feature',
  },
})

const SYSTEM_PROMPT = `Bạn là trợ lý quản lý công việc. Nhiệm vụ: nhận đoạn văn bản tiếng Việt do người dùng nói và trích xuất thành JSON.

Các trường bắt buộc trả về:
- title (string): Tên task ngắn gọn, rõ ràng, bỏ các từ không cần như "nhắc mình", "giúp tôi"
- dueDate (ISO 8601 string | null): Thời hạn. Tính từ thời điểm hiện tại được cung cấp. Hỗ trợ: "sáng mai", "thứ 6", "tuần sau", "cuối tháng", "lúc 3 giờ chiều". null nếu không đề cập.
- priority ("high" | "medium" | "low"): Dựa trên từ ngữ người dùng dùng. "gấp", "quan trọng", "deadline", "khẩn" → high. Mặc định medium.
- tags (array of strings): Phân loại như "công việc", "học tập", "mua sắm", "gia đình", "tài chính", "sức khỏe". Tối đa 3 tags.
- confidence (number 0-1): Độ tin cậy rằng đây là một task hợp lệ.

Quy tắc quan trọng:
1. Nếu văn bản không chứa thông tin task (tiếng ồn, câu vô nghĩa, thử mic): trả về {"error": "Không nhận diện được công việc", "confidence": 0}
2. Sửa lỗi STT phổ biến tiếng Việt: "sáu" vs "6", "thứ sáu" vs "thứ sau", dấu bị sai
3. Chỉ trả về JSON thuần túy, không markdown, không giải thích
4. Thời điểm hiện tại: {CURRENT_DATETIME}
5. Nếu người dùng nói 'Tết', 'Giáng Sinh', hãy tự động chuyển đổi sang ngày dương lịch tương ứng của năm hiện tại.`

export async function processVoiceTask(rawText) {
  const prompt = SYSTEM_PROMPT.replace(
    '{CURRENT_DATETIME}',
    new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
  )

  const completion = await client.chat.completions.create({
    model: process.env.AI_MODEL || 'openrouter/free',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: rawText },
    ],
    max_tokens: 300,
    temperature: 0.2, // Thấp để output nhất quán, có thể predict
    response_format: { type: 'json_object' }, // Force JSON output
  })

  const rawJson = completion.choices[0].message.content
  return JSON.parse(rawJson)
}
```

### 5.4 Validator (`server/services/taskValidator.js`)

```javascript
import { z } from 'zod'

const TaskSchema = z.object({
  title: z.string().min(2).max(200),
  dueDate: z.string().datetime().nullable().optional(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  tags: z.array(z.string().max(30)).max(3).default([]),
  confidence: z.number().min(0).max(1).default(0.8),
})

export function validateAndCleanTask(aiOutput) {
  // Nếu AI trả về error
  if (aiOutput.error) {
    return { valid: false, error: aiOutput.error }
  }

  // Confidence quá thấp → yêu cầu retry
  if (aiOutput.confidence < 0.4) {
    return { valid: false, error: 'Không chắc chắn đây là task. Thử nói rõ hơn nhé!' }
  }

  const parsed = TaskSchema.safeParse(aiOutput)

  if (!parsed.success) {
    return { valid: false, error: 'Dữ liệu không hợp lệ từ AI.' }
  }

  return { valid: true, task: parsed.data }
}
```

### 5.5 Route (`server/routes/voiceTask.js`)

```javascript
import express from 'express'
import { processVoiceTask } from '../services/aiService.js'
import { validateAndCleanTask } from '../services/taskValidator.js'
import { saveTaskToDB } from '../services/taskService.js'

const router = express.Router()

router.post('/voice-task', async (req, res) => {
  const { text, timestamp } = req.body

  // Basic validation
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Thiếu text' })
  }

  if (text.trim().length < 3 || text.trim().length > 1000) {
    return res.status(400).json({ error: 'Nội dung quá ngắn hoặc quá dài' })
  }

  try {
    // Gọi AI
    const aiOutput = await processVoiceTask(text.trim())

    // Validate output
    const { valid, task, error } = validateAndCleanTask(aiOutput)

    if (!valid) {
      return res.status(422).json({ error })
    }

    // LƯU Ý: KHÔNG lưu vào DB ngay
    // Trả về draft để frontend hiển thị preview
    // User xác nhận → gọi POST /api/tasks endpoint riêng
    return res.status(200).json({
      ...task,
      rawTranscript: text, // Giữ lại để user tham chiếu
      source: 'voice',
    })

  } catch (err) {
    console.error('[VoiceTask Error]', err.message)

    // OpenRouter rate limit
    if (err.status === 429) {
      return res.status(429).json({ error: 'Hệ thống bận, vui lòng thử lại sau vài giây.' })
    }

    return res.status(500).json({ error: 'Lỗi server. Thử lại sau.' })
  }
})

export default router
```

---

## 6. Phase 3 — AI Prompt Engineering

**Thời gian ước tính: 1 ngày (testing và fine-tune)**

### 6.1 Test Cases bắt buộc phải pass

Chạy các câu sau và kiểm tra output trước khi go live:

| Input tiếng Việt | Expected Output |
|---|---|
| `"Nhắc mình gửi báo cáo cho sếp Minh vào sáng thứ 6"` | title: "Gửi báo cáo cho sếp Minh", priority: medium, dueDate: thứ 6 |
| `"Mua sữa tươi và rau cải chiều nay gấp"` | title: "Mua sữa tươi và rau cải", priority: high, tags: ["mua sắm"] |
| `"Ờ ờ ờ... test mic một hai ba"` | error: "Không nhận diện được công việc" |
| `"Deadline nộp bài luận văn cuối tháng này"` | title: "Nộp bài luận văn", priority: high |
| `"Đặt lịch khám răng tuần sau thứ tư lúc 9 giờ sáng"` | title: "Đặt lịch khám răng", dueDate: thứ 4 tuần sau 09:00 |
| `"nhớ trả tiền thuê nhà"` | title: "Trả tiền thuê nhà", tags: ["tài chính"] |

### 6.2 Script test nhanh

Tạo file `scripts/test-prompt.js`:

```javascript
import { processVoiceTask } from '../server/services/aiService.js'
import { validateAndCleanTask } from '../server/services/taskValidator.js'

const testCases = [
  "Nhắc mình gửi báo cáo cho sếp vào sáng thứ 6",
  "Mua sữa tươi chiều nay gấp",
  "Ờ ờ ờ test mic một hai ba",
  "Deadline nộp bài cuối tháng",
]

for (const text of testCases) {
  console.log('\n📝 Input:', text)
  const aiOut = await processVoiceTask(text)
  const result = validateAndCleanTask(aiOut)
  console.log('✅ Output:', JSON.stringify(result, null, 2))
}
```

```bash
node scripts/test-prompt.js
```

---

## 7. Phase 4 — Integration & State Management

**Thời gian ước tính: 1 ngày**

### 7.1 Flow xác nhận task (Frontend → DB)

Sau khi user nhấn "Tạo task ✓" trên Preview Card:

```javascript
// Trong TaskList hoặc App component
async function handleVoiceTaskConfirmed(draftTask) {
  try {
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...draftTask,
        createdVia: 'voice', // Tracking analytics
      }),
    })
    const savedTask = await response.json()
    setTasks(prev => [savedTask, ...prev]) // Prepend vào list
    showToast('Task đã tạo thành công! 🎉')
  } catch (err) {
    showToast('Lỗi khi lưu task. Thử lại nhé.', 'error')
  }
}
```

### 7.2 Vị trí đặt VoiceMicButton

```jsx
// Trong TaskInput component hoặc FloatingActionButton
<div className="task-input-row">
  <input placeholder="Thêm task mới..." />
  <VoiceMicButton onTaskCreated={handleVoiceTaskConfirmed} />
</div>
```

---

## 8. Phase 5 — Edge Cases & Error Handling

**Thời gian ước tính: 1 ngày**

| Tình huống | Xử lý |
|---|---|
| User từ chối cấp quyền mic | Hiển thị hướng dẫn từng bước mở quyền trong Settings của Chrome/Safari |
| Browser không hỗ trợ | Ẩn nút mic, không hiển thị gì thêm (graceful degradation) |
| Nói quá 60 giây | `setTimeout` tự dừng STT sau 60s, toast cảnh báo |
| Mất mạng khi gọi AI | Retry 1 lần sau 2 giây, sau đó hiển thị lỗi kết nối |
| OpenRouter rate limit (429) | Toast "Thử lại sau 3 giây", auto-retry với backoff |
| AI trả về JSON sai format | `zod` validation bắt lỗi, trả về error generic cho user |
| STT ra chuỗi rỗng | Check `transcript.trim().length < 3` trước khi gọi API |
| User nói tiếng Anh | AI vẫn xử lý được, prompt không bắt buộc tiếng Việt |
| Nhiều request cùng lúc | Rate limit middleware: max 5 request/phút/user |

### Rate Limit Middleware

```javascript
// server/middleware/rateLimit.js
import rateLimit from 'express-rate-limit'

export const voiceRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 5,              // 5 request/phút/IP
  message: { error: 'Quá nhiều yêu cầu. Vui lòng chờ 1 phút.' },
  standardHeaders: true,
})
```

```javascript
// Trong app.js
app.use('/api/voice-task', voiceRateLimit, voiceTaskRouter)
```

---

## 9. Checklist Deploy

Trước khi đưa lên production, kiểm tra toàn bộ danh sách sau:

### Frontend
- [ ] Web Speech API fallback message cho Firefox
- [ ] Push-to-talk hoạt động trên mobile (touchstart/touchend) Đề xuất bổ sung: Bổ sung logic phân biệt thiết bị. Nếu là Desktop, dùng cơ chế "Tap-to-talk" (Click để bắt đầu, hệ thống tự động ngắt khi im lặng continuous: false hoặc click lần nữa để ngắt).
- [ ] Waveform animation hiển thị đúng khi `listening = true`
- [ ] Preview card render đúng với dữ liệu từ AI
- [ ] Edit title inline trên preview card hoạt động
- [ ] Nút "Tạo task" disabled khi đang saving

### Backend
- [ ] `OPENROUTER_API_KEY` đã set trong môi trường production
- [ ] Biến `APP_URL` set đúng domain (OpenRouter dùng để log)
- [ ] Rate limit middleware đã bật
- [ ] Error logging đủ chi tiết (không log raw transcript chứa PII)
- [ ] Response time < 3 giây (nếu chậm hơn, switch model)

### Testing
- [ ] Chạy hết 6 test cases trong mục 6.1
- [ ] Test trên Chrome (desktop + mobile)
- [ ] Test trên Safari iOS (Web Speech API hỗ trợ hạn chế)
- [ ] Test khi mất mạng giữa chừng
- [ ] Test khi từ chối quyền mic

### Security
- [ ] API key không bao giờ xuất hiện ở frontend/source code client
- [ ] Input sanitization trước khi lắp vào prompt (tránh prompt injection)
- [ ] CORS chỉ cho phép domain của app

Ở Phase 2 (Backend AI Proxy), trước khi ghép rawText vào Prompt, hãy thêm một lớp regex filter nhẹ ở Node.js để loại bỏ các từ khóa nhạy cảm (như "bỏ qua lệnh", "system prompt", "ignore previous instructions") hoặc giới hạn chặt độ dài của input.

---

## 10. Kế hoạch Scale (khi có người dùng thật)

### Khi nào cần upgrade?

| Tình huống | Giải pháp |
|---|---|
| OpenRouter free hit 200 req/ngày | Thêm credits vào OpenRouter (~$5 = ~500K requests) |
| STT accuracy không đủ với giọng địa phương | Migrate sang Groq Whisper API (free tier: 28,800 giây/ngày) |
| Latency AI > 3 giây thường xuyên | Switch sang `google/gemini-flash-1.5:free` hoặc paid tier |
| Cần privacy cao (không muốn text qua bên thứ 3) | Self-host Ollama + Qwen2.5 7B trên VPS |

### Chi phí ước tính khi scale

```
OpenRouter paid:      ~$0.15–0.50 / 1,000 voice requests (tùy model)
Google STT:           $0.006 / phút audio (chỉ cần nếu Web Speech API không đủ)
Groq Whisper:         Miễn phí 28,800 giây/ngày (~480 requests), sau đó $0.02/giờ

→ Với 1,000 user active/ngày, mỗi user dùng voice 3 lần/ngày:
  = 3,000 requests/ngày × $0.0003 ≈ $0.90/ngày = ~$27/tháng
```

---

## Tóm tắt Execution Timeline

```
Ngày 1–2  │ Phase 1: Voice UI + STT integration + CSS states
Ngày 3    │ Phase 2: Backend route + AI service + validator
Ngày 4    │ Phase 3: Prompt testing với 20+ câu tiếng Việt khác nhau
Ngày 5    │ Phase 4: Integration frontend ↔ backend ↔ DB
Ngày 6    │ Phase 5: Edge cases, rate limit, error handling
Ngày 7    │ QA tổng thể + checklist deploy + production deploy
```

**Tổng: 7 ngày — $0 chi phí API**

---

*Tài liệu này là living document. Cập nhật khi thay đổi model AI hoặc thay đổi stack*