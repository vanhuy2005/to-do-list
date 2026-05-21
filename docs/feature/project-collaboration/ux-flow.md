# Trải nghiệm Người dùng (UX) & Thiết kế Pop Art: Collaborative Project Workspace System

Tài liệu này đặc tả giao diện (UI) và trải nghiệm người dùng (UX) của tính năng Không gian Làm việc Dự án Cộng tác. Giao diện được thiết kế theo phong cách nghệ thuật **Pop Art / Comic Offset (Truyện tranh lệch màu)** độc đáo, mang lại sự trẻ trung, cá tính mạnh mẽ cho sản phẩm.

---

## 1. Hệ thống Token Thiết kế Pop Art / Comic Offset

Giao diện áp dụng các quy chuẩn thiết kế truyện tranh retro cực kỳ nghiêm ngặt:

*   **Bảng màu thương hiệu (HSL Tailored Vibrant Colors):**
    *   `Primary (Hồng Neon):` `#FF2D55` (Vibrant Pink)
    *   `Secondary (Xanh Cyan):` `#00C2FF` (Vibrant Cyan)
    *   `Highlight (Vàng Chanh):` `#FFD60A` (Bright Yellow)
    *   `Background (Kem cổ điển):` `#FFFDF7` (Warm Chalk)
    *   `Outline (Đường viền dày):` `#111111` (Solid Black)
*   **Quy chuẩn Đường viền (Borders):** Tất cả các khối (cards, inputs, modals, buttons) bắt buộc phải có đường viền đen đậm `3px solid #111111`.
*   **Đổ bóng Truyện tranh (Offset Shadows):** Đổ bóng không làm mờ (non-blurry hard shadow) lệch xuống dưới bên phải:
    *   Trạng thái bình thường: `3px 3px 0px #111111`
    *   Trạng thái Hover/Active: `5px 5px 0px #111111` (và dịch chuyển phần tử lên trên bên trái `-2px` bằng CSS `translate` để tạo hiệu ứng cơ học bấm nút).
*   **Phông chữ (Typography):**
    *   Tiêu đề (Headings, Buttons): Phông chữ **Bangers** hoặc **Outfit** viết hoa, đậm nét truyện tranh.
    *   Nội dung (Body, Meta texts): Phông chữ **Plus Jakarta Sans** dễ đọc trên mọi thiết bị.

---

## 2. Các Hành trình Người dùng Trọng tâm & Chi tiết Giao diện

### 2.1 Màn hình Danh sách Dự án (`ProjectsPage`)
*   **Trạng thái Trống (Empty State):** 
    *   Hiển thị hình vẽ minh họa phong cách Pop Art kèm khung thoại bong bóng (speech bubble) tiếng Việt: *"OÀ! CHƯA CÓ DỰ ÁN NÀO HẾT TRƠN! TẠO MỘT CÁI ĐỂ CHƠI CHUNG ĐI NÀO!"*
    *   Nút CTA "Tạo Dự án Mới" màu vàng tươi chói lọi, bo viền 3px, hiệu ứng nhún nhảy (pulse animation).
*   **Dạng lưới Dự án (Grid Layout):**
    *   Các thẻ dự án (Project Cards) xếp dạng lưới 3 cột. Mỗi card sử dụng nền màu Kem cổ điển, hiển thị emoji lớn làm ảnh đại diện (ví dụ: 🚀, 🎨, 📊), hiển thị tiến độ dự án dưới dạng thanh tiến trình (progress bar) viền 3px màu xanh Cyan.
    *   Góc dưới card có chỉ báo số lượng thành viên: *"👥 5 thành viên"*.

### 2.2 Không gian Dự án Thời gian thực (`ProjectDetailPage`)
*   **Header dự án thời gian thực (Real-time Presence Area):**
    *   Nằm bên cạnh tiêu đề dự án lớn, thiết kế một khu vực hình tròn bo góc chứa avatar của các thành viên đang trực tuyến xem dự án này.
    *   **Avatar Stack:** Các avatar xếp chồng nhẹ lên nhau (overlapping) có viền trắng dày. Mỗi avatar có chấm xanh lá cây nhấp nháy chỉ báo hoạt động trực tiếp.
    *   **Hiệu ứng Độc đáo:** Khi một thành viên mới vừa đăng nhập và vào trang dự án, avatar của họ sẽ bay vào (slide-in) kèm hiệu ứng scale nhẹ và tooltip hiện tên tiếng Việt của họ thời gian thực (tích hợp qua Ably Presence).
