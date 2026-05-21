# 12. Báo cáo frontend giữa kỳ (GK)

- Dự án: To-Do List Web App
- Phạm vi báo cáo: toàn bộ folder frontend
- Nguồn đối chiếu: mã nguồn thực tế trong to-do-list/frontend
- Mục tiêu báo cáo: mô tả rõ cấu trúc frontend, cách các module phối hợp, luồng hoạt động tổng quan và đánh giá mức độ hoàn thiện giữa kỳ
- Ghi chú liên kết trình bày: báo cáo này tiếp nối cấu trúc và nhịp phân tích từ [docs/11. bao-cao-backend-gk.md](11.%20bao-cao-backend-gk.md)

---

## 1) Tóm tắt điều hành

Frontend hiện tại đã đạt mức triển khai cao cho các use-case giữa kỳ: xác thực người dùng, quản lý task end-to-end, giao diện danh sách + kanban drag-and-drop, task modal flow, activity timeline, profile và settings.

Điểm nổi bật là kiến trúc giao diện có tính hệ thống khá rõ: route-level orchestration, reusable component layer, service + axios interceptor cho data flow, cùng một design language xuyên suốt (comic/pop-art).

Điểm còn thiếu chủ yếu nằm ở việc chuẩn hóa contract API một số chỗ, làm sạch lint debt, và đồng nhất toàn bộ data-access về service layer để dễ scale.

---

## 2) Cấu trúc thư mục frontend (ngắn gọn, tường minh)

### 2.1 Cây thư mục

```text
frontend/
  package.json
  vite.config.js
  eslint.config.js
  components.json
  index.html
  src/
    main.jsx
    App.jsx
    index.css
    assets/
    components/
      ui/
      AppBar.jsx
      SidebarNav.jsx
      BottomNav.jsx
      TaskCard.jsx
      KanbanCard.jsx
      KanbanColumn.jsx
      DeadlinePicker.jsx
      CountdownBadge.jsx
      DeleteConfirmDialog.jsx
      TaskModalShell.jsx
      TaskModalTopBar.jsx
      ProtectedRoute.jsx
      AuthRoute.jsx
      EmptyState.jsx
      ErrorState.jsx
      StatusCounter.jsx
    hooks/
      useCountdown.js
    layouts/
      Mainlayout.jsx
    lib/
      axios.js
      utils.js
      taskSchema.js
      taskModalDesignSystem.js
    pages/
      HomePage.jsx
      FilterPage.jsx
      ViewAllPage.jsx
      NewTaskPage.jsx
      EditTaskPage.jsx
      TaskDetailPage.jsx
      ActivitiesPage.jsx
      ProfilePage.jsx
      SettingsPage.jsx
      LoginPage.jsx
      RegisterPage.jsx
      NotFoundPage.jsx
    routes/
      index.jsx
    services/
      authService.js
      taskService.js
```

### 2.2 Vai trò từng nhóm folder

| Folder/File       | Vai trò                | Logic chính                                              |
| ----------------- | ---------------------- | -------------------------------------------------------- |
| src/main.jsx      | Điểm vào frontend      | Mount React app vào root DOM                             |
| src/App.jsx       | App shell cấp cao      | RouterProvider + toaster toàn cục                        |
| src/routes        | Điều phối route        | Protected/Auth route và map trang                        |
| src/layouts       | Khung bố cục           | Topbar + sidebar + bottom nav + outlet                   |
| src/pages         | Màn hình nghiệp vụ     | Triển khai flow người dùng theo use-case                 |
| src/components    | Thành phần tái sử dụng | UI domain component cho task/activity/profile/navigation |
| src/components/ui | UI primitive           | shadcn/radix layer tùy biến phong cách dự án             |
| src/services      | API facade             | Wrapper API theo domain auth/task                        |
| src/lib           | Hạ tầng dùng chung     | axios interceptor, schema, design tokens, utility        |
| src/hooks         | Hook nghiệp vụ         | Đếm ngược deadline realtime                              |
| src/index.css     | Design foundation      | theme tokens, utility class, motion, comic style         |

