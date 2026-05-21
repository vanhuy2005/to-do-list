# Báo cáo tiến độ giữa kỳ dựa trên codebase

- Tác giả báo cáo: Nhóm phát triển To-Do Web
- Thời điểm đối chiếu: 2026-04-10
- Phạm vi đối chiếu: tài liệu đặc tả trong docs và mã nguồn thực tế trong to-do-list

## Phương pháp đánh giá

Báo cáo này được tổng hợp theo cách tiếp cận nghiên cứu kỹ thuật, gồm 3 bước:

1. Chuẩn tham chiếu: đối chiếu mục tiêu, use-case, roadmap trong [docs/00-tong-quan.md](00-tong-quan.md#L11), [docs/01-yeu-cau-phan-mem.md](01-yeu-cau-phan-mem.md#L18), [docs/tasked.md](tasked.md#L11).
2. Bằng chứng thực thi: kiểm tra route, viewmodel, model, cron, service và page đang chạy trong codebase.
3. Phân loại tiến độ: implemented, partial, not implemented; từ đó đề xuất hướng hoàn thiện cuối kỳ.

---

## 1. Đặt vấn đề

### 1.1 Vì sao chọn đề tài này

Đề tài To-Do Web được chọn vì đáp ứng đồng thời hai mục tiêu đào tạo cốt lõi của môn Công nghệ Web:

- Thiết kế hệ thống web full-stack có nghiệp vụ rõ ràng, có vòng đời dữ liệu, có bảo mật.
- Triển khai UI/UX có tính tương tác cao, có khả năng mở rộng lên realtime và quản trị.

Mục tiêu này thể hiện rõ trong tài liệu tổng quan tại [docs/00-tong-quan.md](00-tong-quan.md#L15), [docs/00-tong-quan.md](00-tong-quan.md#L16), [docs/00-tong-quan.md](00-tong-quan.md#L17), [docs/00-tong-quan.md](00-tong-quan.md#L18), [docs/00-tong-quan.md](00-tong-quan.md#L19).

### 1.2 Thực trạng bài toán

Trong bối cảnh quản lý công việc cá nhân/nhóm nhỏ, các vấn đề phổ biến gồm:

- Khó theo dõi tiến độ theo trạng thái và mức ưu tiên.
- Deadline thường chỉ ở mức ngày, thiếu tính theo giờ và thiếu cảnh báo trễ theo thời gian thực.
- Thiếu lịch sử thao tác để truy vết khi dữ liệu thay đổi.
- Quy trình xóa dữ liệu thiếu an toàn, khó khôi phục.

Các bài toán này tương ứng với use-case trong [docs/01-yeu-cau-phan-mem.md](01-yeu-cau-phan-mem.md#L27), [docs/01-yeu-cau-phan-mem.md](01-yeu-cau-phan-mem.md#L31), [docs/01-yeu-cau-phan-mem.md](01-yeu-cau-phan-mem.md#L42), [docs/01-yeu-cau-phan-mem.md](01-yeu-cau-phan-mem.md#L59).

### 1.3 Sản phẩm giải quyết vấn đề gì

Codebase hiện tại đã giải trực tiếp các vấn đề trên bằng các cơ chế sau:

- Quản lý task theo trạng thái, ưu tiên, tags, tìm kiếm, lọc và phân trang.
- Deadline thông minh và overdue server-side bằng cron.
- Nhật ký hoạt động cá nhân với khả năng dọn log theo bộ lọc.
- Soft-delete và restore window để giảm rủi ro mất dữ liệu.

Bằng chứng thực thi:

- Task schema và chỉ mục: [../to-do-list/backend/src/models/Task.js](../to-do-list/backend/src/models/Task.js#L38), [../to-do-list/backend/src/models/Task.js](../to-do-list/backend/src/models/Task.js#L66).
- Overdue cron: [../to-do-list/backend/src/cron/cronJobs.js](../to-do-list/backend/src/cron/cronJobs.js#L11), [../to-do-list/backend/src/cron/cronJobs.js](../to-do-list/backend/src/cron/cronJobs.js#L64).
- Activity page và cleanup: [../to-do-list/frontend/src/pages/ActivitiesPage.jsx](../to-do-list/frontend/src/pages/ActivitiesPage.jsx#L298), [../to-do-list/frontend/src/pages/ActivitiesPage.jsx](../to-do-list/frontend/src/pages/ActivitiesPage.jsx#L459).

---

## 2. Mục tiêu giữa kỳ: feature và architecture đã build

### 2.1 Kiến trúc đã hiện thực

#### Backend

- Kiến trúc route + middleware + viewmodel + model theo hướng MVVM:
  [../to-do-list/backend/src/server.js](../to-do-list/backend/src/server.js#L55), [../to-do-list/backend/src/viewmodels/taskViewModel.js](../to-do-list/backend/src/viewmodels/taskViewModel.js#L135), [../to-do-list/backend/src/viewmodels/authViewModel.js](../to-do-list/backend/src/viewmodels/authViewModel.js#L45).
- Chuẩn error handling theo custom error class:
  [../to-do-list/backend/src/viewmodels/taskViewModel.js](../to-do-list/backend/src/viewmodels/taskViewModel.js#L15), [../to-do-list/backend/src/viewmodels/authViewModel.js](../to-do-list/backend/src/viewmodels/authViewModel.js#L10), [../to-do-list/backend/src/viewmodels/profileViewModel.js](../to-do-list/backend/src/viewmodels/profileViewModel.js#L6).
- Cron phục vụ lifecycle dữ liệu:
  [../to-do-list/backend/src/cron/cronJobs.js](../to-do-list/backend/src/cron/cronJobs.js#L11), [../to-do-list/backend/src/cron/cronJobs.js](../to-do-list/backend/src/cron/cronJobs.js#L64).

#### Frontend

- App shell rõ ràng với AppBar, Sidebar, BottomNav, modal-route cho task:
  [../to-do-list/frontend/src/layouts/Mainlayout.jsx](../to-do-list/frontend/src/layouts/Mainlayout.jsx#L9), [../to-do-list/frontend/src/layouts/Mainlayout.jsx](../to-do-list/frontend/src/layouts/Mainlayout.jsx#L29), [../to-do-list/frontend/src/layouts/Mainlayout.jsx](../to-do-list/frontend/src/layouts/Mainlayout.jsx#L39).
- Route guard xác thực ở mức token:
  [../to-do-list/frontend/src/components/ProtectedRoute.jsx](../to-do-list/frontend/src/components/ProtectedRoute.jsx#L5), [../to-do-list/frontend/src/components/AuthRoute.jsx](../to-do-list/frontend/src/components/AuthRoute.jsx#L5).
- Axios interceptor có cơ chế refresh và retry request:
  [../to-do-list/frontend/src/lib/axios.js](../to-do-list/frontend/src/lib/axios.js#L17), [../to-do-list/frontend/src/lib/axios.js](../to-do-list/frontend/src/lib/axios.js#L68).

### 2.2 Các feature đã hoàn thành ở mức giữa kỳ

| Nhóm chức năng                                         | Mức độ                  | Bằng chứng chính                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Auth local (register/login/refresh/logout)             | Hoàn thành              | [../to-do-list/backend/src/routes/authRouters.js](../to-do-list/backend/src/routes/authRouters.js#L35), [../to-do-list/backend/src/routes/authRouters.js](../to-do-list/backend/src/routes/authRouters.js#L55), [../to-do-list/backend/src/routes/authRouters.js](../to-do-list/backend/src/routes/authRouters.js#L76), [../to-do-list/backend/src/routes/authRouters.js](../to-do-list/backend/src/routes/authRouters.js#L89), [../to-do-list/frontend/src/pages/LoginPage.jsx](../to-do-list/frontend/src/pages/LoginPage.jsx#L30), [../to-do-list/frontend/src/pages/RegisterPage.jsx](../to-do-list/frontend/src/pages/RegisterPage.jsx#L34) |
| Task CRUD + soft-delete + restore + trash              | Hoàn thành              | [../to-do-list/backend/src/routes/tasksRouters.js](../to-do-list/backend/src/routes/tasksRouters.js#L22), [../to-do-list/backend/src/routes/tasksRouters.js](../to-do-list/backend/src/routes/tasksRouters.js#L36), [../to-do-list/backend/src/routes/tasksRouters.js](../to-do-list/backend/src/routes/tasksRouters.js#L76), [../to-do-list/backend/src/routes/tasksRouters.js](../to-do-list/backend/src/routes/tasksRouters.js#L88), [../to-do-list/backend/src/viewmodels/taskViewModel.js](../to-do-list/backend/src/viewmodels/taskViewModel.js#L448)                                                                                      |
| Search/filter/pagination task                          | Hoàn thành              | [../to-do-list/backend/src/viewmodels/taskViewModel.js](../to-do-list/backend/src/viewmodels/taskViewModel.js#L184), [../to-do-list/backend/src/viewmodels/taskViewModel.js](../to-do-list/backend/src/viewmodels/taskViewModel.js#L244), [../to-do-list/frontend/src/pages/HomePage.jsx](../to-do-list/frontend/src/pages/HomePage.jsx#L170), [../to-do-list/frontend/src/pages/FilterPage.jsx](../to-do-list/frontend/src/pages/FilterPage.jsx#L77)                                                                                                                                                                                            |
| Smart deadline + countdown + overdue                   | Hoàn thành              | [../to-do-list/frontend/src/components/DeadlinePicker.jsx](../to-do-list/frontend/src/components/DeadlinePicker.jsx#L49), [../to-do-list/frontend/src/hooks/useCountdown.js](../to-do-list/frontend/src/hooks/useCountdown.js#L69), [../to-do-list/frontend/src/components/CountdownBadge.jsx](../to-do-list/frontend/src/components/CountdownBadge.jsx#L51), [../to-do-list/backend/src/cron/cronJobs.js](../to-do-list/backend/src/cron/cronJobs.js#L11)                                                                                                                                                                                       |
| Kanban drag-and-drop                                   | Hoàn thành              | [../to-do-list/frontend/src/pages/ViewAllPage.jsx](../to-do-list/frontend/src/pages/ViewAllPage.jsx#L377), [../to-do-list/frontend/src/pages/ViewAllPage.jsx](../to-do-list/frontend/src/pages/ViewAllPage.jsx#L288), [../to-do-list/frontend/src/components/KanbanCard.jsx](../to-do-list/frontend/src/components/KanbanCard.jsx#L85), [../to-do-list/frontend/src/components/KanbanCard.jsx](../to-do-list/frontend/src/components/KanbanCard.jsx#L155)                                                                                                                                                                                        |
| Profile/settings data flow                             | Hoàn thành một phần lớn | [../to-do-list/frontend/src/pages/SettingsPage.jsx](../to-do-list/frontend/src/pages/SettingsPage.jsx#L75), [../to-do-list/frontend/src/pages/SettingsPage.jsx](../to-do-list/frontend/src/pages/SettingsPage.jsx#L184), [../to-do-list/frontend/src/pages/ProfilePage.jsx](../to-do-list/frontend/src/pages/ProfilePage.jsx#L93), [../to-do-list/backend/src/viewmodels/profileViewModel.js](../to-do-list/backend/src/viewmodels/profileViewModel.js#L145)                                                                                                                                                                                     |
| Activity/audit cá nhân + xóa theo lọc                  | Hoàn thành              | [../to-do-list/frontend/src/pages/ActivitiesPage.jsx](../to-do-list/frontend/src/pages/ActivitiesPage.jsx#L298), [../to-do-list/frontend/src/pages/ActivitiesPage.jsx](../to-do-list/frontend/src/pages/ActivitiesPage.jsx#L459), [../to-do-list/backend/src/viewmodels/profileViewModel.js](../to-do-list/backend/src/viewmodels/profileViewModel.js#L342), [../to-do-list/backend/src/routes/auditLogsRouters.js](../to-do-list/backend/src/routes/auditLogsRouters.js#L36)                                                                                                                                                                    |
| Admin API nền (users/moderation/trash/analytics/audit) | Hoàn thành ở backend    | [../to-do-list/backend/src/routes/adminRouters.js](../to-do-list/backend/src/routes/adminRouters.js#L49), [../to-do-list/backend/src/routes/adminRouters.js](../to-do-list/backend/src/routes/adminRouters.js#L88), [../to-do-list/backend/src/routes/adminRouters.js](../to-do-list/backend/src/routes/adminRouters.js#L141), [../to-do-list/backend/src/routes/adminRouters.js](../to-do-list/backend/src/routes/adminRouters.js#L154)                                                                                                                                                                                                         |

### 2.3 Mức độ đạt mục tiêu giữa kỳ

Nếu lấy chuẩn là nhóm mục tiêu lõi người dùng ở giữa kỳ (auth local, task lifecycle, UX task, deadline, activity), hệ thống đã đạt mức tốt. Các phần còn thiếu chủ yếu thuộc nhóm mở rộng cuối kỳ: OAuth, realtime, admin frontend, deployment và test tổng hợp.

Cơ sở đối chiếu roadmap: [docs/tasked.md](tasked.md#L11), [docs/tasked.md](tasked.md#L260), [docs/tasked.md](tasked.md#L385), [docs/tasked.md](tasked.md#L526), [docs/tasked.md](tasked.md#L640).

---

## 3. Phạm vi và ngoài phạm vi (phân biệt với cuối kỳ)

### 3.1 Trong phạm vi giữa kỳ (đã có)

- Nền tảng backend và model dữ liệu cốt lõi.
- Luồng xác thực cục bộ đầy đủ.
- Luồng task end-to-end cho user.
- Smart deadline và overdue job.
- Activity timeline và thao tác cleanup log.
- Kanban drag-drop ở trang view-all.

Bằng chứng roadmap và code:

- [docs/tasked.md](tasked.md#L48), [docs/tasked.md](tasked.md#L264), [docs/tasked.md](tasked.md#L394), [docs/09-drag%20and%20drop%20implementation%20plan.md](09-drag%20and%20drop%20implementation%20plan.md#L7).
- [../to-do-list/frontend/src/pages/ViewAllPage.jsx](../to-do-list/frontend/src/pages/ViewAllPage.jsx#L377), [../to-do-list/backend/src/cron/cronJobs.js](../to-do-list/backend/src/cron/cronJobs.js#L11).

### 3.2 Ngoài phạm vi giữa kỳ hoặc chuyển cuối kỳ

- OAuth Google/GitHub chưa có trong backend routes và chưa có passport integration.
- Realtime Socket.IO chưa có namespace/event thực tế trong source.
- Frontend admin pages chưa có file và chưa mount route admin.
- Deployment production và manual testing cuối kỳ chưa hoàn tất.

Bằng chứng:

- Checklist phase cuối kỳ: [docs/tasked.md](tasked.md#L526), [docs/tasked.md](tasked.md#L556), [docs/tasked.md](tasked.md#L640), [docs/tasked.md](tasked.md#L742), [docs/tasked.md](tasked.md#L772).
- Frontend router hiện tại chưa có admin route: [../to-do-list/frontend/src/routes/index.jsx](../to-do-list/frontend/src/routes/index.jsx#L19).
- Dependency hiện có không chứa socket.io/passport ở backend: [../to-do-list/backend/package.json](../to-do-list/backend/package.json#L20), [../to-do-list/backend/package.json](../to-do-list/backend/package.json#L27).

---

## 4. Tự đánh giá

### 4.1 Ưu điểm và kết quả đạt được

1. Kiến trúc backend tương đối sạch, có tổ chức theo domain logic.
2. Luồng user chính đã chạy end-to-end, có trải nghiệm tương tác tốt.
3. Mô hình dữ liệu quan tâm vòng đời thực tế (soft-delete, overdue, TTL).
4. Giao diện có bản sắc thương hiệu rõ (Pop Art), mức hoàn thiện UI cao hơn mặt bằng bài tập môn.

Bằng chứng:

- [../to-do-list/backend/src/viewmodels/taskViewModel.js](../to-do-list/backend/src/viewmodels/taskViewModel.js#L135), [../to-do-list/backend/src/models/AuditLog.js](../to-do-list/backend/src/models/AuditLog.js#L39).
- [../to-do-list/frontend/src/layouts/Mainlayout.jsx](../to-do-list/frontend/src/layouts/Mainlayout.jsx#L29), [../to-do-list/frontend/src/pages/HomePage.jsx](../to-do-list/frontend/src/pages/HomePage.jsx#L286), [../to-do-list/frontend/src/pages/NotFoundPage.jsx](../to-do-list/frontend/src/pages/NotFoundPage.jsx#L1).

### 4.2 Hạn chế và bất cập cần xử lý

#### A. Bất cập logic kỹ thuật

- Mismatch dữ liệu refresh token response giữa backend và frontend.
  - Backend refresh trả data.accessToken: [../to-do-list/backend/src/viewmodels/authViewModel.js](../to-do-list/backend/src/viewmodels/authViewModel.js#L236).
  - Frontend interceptor đọc data.token: [../to-do-list/frontend/src/lib/axios.js](../to-do-list/frontend/src/lib/axios.js#L75).
- So sánh ownership session có nguy cơ lệch kiểu dữ liệu:
  [../to-do-list/backend/src/viewmodels/profileViewModel.js](../to-do-list/backend/src/viewmodels/profileViewModel.js#L191).
- Route profile delete hiện dùng path /:id nhưng gọi hàm xóa nhiều log theo keep/filter, có thể gây khó hiểu API contract:
  [../to-do-list/backend/src/routes/profileRouters.js](../to-do-list/backend/src/routes/profileRouters.js#L103), [../to-do-list/backend/src/routes/profileRouters.js](../to-do-list/backend/src/routes/profileRouters.js#L105).

#### B. Khoảng trống chức năng

- Admin frontend chưa triển khai dù backend đã có route và viewmodel.
- OAuth và realtime chưa vào code.
- Admin analytics còn userGrowthTrend rỗng.

Bằng chứng:

- [../to-do-list/backend/src/routes/adminRouters.js](../to-do-list/backend/src/routes/adminRouters.js#L49), [../to-do-list/backend/src/viewmodels/adminViewModel.js](../to-do-list/backend/src/viewmodels/adminViewModel.js#L257), [../to-do-list/frontend/src/routes/index.jsx](../to-do-list/frontend/src/routes/index.jsx#L19).

#### C. Chất lượng và vận hành

- Frontend lint hiện còn lỗi/warning:
  [../to-do-list/frontend/src/pages/NewTaskPage.jsx](../to-do-list/frontend/src/pages/NewTaskPage.jsx#L25), [../to-do-list/frontend/src/hooks/useCountdown.js](../to-do-list/frontend/src/hooks/useCountdown.js#L78), [../to-do-list/frontend/src/pages/TaskDetailPage.jsx](../to-do-list/frontend/src/pages/TaskDetailPage.jsx#L196).
- Chưa có test thực chiến ở backend:
  [../to-do-list/backend/package.json](../to-do-list/backend/package.json#L8).
- Chưa có backend env example chuẩn hóa; hiện mới thấy frontend env example:
  [../to-do-list/frontend/.env.example](../to-do-list/frontend/.env.example#L1).

---

## 5. Hướng phát triển: cải tiến và định hướng cuối kỳ

Nội dung này bám trực tiếp phần còn lại trong [docs/tasked.md](tasked.md#L526).

### 5.1 Ưu tiên 1: Ổn định nền tảng và sửa lỗi logic

- Chuẩn hóa contract refresh token response giữa backend và axios interceptor.
- Rà soát kiểu dữ liệu userId ở deleteSession.
- Chuẩn hóa API semantics của profile audit delete.
- Dọn lint error/warning để tăng độ tin cậy build.

Tiêu chí đạt:

- Login-refresh-logout chạy ổn định khi token hết hạn.
- Lint frontend không còn error blocking.

### 5.2 Ưu tiên 2: Hoàn thành OAuth (Phase 11)

- Cài và cấu hình passport strategies.
- Bổ sung routes auth/google và auth/github.
- Tích hợp callback + toast cho auto-link theo ADR.

Mốc tài liệu: [docs/tasked.md](tasked.md#L526), [docs/tasked.md](tasked.md#L528), [docs/tasked.md](tasked.md#L542).

### 5.3 Ưu tiên 3: Hoàn thành admin frontend (Phase 12.5)

- Xây dựng đầy đủ AdminHome, Users, Moderation, Analyze, Audit, Trash.
- Bổ sung route guard role admin ở frontend.
- Nối đầy đủ API admin đã có sẵn.

Mốc tài liệu: [docs/tasked.md](tasked.md#L601), [docs/tasked.md](tasked.md#L603).

### 5.4 Ưu tiên 4: Triển khai realtime Socket.IO (Phase 13)

- Thiết lập namespace, handshake JWT, room theo user và admin-channel.
- Emit event từ task/admin actions.
- Client lắng nghe event và full-refetch theo ADR.

Mốc tài liệu: [docs/tasked.md](tasked.md#L640), [docs/tasked.md](tasked.md#L642), [docs/tasked.md](tasked.md#L663).

### 5.5 Ưu tiên 5: Hoàn thiện analytics và audit quản trị

- Bổ sung userGrowthTrend thực trong admin analytics.
- Chuẩn hóa ghi audit cho các hành động admin thay đổi user.

Bằng chứng điểm còn thiếu hiện tại:

- [../to-do-list/backend/src/viewmodels/adminViewModel.js](../to-do-list/backend/src/viewmodels/adminViewModel.js#L257).
- [../to-do-list/backend/src/viewmodels/adminViewModel.js](../to-do-list/backend/src/viewmodels/adminViewModel.js#L310).

### 5.6 Ưu tiên 6: Deployment + kiểm thử cuối kỳ

- Hoàn tất artifact deploy (backend env example, script run rõ ràng, checklist release).
- Thực hiện đầy đủ luồng kiểm thử cuối kỳ theo tasked phase 17.

Mốc tài liệu: [docs/tasked.md](tasked.md#L742), [docs/tasked.md](tasked.md#L772).

---

## Kết luận

Xét trên mục tiêu giữa kỳ, dự án đã đạt được phần cốt lõi nghiệp vụ và kiến trúc đủ mạnh để chuyển sang sprint hoàn thiện cuối kỳ. Trọng tâm còn lại không nằm ở việc làm lại nền tảng, mà là đóng các khoảng trống chiến lược: OAuth, realtime, admin frontend, chất lượng kiểm thử và readiness triển khai.

Nói cách khác, dự án đang ở trạng thái from working product to complete product.