*   **Bảng Kanban nhóm:** 
    *   Các cột "Todo", "Doing", "Done" có màu nền khác nhau (Todo: Hồng nhạt, Doing: Cyan nhạt, Done: Vàng nhạt) để tạo độ tương phản mạnh mẽ.
    *   Thao tác kéo thả task giữa các cột hiển thị đường biên giả nét đứt truyện tranh cực kỳ sinh động. Mọi hành động kéo thả của thành viên A sẽ cập nhật ngay tức thì trên màn hình thành viên B với một hiệu ứng rung (shake animation) nhẹ ở task vừa cập nhật.

### 2.3 Modal Mời & Chia sẻ Dự án (`ProjectShareModal`)
*   **Giao diện Đa chức năng:**
    1.  **Sao chép Link mời:** Một ô Input chứa đường dẫn mời bảo mật được bôi đậm, bên cạnh là nút "Sao chép" (Copy) màu hồng neon. Khi bấm, hiển thị hiệu ứng bong bóng thoại bay lên *"ĐÃ COPY RỒI NHÉ! 🎉"* và tự động đổi icon nút.
    2.  **Mã mời ngắn (6 ký tự):** Hiển thị mã mời cỡ lớn viết hoa, được bọc trong khung viền đứt offset bóng, giúp người dùng dễ dàng đọc hoặc nhập tay trên ứng dụng điện thoại di động.
    3.  **Danh sách Link hiện có:** Hiển thị danh sách các link mời đã tạo kèm vai trò liên kết (`Viewer` / `Editor`). Bên cạnh là nút "Thu hồi" (Vô hiệu hóa ngay lập tức) màu đỏ neon vô cùng nổi bật.

### 2.4 Trang Trung gian Gia nhập (`JoinProjectPage`)
*   **URL:** `/join/:token`
*   **Trải nghiệm Chào đón (Vietnamese Welcoming UX):**
    *   Màn hình trung tâm thiết kế như một khung tranh truyện tranh lớn.
    *   Hiển thị thông tin dự án mời: *"Chào bạn! Bạn được mời tham gia dự án **[Tên Dự Án]** bởi **[Tên Người Mời]** với vai trò **[Editor/Viewer]**"*.
    *   Hai nút lớn phong cách Pop Art:
        *   **"ĐỒNG Ý GIA NHẬP! 🚀"** (Nút màu vàng chói, hiệu ứng shadow đậm).
        *   **"ĐỂ SAU NHA 😢"** (Nút màu xám nhạt, viền mỏng).
*   **Các trạng thái lỗi:**
    *   *Link hết hạn:* Hiển thị nhân vật hoạt hình khóc kèm thông điệp *"Ối! Link này hết hạn mất rồi, nhắn chủ nhà gửi cái mới nha!"*.

---

## 3. Tương thích Thiết bị Di động (Mobile Responsiveness)

*   **BottomNav (Thanh điều hướng dưới):** Bổ sung một tab "Dự án" (Projects) vào vị trí trung tâm kế bên nút Tạo nhanh Task để người dùng di động truy cập ngay lập tức.
*   **Danh sách và Modals:**
    *   Trên Desktop, mảng danh sách thành viên hiển thị dưới dạng Modal lớn ở trung tâm.
    *   Trên Mobile, Modal tự động chuyển đổi thành một **Bottom Sheet** kéo từ dưới màn hình lên (chiếm 85% chiều cao) giúp ngón tay thao tác chạm, chọn vai trò, hoặc xóa thành viên vô cùng tự nhiên.
    *   Các cột Kanban tự động chuyển sang chế độ vuốt ngang (swipeable tabs) thay vì xếp hàng ngang gây tràn màn hình.
