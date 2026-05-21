# Tài liệu Tổng quan: Collaborative Project Workspace System (Hệ thống Không gian Làm việc Dự án Cộng tác)

Hệ thống Không gian Làm việc Dự án Cộng tác là một tính năng chiến lược nhằm chuyển đổi ứng dụng To-Do List cá nhân hiện tại thành một nền tảng quản lý dự án cộng tác đa người dùng thời gian thực (real-time). 

Tài liệu này trình bày các mục tiêu kinh doanh, bài toán của người dùng, phạm vi chức năng, triết lý thiết kế và kế hoạch phát triển tương lai.

---

## 1. Mục tiêu Kinh doanh (Business Goals)

*   **Chuyển đổi Sản phẩm:** Chuyển đổi ứng dụng To-Do cá nhân đơn lẻ thành một nền tảng SaaS cộng tác doanh nghiệp vừa và nhỏ (SME), mở rộng giá trị sử dụng cho đội ngũ/tổ chức.
*   **Tăng trưởng DAU/MAU:** Thúc đẩy hành vi mời thành viên mới, tạo hiệu ứng lan tỏa (viral loop) thông qua các liên kết và mã mời chia sẻ bảo mật.
*   **Tăng Tỷ lệ Giữ chân (Retention Rate):** Không gian làm việc nhóm tạo ra "network effect" (hiệu ứng mạng lưới) mạnh mẽ, giúp người dùng gắn bó lâu dài với hệ thống nhờ dữ liệu và quy trình làm việc chung.

---

## 2. Các Vấn đề của Người dùng được Giải quyết (User Problems Solved)

*   **Cô lập công việc:** Hiện tại, các tác vụ (tasks) thuộc sở hữu đơn lẻ của người tạo (`ownerId`). Thành viên trong cùng một dự án không thể nhìn thấy, phân công hoặc cập nhật tiến độ công việc cùng nhau.
*   **Trở ngại chia sẻ:** Quy trình chia sẻ tài liệu và quản lý quyền truy cập phức tạp, thiếu an toàn (ví dụ: lộ token mời, rò rỉ quyền chỉnh sửa).
*   **Thiếu tương tác thời gian thực:** Khi làm việc nhóm, việc không thể biết ai đang online hoặc không cập nhật trạng thái công việc ngay lập tức gây ra xung đột dữ liệu (data conflict) và gián đoạn giao tiếp.

---

## 3. Phạm vi Chức năng (Feature Scope)

*   **Quản lý Dự án (Project CRUD):** Tạo, đọc, cập nhật, lưu trữ (archive), khôi phục (restore) và xóa dự án. Hỗ trợ tùy chỉnh biểu tượng dự án (emoji avatar).
*   **Cộng tác Thời gian thực (Real-time Presence & Sync):**
    *   Tích hợp **Ably** để đồng bộ hóa trạng thái tức thời (real-time task sync) cho mọi thay đổi của công việc (Kanban, List).
    *   Hiển thị danh sách Avatar của các thành viên đang hoạt động trực tuyến trực tiếp trên Header dự án (Real-time Active Member Presence).
*   **Hệ thống Mời Bảo mật (Secure Invite System):**
    *   **Secure Invite Link:** Sinh đường dẫn mời bảo mật dựa trên mã hóa SHA-256 (không lưu token dạng plain-text). Hỗ trợ giới hạn thời gian hết hạn và số lần sử dụng.
    *   **Invite Code:** Mã mời ngắn (6 ký tự) để người dùng dễ dàng nhập trên thiết bị di động hoặc trao đổi trực tiếp.
*   **Quản lý Thành viên & Phân quyền (Cascading Role & Permission):**
    *   Hệ thống phân quyền 4 cấp độ: **Owner** (Chủ sở hữu), **Editor** (Biên tập viên), **Commenter** (Người bình luận), và **Viewer** (Người xem).
    *   Chuyển giao quyền sở hữu (Ownership Transfer) an toàn và rời khỏi dự án (Leave Project) chủ động.

---

## 4. Triết lý Cộng tác (Collaboration Philosophy)

1.  **Dự án là Không gian chung (Project is Workspace):** Dự án đóng vai trò là "container" chứa các thành viên và các nhiệm vụ. Quyền truy cập vào mọi task được thừa hưởng trực tiếp từ vai trò của thành viên trong dự án đó.
2.  **Thời gian thực là Mặc định (Real-time by Default):** Mọi hành động chỉnh sửa, kéo thả cột Kanban, thêm nhãn, hoặc thay đổi hạn chót phải phản ánh ngay lập tức trên màn hình của tất cả mọi người thông qua kênh truyền dẫn của **Ably**.
3.  **Bảo mật hàng đầu (Security First):** Mọi token mời phải được băm SHA-256 trước khi lưu vào cơ sở dữ liệu. Ngăn chặn triệt để hành vi leo thang đặc quyền (privilege escalation).

---

## 5. Danh sách Câu chuyện Người dùng (User Stories)

*   **As a User (Với tư cách là người dùng):**
    *   Tôi muốn tạo một dự án mới và chọn một emoji vui nhộn làm avatar dự án theo phong cách Pop Art.
    *   Tôi muốn lấy một liên kết mời bảo mật hoặc mã mời 6 ký tự để gửi cho đồng nghiệp qua chat.
    *   Tôi muốn dán một đường dẫn mời, sau khi đăng nhập sẽ tự động tham gia vào dự án với vai trò được cấu hình sẵn.
*   **As an Owner (Với tư cách là Chủ sở hữu dự án):**
    *   Tôi muốn xem danh sách tất cả thành viên kèm theo vai trò của họ.
    *   Tôi muốn thay đổi vai trò của một thành viên khác hoặc xóa họ ra khỏi dự án ngay lập tức.
    *   Tôi muốn quay vòng (rotate) hoặc thu hồi (revoke) các đường dẫn mời đã tạo để ngăn những người có đường dẫn cũ tham gia.
*   **As a Collaborator (Với tư cách là Cộng tác viên nhóm):**
    *   Tôi muốn nhìn thấy hình đại diện (avatar) của những đồng nghiệp đang cùng xem dự án hiện tại ở góc trên màn hình thời gian thực.
    *   Tôi muốn mỗi khi đồng nghiệp kéo thả một task từ cột "Doing" sang "Done", màn hình Kanban của tôi cũng tự động cập nhật mượt mà mà không cần tải lại trang.

---

## 6. Khả năng Mở rộng Tương lai (Future Extensibility)

*   **Tích hợp Chat:** Mở rộng cổng kết nối của Ably để xây dựng kênh chat nhanh (mini chat thread) ngay trong từng dự án hoặc từng task cụ thể.
*   **Nhật ký Hoạt động (Activity Feeds):** Tích hợp sâu với bảng Audit Log để hiển thị luồng thông báo dạng timeline (ai đã làm gì, lúc nào) trong dự án.
*   **Project Templates:** Hỗ trợ tạo dự án nhanh từ các mẫu có sẵn (Software Dev, Marketing Camp, Personal Life).