Kết luận kiến trúc folder: frontend được chia theo chiều dọc nghiệp vụ (pages/services) và chiều ngang hệ thống (components/ui/lib/hooks), phù hợp giai đoạn giữa kỳ và đủ dư địa để mở rộng cuối kỳ.

---

## 3) Bức tranh tổng quan frontend hoạt động như thế nào

### 3.1 Luồng khởi tạo

1. Trình duyệt tải [to-do-list/frontend/index.html](../to-do-list/frontend/index.html).
2. [to-do-list/frontend/src/main.jsx](../to-do-list/frontend/src/main.jsx) mount React root.
3. [to-do-list/frontend/src/App.jsx](../to-do-list/frontend/src/App.jsx) gắn RouterProvider và Sonner Toaster.
4. Router trong [to-do-list/frontend/src/routes/index.jsx](../to-do-list/frontend/src/routes/index.jsx) quyết định route public/protected.

### 3.2 Luồng điều hướng và bảo vệ route

- Route protected bọc bởi [to-do-list/frontend/src/components/ProtectedRoute.jsx](../to-do-list/frontend/src/components/ProtectedRoute.jsx).
- Route login/register bọc bởi [to-do-list/frontend/src/components/AuthRoute.jsx](../to-do-list/frontend/src/components/AuthRoute.jsx).
- Khung chính dùng [to-do-list/frontend/src/layouts/Mainlayout.jsx](../to-do-list/frontend/src/layouts/Mainlayout.jsx), trong đó task routes được render kiểu modal chồng lên Home.

Điểm kỹ thuật đáng chú ý:

- MainLayout dùng regex route để nhận biết modal task flow (new/detail/edit), giúp giữ ngữ cảnh trang nền khi mở modal task.

### 3.3 Luồng dữ liệu và API

1. Page gọi service (taskService/authService) hoặc trực tiếp axios instance.
2. [to-do-list/frontend/src/lib/axios.js](../to-do-list/frontend/src/lib/axios.js) tự gắn Authorization header từ localStorage token.
3. Khi gặp 401 (không phải login/refresh), interceptor thử refresh token với cookie httpOnly.
4. Thành công thì retry request, thất bại thì clear token và redirect login.

Ý nghĩa: UX mượt khi access token hết hạn, giảm số lần người dùng phải đăng nhập lại thủ công.

---

## 4) Phân tích theo từng lớp frontend

## 4.1 App/Router/Layout layer

### 4.1.1 App shell

- [to-do-list/frontend/src/App.jsx](../to-do-list/frontend/src/App.jsx): RouterProvider + Toaster.
- Toaster được custom className theo phong cách comic, thống nhất toàn app.

### 4.1.2 Router map

- [to-do-list/frontend/src/routes/index.jsx](../to-do-list/frontend/src/routes/index.jsx): định nghĩa route đầy đủ cho Home, ViewAll, Filter, Activities, Profile, Settings, Task pages, Auth pages.
- Public route: /login, /register.
- Protected route: toàn bộ route nghiệp vụ còn lại.

### 4.1.3 Main layout

- [to-do-list/frontend/src/layouts/Mainlayout.jsx](../to-do-list/frontend/src/layouts/Mainlayout.jsx):
  - Top: AppBar.
  - Left (desktop): SidebarNav.
  - Bottom (mobile): BottomNav.
  - Main content: Outlet.
  - Special case: route task render dạng modal với nền HomePage.

Kết quả: navigation behavior thống nhất giữa mobile và desktop.

---

## 4.2 Design system và UI primitives

### 4.2.1 Nền tảng style

- [to-do-list/frontend/src/index.css](../to-do-list/frontend/src/index.css):
  - Tailwind v4 + tw-animate + shadcn CSS.
  - Custom utility comic-shadow, comic-dots-bg, desktop-hover-\*.
  - Theme token bằng CSS variables (background, primary, secondary, border, radius...).
  - Toaster theme tùy biến.

