# Kế hoạch & Checklist Triển khai (Rollout Checklist): Collaborative Project Workspace System

Tài liệu này cung cấp danh sách các hạng mục kiểm thử (QA), quy trình di chuyển dữ liệu sản xuất, và các kịch bản kiểm tra an toàn sau khi deploy tính năng Không gian Làm việc Dự án Cộng tác.

---

## 1. Giai đoạn 1: Chuẩn bị Trước khi Deploy (Pre-Deployment)

- [ ] **Cập nhật Biến Môi trường (.env):**
    - [ ] Xác minh `ABLY_API_KEY` đã được thêm đầy đủ vào tệp cấu hình của Backend sản xuất.
    - [ ] Cấu hình biến môi trường kết nối Client của Ably ở Frontend.
- [ ] **Cài đặt Thư viện:**
    - [ ] Chạy `npm install ably` ở thư mục `to-do-list/backend` để tích hợp SDK real-time phía máy chủ.
    - [ ] Chạy `npm install ably` ở thư mục `to-do-list/frontend` để tích hợp SDK real-time phía máy khách.
- [ ] **Kiểm tra Schema & Đóng gói Code:**
    - [ ] Xác minh mã di chuyển dữ liệu (Migration Script) đã được viết và chạy thành công ở môi trường Staging/UAT.

---

## 2. Giai đoạn 2: Di chuyển Dữ liệu Sản xuất (Production Migration)

- [ ] **Sao lưu Cơ sở Dữ liệu (Database Backup):**
    - [ ] Tiến hành backup snapshot cơ sở dữ liệu MongoDB Atlas trước khi chạy bất kỳ script chỉnh sửa schema nào.
- [ ] **Chạy Script Khởi tạo Cấu trúc (Migration Script):**
    - [ ] Backfill dữ liệu `emoji` mặc định cho các project cũ.
    - [ ] Đặt trạng thái `status: "active"` cho tất cả dự án có sẵn.
    - [ ] Băm (Hash SHA-256) bất kỳ Plaintext Token nào đang tồn tại trong bảng để nâng cao tính bảo mật tức thời.
- [ ] **Xác minh Chỉ mục (Index Verification):**
    - [ ] Chạy lệnh kiểm tra MongoDB để đảm bảo các index mới (`shareLinks.tokenHash`, `inviteCode.code`) đã được build thành công ở trạng thái `green` (không gây block ghi dữ liệu).

---

## 3. Giai đoạn 3: Kịch bản Kiểm thử Chất lượng (QA Test Scenarios)

### Kịch bản 1: Mời & Tham gia Thời gian thực
- [ ] **Bước 1:** Đăng nhập 2 tài khoản khác nhau trên 2 trình duyệt riêng biệt (Trình duyệt A - Tài khoản Owner, Trình duyệt B - Tài khoản Khách).
- [ ] **Bước 2:** Tài khoản A tạo một dự án mới, chọn emoji 🎯 và nhấn vào nút "Thành viên".
- [ ] **Bước 3:** Tài khoản A sinh một link mời với vai trò `Editor`, sao chép link và gửi cho Tài khoản B.
- [ ] **Bước 4:** Tài khoản B mở link mời, giao diện hiển thị trang chào đón Pop Art với thông tin chính xác. Tài khoản B bấm "ĐỒNG Ý GIA NHẬP!".
- [ ] **Bước 5:** Kiểm tra xem màn hình Tài khoản A có hiển thị avatar của Tài khoản B bay vào khu vực Avatar Stack ở Header thời gian thực ngay lập tức hay không.

### Kịch bản 2: Đồng bộ Hóa Nhiệm vụ qua Ably
- [ ] **Bước 1:** Trên màn hình Tài khoản A và B cùng xem bảng Kanban của dự án chung.
- [ ] **Bước 2:** Tài khoản A tạo một task mới mang tên *"Thiết kế Banner Pop Art"*.
- [ ] **Bước 3:** Xác minh xem task này có xuất hiện tức thì trên cột "Todo" của Tài khoản B mà không cần tải lại trang hay không.
- [ ] **Bước 4:** Tài khoản B kéo thả task này sang cột "Doing".
- [ ] **Bước 5:** Xác minh xem màn hình của Tài khoản A có thấy task tự động di chuyển kèm hiệu ứng mượt mà hay không.

---

## 4. Giai đoạn 4: Kế hoạch Theo dõi & Khắc phục Sự cố (Monitoring & Rollback)

### Chỉ số Cần Giám sát (Key Metrics to Monitor)
*   **Tỷ lệ lỗi API `/join/:token`:** Nếu tỷ lệ lỗi `500` tăng vọt, lập tức kiểm tra lại thư viện mã hóa SHA-256 hoặc kết nối Mongoose.
*   **Ably Connection Errors:** Theo dõi số lượng kết nối bị từ chối hoặc mất kết nối trên bảng điều khiển Ably Dashboard.
*   **Mức độ CPU/RAM tăng đột biến:** Quét xem các cron job dọn dẹp task xóa mềm có bị lặp vô hạn hay không.

### Quy trình Khôi phục (Rollback Plan)
1.  Nếu xảy ra lỗi nghiêm trọng sau khi deploy:
    *   Thực hiện revert code Backend và Frontend về phiên bản ổn định gần nhất.
    *   Giữ nguyên cấu trúc database mới (do các trường mới được thiết kế tương thích ngược, không ảnh hưởng đến code cũ).
    *   Nếu cần khôi phục dữ liệu ban đầu, tiến hành restore từ file Backup đã tạo ở Giai đoạn 2.
