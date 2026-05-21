# Tasked — Add Task With Speech

## Đã hoàn thành
- [x] Backend AI service (OpenRouter + Gemini fallback)
- [x] Validator output JSON + sanitize input
- [x] Endpoint /api/v1/voice-task + rate limit
- [x] UI mic button + waveform + error states
- [x] Preview card + confirm tạo task
- [x] Tích hợp vào New Task modal

## Đang chờ xác nhận
- [ ] Kiểm thử thực tế với nhiều câu tiếng Việt
- [ ] Kiểm tra mobile (tap-to-talk) trên iOS/Android
- [ ] Review UX copy (voice hint, error message)

## Việc nên làm tiếp
- [ ] Thêm script test prompt cho backend
- [ ] Bổ sung retry/backoff khi AI 429
- [ ] Theo dõi latency và đổi model nếu cần