### 4.2.2 UI primitive layer

- [to-do-list/frontend/src/components/ui/button.jsx](../to-do-list/frontend/src/components/ui/button.jsx): variant + size matrix bằng cva.
- [to-do-list/frontend/src/components/ui/select.jsx](../to-do-list/frontend/src/components/ui/select.jsx): radix select tùy biến border/shadow/token dự án.
- [to-do-list/frontend/src/components/ui/pagination.jsx](../to-do-list/frontend/src/components/ui/pagination.jsx): pagination primitive custom cho style app.
- [to-do-list/frontend/src/components/ui/input.jsx](../to-do-list/frontend/src/components/ui/input.jsx): input base với ring/invalid handling.

### 4.2.3 Shared modal token

- [to-do-list/frontend/src/lib/taskModalDesignSystem.js](../to-do-list/frontend/src/lib/taskModalDesignSystem.js): chuẩn hóa class cho option button, footer, modal surface.
- Được dùng xuyên suốt New/Edit/Filter/Task detail để đảm bảo consistency.

---

## 4.3 Data-access layer (services + axios)

### authService

- [to-do-list/frontend/src/services/authService.js](../to-do-list/frontend/src/services/authService.js): register/login/logout/refresh + token localStorage helper.

### taskService

- [to-do-list/frontend/src/services/taskService.js](../to-do-list/frontend/src/services/taskService.js): get/create/update/delete/restore/trash task.

### axios infrastructure

- [to-do-list/frontend/src/lib/axios.js](../to-do-list/frontend/src/lib/axios.js):
  - baseURL từ VITE_API_URL.
  - withCredentials bật để đi kèm refresh cookie.
  - request interceptor thêm Authorization.
  - response interceptor queue request khi refresh token đang chạy.

Nhận xét:

- Kiến trúc hợp lý cho app SPA có JWT access token + refresh cookie.
- Có cơ chế failedQueue, tránh bắn nhiều refresh request đồng thời.

---

## 4.4 Domain pages và luồng nghiệp vụ

## 4.4.1 Home + Filter + ViewAll

### HomePage

- [to-do-list/frontend/src/pages/HomePage.jsx](../to-do-list/frontend/src/pages/HomePage.jsx):
  - Đọc query params (status/priority/tag/search/page).
  - Fetch task có phân trang.
  - Render StatusCounter + TaskCard list.
  - Có DeleteConfirmDialog và page-jump pagination.

### FilterPage

- [to-do-list/frontend/src/pages/FilterPage.jsx](../to-do-list/frontend/src/pages/FilterPage.jsx):
  - Build filter UI theo trạng thái/ưu tiên/tags.
  - Apply sẽ chuyển về Home với query params.

### ViewAllPage (Kanban)

- [to-do-list/frontend/src/pages/ViewAllPage.jsx](../to-do-list/frontend/src/pages/ViewAllPage.jsx):
  - Group task theo todo/doing/done.
  - DndContext + DragOverlay.
  - Optimistic update status khi kéo thả, rollback nếu API fail.

### Component hỗ trợ

- [to-do-list/frontend/src/components/KanbanColumn.jsx](../to-do-list/frontend/src/components/KanbanColumn.jsx)
- [to-do-list/frontend/src/components/KanbanCard.jsx](../to-do-list/frontend/src/components/KanbanCard.jsx)
- [to-do-list/frontend/src/components/TaskCard.jsx](../to-do-list/frontend/src/components/TaskCard.jsx)
- [to-do-list/frontend/src/components/StatusCounter.jsx](../to-do-list/frontend/src/components/StatusCounter.jsx)

---

## 4.4.2 Task modal flow (new/edit/detail)

### NewTaskPage

