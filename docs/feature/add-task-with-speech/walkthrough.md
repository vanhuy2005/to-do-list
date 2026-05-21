# Walkthrough — Add Task With Speech

## Mục tiêu
- Thêm luồng tạo task bằng giọng nói, có preview trước khi lưu.
- Ưu tiên UI theo shadcn components và Pop Art guideline.
- Backend proxy AI, hỗ trợ OpenRouter + fallback Gemini.

## Backend
1. Tạo AI service gọi OpenRouter và fallback Gemini, chuẩn hóa prompt + JSON.
2. Thêm validator để kiểm tra và làm sạch output.
3. Thêm rate limit riêng cho voice.
4. Mở endpoint /api/v1/voice-task (đã bảo vệ bằng auth).

### Env cần thiết (KHÔNG commit key)
```
OPENROUTER_API_KEY=...
AI_PROVIDER=openrouter
AI_MODEL=openrouter/free
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-1.5-flash
APP_URL=http://localhost:5173
```

## Frontend
1. Thêm VoiceMicButton và TaskPreviewCard (shadcn Button/Card/Badge/Input).
2. VoiceMicButton xử lý STT (react-speech-recognition), gọi API lấy draft.
3. TaskPreviewCard hiển thị draft + cho phép sửa tiêu đề + xác nhận tạo task.
4. Tích hợp vào New Task modal (không tạo page mới).

## Luồng UX
1. User bấm mic (desktop: giữ để nói, mobile: chạm để nói).
2. AI trả về draft → hiển thị preview card.
3. User xác nhận → gọi POST /api/v1/tasks.

## Manual test nhanh
1. Đăng nhập, mở modal tạo task mới.
2. Dùng mic đọc: "Nhắc mình gửi báo cáo cho sếp Minh vào sáng thứ 6".
3. Kiểm tra preview hiển thị title, due date, priority.
4. Bấm "Tạo task" → task xuất hiện ở Home.
5. Thử case lỗi: nói câu vô nghĩa hoặc tắt mic.

## Lưu ý
- Không lưu raw transcript trong DB.
- Không log transcript ở server.
- Nếu OpenRouter bị rate limit, chuyển AI_PROVIDER=auto để fallback Gemini.
