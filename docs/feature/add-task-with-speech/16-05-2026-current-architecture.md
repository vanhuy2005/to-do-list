Listed directory backend
Listed directory frontend
Viewed implementation-plan.md:1-800
Ran command: `dir /s /b to-do-list\backend\src to-do-list\frontend\src`
Ran command: `ls -R to-do-list/backend/src`
Ran command: `ls -R to-do-list/frontend/src`
Viewed voiceTaskRouters.js:1-85
Viewed aiService.js:1-720
Viewed VoiceMicButton.jsx:1-389

Dựa trên việc tìm hiểu mã nguồn hiện tại, tôi xin trình bày chi tiết về kiến trúc, pipeline và các layer của chức năng **Add Task with Speech (AI-powered)**:

### 1. Kiến trúc (Codebase Structure)
Chức năng này được tách biệt rõ ràng giữa Frontend và Backend, sử dụng mô hình **Client-side STT + Backend AI Proxy**.

**Các file chính liên quan:**
*   **Frontend (`to-do-list/frontend/src/`):**
    *   [`VoiceMicButton.jsx`](file:///c:/Users/Admin/Desktop/cong-nghe-web-giua-ki/to-do-list/frontend/src/components/VoiceMicButton.jsx): Thành phần UI chính, xử lý ghi âm và điều khiển trạng thái (IDLE, LISTENING, PROCESSING, ERROR).
    *   [`TaskPreviewCard.jsx`](file:///c:/Users/Admin/Desktop/cong-nghe-web-giua-ki/to-do-list/frontend/src/components/TaskPreviewCard.jsx): Hiển thị bản phác thảo task (draft) từ AI để người dùng xác nhận hoặc sửa đổi.
    *   [`taskService.js`](file:///c:/Users/Admin/Desktop/cong-nghe-web-giua-ki/to-do-list/frontend/src/services/taskService.js): Chứa API call `createVoiceDraft`.
*   **Backend (`to-do-list/backend/src/`):**
    *   [`voiceTaskRouters.js`](file:///c:/Users/Admin/Desktop/cong-nghe-web-giua-ki/to-do-list/backend/src/routes/voiceTaskRouters.js): Route xử lý POST request `/api/voice-task`.
    *   [`aiService.js`](file:///c:/Users/Admin/Desktop/cong-nghe-web-giua-ki/to-do-list/backend/src/services/aiService.js): "Trái tim" của tính năng, xử lý logic phức tạp với AI (Prompt, Fallback, Cache, Rate Limit).
    *   [`taskValidator.js`](file:///c:/Users/Admin/Desktop/cong-nghe-web-giua-ki/to-do-list/backend/src/services/taskValidator.js): Sử dụng thư viện **Zod** để kiểm tra tính hợp lệ của JSON trả về từ AI.
    *   [`voiceRateLimit.js`](file:///c:/Users/Admin/Desktop/cong-nghe-web-giua-ki/to-do-list/backend/src/middleware/voiceRateLimit.js): Giới hạn số lượng yêu cầu (Rate Limiting) để bảo vệ tài nguyên AI.

---

### 2. Pipeline (Luồng dữ liệu và xử lý)
Dữ liệu di chuyển qua 10 bước từ khi người dùng nói đến khi task được lưu:

1.  **Voice to Text (Local):** Trình duyệt sử dụng `Web Speech API` để chuyển giọng nói thành văn bản ngay tại client (không upload file âm thanh, tiết kiệm băng thông và tăng tốc độ).
2.  **Request:** Văn bản (transcript) được gửi lên Backend qua endpoint `/api/voice-task`.
3.  **Sanitization:** Backend lọc bỏ các ký tự rác và kiểm tra các mẫu "Prompt Injection" (ví dụ: "ignore previous instructions") để bảo vệ AI.
4.  **Prompt Engineering:** `aiService.js` lắp văn bản vào một **System Prompt** cực kỳ chi tiết, bao gồm cả ngữ cảnh thời gian hiện tại tại Việt Nam (UTC+7) để AI tính toán `dueDate` chính xác (ví dụ: "sáng mai" -> ngày mai 08:00).
5.  **AI Invocation (Multi-provider):**
    *   Mặc định sử dụng **OpenRouter** (Llama 3.3 70B).
    *   Nếu lỗi/hết hạn mức, hệ thống tự động fallback sang **Google Gemini** hoặc **Ollama** (Local).
    *   Có cơ chế **Round-robin** xoay vòng nhiều API Key để tránh bị giới hạn (Rate limit).
6.  **Robust Parsing:** Xử lý các phản hồi từ AI, loại bỏ các khối `<think>` (của DeepSeek) hoặc markdown fences để lấy JSON thuần túy.
7.  **Validation:** `taskValidator` kiểm tra cấu trúc JSON (phải có `title`, `dueDate` định dạng ISO, `priority`, v.v.).
8.  **Preview (Frontend):** Backend trả về đối tượng task dự kiến. Frontend hiển thị `TaskPreviewCard`.
9.  **User Edit/Confirm:** Người dùng có thể sửa đổi tiêu đề, ngày tháng ngay trên card nếu AI nhận diện chưa chuẩn.
10. **Persistence:** Khi nhấn "Tạo task", frontend gọi API tạo task thông thường để lưu chính thức vào **MongoDB**.

---

### 3. Các Layer (Phân tầng chức năng)

| Tầng (Layer) | Chức năng nhiệm vụ |
| :--- | :--- |
| **UI/View Layer** | `VoiceMicButton`, `TaskPreviewCard`. Quản lý trải nghiệm người dùng, hiệu ứng sóng âm (waveform) và spinner. |
| **Transport Layer** | `axios` (Frontend) và Express Route (Backend). Chịu trách nhiệm truyền tải dữ liệu JSON qua HTTP. |
| **Security Layer** | `voiceRateLimit.js` và hàm `sanitizeVoiceText`. Ngăn chặn tấn công brute-force và prompt injection. |
| **Orchestration Layer** | `voiceTaskRouters.js`. Điều phối việc gọi sanitize -> AI -> Validate -> Response. |
| **AI/Logic Layer** | `aiService.js`. Chứa toàn bộ "trí thông minh": xử lý prompt, quản lý hàng đợi (concurrency queue), retry với exponential backoff, và cơ chế cache kết quả trong 10 phút. |
| **Validation Layer** | `taskValidator.js`. Đảm bảo dữ liệu từ AI (không cấu trúc) được chuyển thành dữ liệu hợp lệ (có cấu trúc) trước khi đi sâu vào hệ thống. |
| **Data Layer** | `Task.js` (Mongoose Model). Định nghĩa cấu trúc dữ liệu cuối cùng lưu vào cơ sở dữ liệu. |

**Đặc điểm nổi bật:** Hệ thống này có khả năng chịu lỗi (Resilience) rất cao nhờ cơ chế **Auto-cascade** (tự động chuyển đổi nhà cung cấp AI) và **In-flight dedup** (nếu nhiều request cùng nội dung gửi tới, hệ thống chỉ gọi AI một lần và chia sẻ kết quả).