- [to-do-list/frontend/src/pages/NewTaskPage.jsx](../to-do-list/frontend/src/pages/NewTaskPage.jsx)
- react-hook-form + zod schema ([to-do-list/frontend/src/lib/taskSchema.js](../to-do-list/frontend/src/lib/taskSchema.js)).
- Progressive disclosure: nhập title trước, sau đó mở phần còn lại.
- Dùng DeadlinePicker, tags, status/priority chips.

### EditTaskPage

- [to-do-list/frontend/src/pages/EditTaskPage.jsx](../to-do-list/frontend/src/pages/EditTaskPage.jsx)
- Fetch task by id, reset form, submit update.
- Cấu trúc UI gần tương tự NewTask để giảm cognitive switching.

### TaskDetailPage

- [to-do-list/frontend/src/pages/TaskDetailPage.jsx](../to-do-list/frontend/src/pages/TaskDetailPage.jsx)
- Hiển thị detail + due countdown + trạng thái/ưu tiên.
- Có nhánh fallback khi mở từ audit log và task gốc không còn tồn tại.
- Hỗ trợ delete với dialog xác nhận.

### Shared modal components

- [to-do-list/frontend/src/components/TaskModalShell.jsx](../to-do-list/frontend/src/components/TaskModalShell.jsx)
- [to-do-list/frontend/src/components/TaskModalTopBar.jsx](../to-do-list/frontend/src/components/TaskModalTopBar.jsx)
- [to-do-list/frontend/src/components/DeleteConfirmDialog.jsx](../to-do-list/frontend/src/components/DeleteConfirmDialog.jsx)

---

## 4.4.3 Activities, Profile, Settings, Auth

### ActivitiesPage

- [to-do-list/frontend/src/pages/ActivitiesPage.jsx](../to-do-list/frontend/src/pages/ActivitiesPage.jsx)
- Fetch /profile/audit-logs theo page và search.
- Group log theo ngày, tone theo hôm nay/hôm qua/ngày cũ.
- Cleanup panel cho xóa theo phạm vi (all/day/month) + type.
- Cho phép mở task từ log bằng modal detail route.

### ProfilePage

- [to-do-list/frontend/src/pages/ProfilePage.jsx](../to-do-list/frontend/src/pages/ProfilePage.jsx)
- Tải profile + thống kê task theo status bằng 3 request tổng số.
- Render profile card, tổng quan, nút logout.

### SettingsPage

- [to-do-list/frontend/src/pages/SettingsPage.jsx](../to-do-list/frontend/src/pages/SettingsPage.jsx)
- Tải profile + sessions count.
- Cập nhật displayName/avatar/theme/language qua API profile.
- Có upload avatar file, validate type/size, convert base64.

### Login/Register/Auth guards

- [to-do-list/frontend/src/pages/LoginPage.jsx](../to-do-list/frontend/src/pages/LoginPage.jsx)
- [to-do-list/frontend/src/pages/RegisterPage.jsx](../to-do-list/frontend/src/pages/RegisterPage.jsx)
- [to-do-list/frontend/src/components/ProtectedRoute.jsx](../to-do-list/frontend/src/components/ProtectedRoute.jsx)
- [to-do-list/frontend/src/components/AuthRoute.jsx](../to-do-list/frontend/src/components/AuthRoute.jsx)

---

## 5) Sơ đồ logic tổng quan frontend

```text
Browser
  -> main.jsx
  -> App.jsx (RouterProvider + Toaster)
  -> routes/index.jsx
      -> ProtectedRoute/AuthRoute
      -> MainLayout
          -> AppBar + Sidebar/BottomNav + Outlet
          -> Page components
              -> service/api calls
                  -> axios interceptors
                      -> backend API

Song song:
- UI primitives (src/components/ui/*)
- design tokens (src/index.css, src/lib/taskModalDesignSystem.js)
- reusable hooks (src/hooks/useCountdown.js)
```

Diễn giải:

