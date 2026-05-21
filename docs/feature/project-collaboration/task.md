# Danh sách Tác vụ Triển khai Chi tiết: Collaborative Project Workspace System

Tài liệu này phân rã toàn bộ tính năng Không gian Làm việc Dự án Cộng tác thành các tác vụ kỹ thuật cực kỳ chi tiết, giúp các nhà phát triển (từ Junior đến Senior) dễ dàng thực thi và theo dõi tiến độ.

---

## 1. Phân hệ 1: Cơ sở Dữ liệu & Schema Layer (T-DB)

### T-DB-01: Cập nhật Schema Dự án `Project.js`
*   **Mục tiêu:** Mở rộng schema Project hiện tại để hỗ trợ emoji avatar, xóa mềm, lưu trữ dự án, mã mời ngắn (inviteCode) và băm bảo mật link mời.
*   **File cần sửa:** `to-do-list/backend/src/models/Project.js`
*   **Nội dung thực hiện:**
    *   Thêm trường `emoji` (String, default: `"📁"`).
    *   Thêm trường `status` (String, enum: `["active", "archived"]`, default: `"active"`).
    *   Thêm trường `deletedAt` (Date, default: `null`) và `restoreUntil` (Date, default: `null`).
    *   Thay đổi trường `shareLinks.token` thành `shareLinks.tokenHash` (String, required). Bổ sung `label`, `maxUses` (Number), `usedCount` (Number, default: `0`), `isRevoked` (Boolean, default: `false`).
    *   Bổ sung đối tượng `inviteCode` bọc các trường: `code` (String, uppercase), `role`, `maxUses`, `usedCount`, `isRevoked`, `expiresAt`, `createdBy`, `createdAt`.
*   **Tiêu chí nghiệm thu:** Lưu thành công đối tượng dự án mới có đầy đủ các trường cấu trúc mở rộng vào MongoDB.
*   **Độ phức tạp:** **M** (Medium)

### T-DB-02: Tạo mới Index cho Truy vấn Tối ưu
*   **Mục tiêu:** Tạo các index phục vụ tìm kiếm token băm và mã mời ngắn siêu nhanh.
*   **File cần sửa:** `to-do-list/backend/src/models/Project.js`
*   **Nội dung thực hiện:**
    *   Bổ sung: `projectSchema.index({ "shareLinks.tokenHash": 1 });`
    *   Bổ sung: `projectSchema.index({ "inviteCode.code": 1 }, { sparse: true });`
    *   Bổ sung: `projectSchema.index({ ownerId: 1, deletedAt: 1 });`
*   **Độ phức tạp:** **S** (Small)

---

## 2. Phân hệ 2: Logic Nghiệp vụ Backend — ViewModel Layer (T-BE-VM)

### T-BE-VM-01: Xây dựng Bộ Khung `projectViewModel.js`
*   **Mục tiêu:** Khởi tạo tệp ViewModel cho Project tuân thủ nghiêm ngặt mô hình MVVM, sử dụng lớp lỗi `ViewModelError` và hàm bao bọc `errorHandler` tương tự `taskViewModel.js`.
*   **File tạo mới:** `to-do-list/backend/src/viewmodels/projectViewModel.js`
*   **Nội dung thực hiện:**
    *   Định nghĩa class `ViewModelError` kế thừa từ `Error`.
    *   Tạo đối tượng `projectViewModel` chứa các khung method rỗng.
    *   Xuất bản (Export) `projectViewModel` và HOF `errorHandler`.
*   **Độ phức tạp:** **S** (Small)

### T-BE-VM-02: Hiện thực hóa Nghiệp vụ CRUD Dự án
*   **Mục tiêu:** Viết các logic xử lý nghiệp vụ cho dự án bao gồm tạo dự án, lấy danh sách dự án (người dùng sở hữu hoặc tham gia làm thành viên), cập nhật thông tin dự án, lưu trữ, khôi phục và xóa mềm dự án.
*   **File cần sửa:** `to-do-list/backend/src/viewmodels/projectViewModel.js`
*   **Yêu cầu:** 
    *   Khi xóa mềm dự án, phải cập nhật trạng thái xóa mềm tương ứng cho toàn bộ Task thuộc dự án đó.
    *   Khi tạo dự án, tự động chèn người tạo vào mảng `members` với vai trò `owner`.
*   **Độ phức tạp:** **L** (Large)

### T-BE-VM-03: Triển khai Nghiệp vụ Mời qua Secure Link & Mã mời ngắn
*   **Mục tiêu:** Xử lý tạo link mời, băm SHA-256 token, lưu tokenHash và xử lý gia nhập khi nhận token thô hoặc mã code 6 ký tự.
*   **File cần sửa:** `to-do-list/backend/src/viewmodels/projectViewModel.js`
*   **Yêu cầu:**
    *   Áp dụng làm trễ timing delay 500ms khi join thất bại.
    *   Tích hợp phát tín hiệu `member:joined` thời gian thực qua kênh Ably.
*   **Độ phức tạp:** **XL** (Extra Large)

---

## 3. Phân hệ 3: Lớp Định tuyến Backend — Routes Layer (T-BE-R)

### T-BE-R-01: Refactor `projectsRouters.js` thành Binder mỏng
*   **Mục tiêu:** Chuyển toàn bộ logic nghiệp vụ (đang viết trực tiếp ở route) sang lớp ViewModel vừa tạo. Lớp route chỉ làm nhiệm vụ kết nối Express request, gọi ViewModel và trả response JSON.
*   **File cần sửa:** `to-do-list/backend/src/routes/projectsRouters.js`
*   **Nội dung thực hiện:**
    *   Import `projectViewModel` và `errorHandler`.
    *   Bọc tất cả router handler bằng `errorHandler`.
    *   Bổ sung các định tuyến mới cho `/join/:token`, `/join-code`, `/archive`, `/restore`, `/share-links`, v.v.
*   **Độ phức tạp:** **M** (Medium)

---

## 4. Phân hệ 4: Lớp Giao diện Frontend — UI Layer (T-FE)

### T-FE-01: Cài đặt và Cấu hình Kết nối Ably Real-time
*   **Mục tiêu:** Thiết lập kết nối Ably ở cả frontend và backend.
*   **Yêu cầu:**
    *   Cài đặt thư viện `ably` trên frontend và backend.
    *   Viết helper quản lý kênh kết nối Ably ở frontend nhằm tái sử dụng cho màn hình Kanban đồng bộ task và Avatar Stack hiển thị hiện diện.
*   **Độ phức tạp:** **M** (Medium)

### T-FE-02: Thiết kế Avatar Stack Hiện diện Thời gian thực (Real-time Presence)
*   **Mục tiêu:** Tạo component hiển thị danh sách các avatar của các thành viên đang hoạt động trong dự án ở Header.
*   **Yêu cầu:** Đăng ký sự kiện hiện diện trên kênh Ably của dự án (`project:[id]`). Hiển thị hoạt động mượt mà với các hiệu ứng bay vào/bay ra khi thành viên online/offline.
*   **Độ phức tạp:** **L** (Large)

### T-FE-03: Đồng bộ kéo thả Kanban thời gian thực qua Ably
*   **Mục tiêu:** Lắng nghe sự kiện `task:updated` trên kênh Ably của dự án hiện tại. Khi thành viên A kéo thả thay đổi trạng thái task, màn hình của thành viên B tự động đồng bộ vị trí task tức thời.
*   **Độ phức tạp:** **L** (Large)
