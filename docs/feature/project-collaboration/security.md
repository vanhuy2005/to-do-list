# Đánh giá An ninh & Bảo mật: Collaborative Project Workspace System

Tài liệu này trình bày các biện pháp bảo mật nâng cao được áp dụng cho Không gian Làm việc Dự án Cộng tác nhằm bảo vệ hệ thống trước các cuộc tấn công khai thác, chống spam, ngăn ngừa rò rỉ dữ liệu và kiểm soát truy cập chặt chẽ.

---

## 1. Cơ chế Mã hóa & Bảo mật Token Mời

### 1.1 Khắc phục Lỗ hổng Plaintext Token cũ
Trước đây, các mã liên kết mời được lưu trực tiếp dưới dạng văn bản thuần túy (plaintext) trong MongoDB. Nếu database bị rò rỉ hoặc bị truy cập trái phép (ví dụ qua lỗi SQL Injection / NoSQL Injection ở phân hệ khác), kẻ tấn công có thể sử dụng các token này để xâm nhập vào bất kỳ dự án riêng tư nào.

### 1.2 Giải pháp Băm Một Chiều (SHA-256 Hash)
Để giải quyết lỗ hổng này, hệ thống áp dụng chiến lược băm một chiều bảo mật:
1.  **Sinh mã:** Khi tạo link mời, backend sinh ra một chuỗi ngẫu nhiên có độ entropy cực cao:
    ```javascript
    import crypto from "crypto";
    const rawToken = crypto.randomBytes(32).toString("hex"); // 64 ký tự Hexadecimal
    ```
    Chuỗi này cung cấp 256 bits entropy, hoàn toàn bất khả thi trước các cuộc tấn công brute-force.
2.  **Băm và Lưu trữ:** Backend thực hiện băm chuỗi này bằng thuật toán SHA-256 và lưu mã băm vào trường `tokenHash` trong MongoDB:
    ```javascript
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    ```
    *Tại sao dùng SHA-256 thay vì bcrypt?* Bcrypt được thiết kế để làm chậm quá trình băm mật khẩu (chống brute-force mật khẩu có độ phức tạp thấp). Đối với token ngẫu nhiên 256-bit, không có nguy cơ đoán trúng bằng brute-force thông thường, việc băm nhanh bằng SHA-256 giúp tối ưu hiệu năng máy chủ mà vẫn đảm bảo tính bảo mật tuyệt đối.
3.  **Xác thực:** Khi người dùng click vào link mời, họ gửi lên `rawToken` gốc. Backend thực hiện băm `rawToken` nhận được và so sánh chính xác trường `tokenHash` trong database. Bản thân `rawToken` không bao giờ được lưu vào cơ sở dữ liệu.

---

## 2. Phòng chống Tấn công dò mã (Brute-Force & Timing Attack)

### 2.1 Giới hạn Tốc độ (Rate Limiting) trên các Endpoint Nhạy cảm
Các endpoint tham gia dự án được bảo vệ bằng lớp middleware giới hạn tần suất truy cập độc lập nhằm ngăn chặn bot quét mã mời:

| Endpoint | Giới hạn tần suất | Mục tiêu bảo vệ |
|---|---|---|
| `POST /api/v1/projects/join/:token` | 10 requests / 15 phút per IP | Chống quét brute-force link mời 64 ký tự |
| `POST /api/v1/projects/join-code` | 5 requests / 15 phút per IP | Chống quét brute-force mã ngắn 6 ký tự |

### 2.2 Kỹ thuật Làm trễ Nhân tạo (Artificial Timing Delay)
Để đối phó với Timing Attacks (tấn công phân tích thời gian phản hồi của CPU để suy đoán mã đúng), tất cả các yêu cầu join dự án thất bại sẽ bị ép buộc trì hoãn (sleep/delay) **500ms** trước khi trả về kết quả cho client. Điều này làm giảm đáng kể tốc độ thử nghiệm của kẻ tấn công và triệt tiêu khả năng suy đoán logic so sánh chuỗi của cơ sở dữ liệu.

---

## 3. Ngăn ngừa Lạm dụng Hệ thống (Abuse Prevention)

Để ngăn chặn việc một người dùng spam tạo tài nguyên gây tràn ngập cơ sở dữ liệu (Denial of Service - DoS), hệ thống thực thi các ngưỡng giới hạn cứng (Hard Limits):

*   **Số dự án tối đa một người sở hữu:** 50 dự án.
*   **Số thành viên tối đa trong một dự án:** 100 thành viên (Cấu hình linh hoạt).
*   **Số share link hoạt động tối đa của một dự án:** 10 liên kết.
*   **Tần suất tạo dự án:** Tối đa 10 dự án trong vòng 1 giờ cho mỗi tài khoản.
*   **Thời gian hết hạn mặc định của Link mời:** 7 ngày (Tối đa cấu hình là 30 ngày).

---

## 4. Kiến trúc Bảo vệ Đa Lớp (Defense in Depth)

Quyền thực hiện một hành động (Ví dụ: Thêm task vào dự án) được xác thực chặt chẽ qua 4 tầng bảo vệ liên tiếp trên Backend:

```
[Request] ──> TẦNG 1:authenticateToken (Giải mã JWT, lấy userId)
                │
                └──> TẦNG 2:Membership Check (Kiểm tra xem userId có thuộc project)
                               │
                               └──> TẦNG 3:Role Cascade (Xác định vai trò: Owner/Editor/Viewer)
                                              │
                                              └──> TẦNG 4:Action Permission (Chặn Viewer thêm task)
```

---

## 5. Phòng chống Leo thang Đặc quyền (Privilege Escalation)

Hệ thống thiết lập các quy tắc bất biến để ngăn chặn việc thành viên tự nâng cấp quyền hạn của mình hoặc chiếm đoạt tài nguyên dự án:

1.  **Quyền hạn Bất khả xâm phạm của Owner:**
    *   Không ai có thể thay đổi vai trò hoặc xóa Owner khỏi dự án ngoại trừ chính Owner đó thực hiện chuyển giao (`transfer`).
    *   Editor hoặc Commenter không thể tự nâng cấp vai trò của mình lên Owner hoặc Editor khác cấp cao hơn.
2.  **Khóa vai trò khi gia nhập:** Vai trò của người tham gia qua link được cố định từ cấu hình lúc tạo link mời. Người dùng không thể gửi kèm tham số để tự chọn vai trò khi click join.
3.  **Không tự đổi vai trò (Self-role Modification Blocked):** Một thành viên không thể tự chỉnh sửa vai trò của bản thân trong mảng `members` (Ví dụ: Một Editor tự hạ mình xuống Viewer để trốn tránh trách nhiệm, hoặc tự nâng lên Owner).