- Frontend tách rõ orchestration layer (router/layout) và business UI layer (pages/components).
- Data flow đi qua service/axios tương đối nhất quán, đồng thời có fallback direct-api cho vài page profile/settings/activities.

---

## 6) Đánh giá hiện trạng frontend giữa kỳ

### 6.1 Điểm tốt

1. Kiến trúc route và layout rõ, dễ mở rộng thêm màn hình.
2. Task flow đầy đủ: list/filter/view-all/create/edit/detail/delete/restore.
3. UX tốt nhờ modal route pattern, countdown, drag-drop, toast, skeleton, empty/error states.
4. Design system có bản sắc riêng, không phụ thuộc mặc định framework.
5. Reuse component cao ở các phần tương đồng (pagination, modal, option controls, status badges).

### 6.2 Điểm cần cải thiện (technical debt)

1. Lint hiện tại còn 1 error + 3 warnings:

- [to-do-list/frontend/src/pages/NewTaskPage.jsx](../to-do-list/frontend/src/pages/NewTaskPage.jsx)
- [to-do-list/frontend/src/hooks/useCountdown.js](../to-do-list/frontend/src/hooks/useCountdown.js)
- [to-do-list/frontend/src/pages/TaskDetailPage.jsx](../to-do-list/frontend/src/pages/TaskDetailPage.jsx)
- [to-do-list/frontend/src/components/ui/pagination.jsx](../to-do-list/frontend/src/components/ui/pagination.jsx)

2. Contract refresh token ở axios có nguy cơ lệch backend:

- Axios đang ưu tiên đọc data.token từ refresh response trong [to-do-list/frontend/src/lib/axios.js](../to-do-list/frontend/src/lib/axios.js).
- Backend hiện trả data.accessToken (điểm này đã thấy ở báo cáo backend).

3. FilterPage có status canceled trong UI, nhưng backend task status hiện không dùng canceled.

- Nên đồng bộ enum frontend/backend để tránh lọc rỗng gây khó hiểu.

4. Data-access chưa đồng nhất hoàn toàn:

- Một số page dùng trực tiếp api.get/api.put thay vì đi qua services thống nhất.

---

## 7) Mức độ hoàn thành theo góc nhìn frontend

- Tổng số file mã nguồn frontend (js/jsx/css) hiện có: 52 file.
- Các khối đã đạt mức tốt giữa kỳ:
  - Auth pages và route guards.
  - Home + Filter + ViewAll.
  - Task modal trio (new/edit/detail).
  - Activities timeline + cleanup UI.
  - Profile + Settings.
  - Core reusable component set.

Nhận định:

Frontend đã vượt giai đoạn prototype, đang ở mức product-ready cho luồng chính người dùng cá nhân. Cần thêm một vòng hardening để đạt mức final-demo ổn định hơn.

---

## 8) Hướng hoàn thiện frontend cuối kỳ

1. Chuẩn hóa contract auth refresh với backend (accessToken field).
2. Dọn sạch lint error/warning để ổn định build pipeline.
3. Đồng bộ enum filter giữa frontend và backend (status/priority).
4. Gom API call theo service layer nhất quán (profile, settings, activities).
5. Bổ sung test cho các luồng critical:

- token refresh + retry.
- create/edit/delete task.
- drag-drop status update rollback.
- audit cleanup filter logic.

6. Sẵn sàng cho phần admin frontend và realtime integration khi backend hoàn thiện phase cuối.

---

## 9) Kết luận

Frontend giữa kỳ của dự án đã có kiến trúc và trải nghiệm đủ mạnh để hỗ trợ demo nghiệp vụ thực tế, đặc biệt ở nhóm tính năng task lifecycle và interaction-rich UI. Trọng tâm giai đoạn còn lại không nằm ở việc xây lại nền tảng, mà là chuẩn hóa contract, giảm technical debt và tăng độ tin cậy vận hành.

Nói ngắn gọn: frontend đã ở trạng thái từ complete feature set (core) sang production-like consistency.
