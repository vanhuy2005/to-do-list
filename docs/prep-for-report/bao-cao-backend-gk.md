# 11. Báo cáo backend giữa kỳ (GK)

- Dự án: To-Do List Web App
- Phạm vi báo cáo: toàn bộ folder backend
- Nguồn đối chiếu: mã nguồn thực tế trong to-do-list/backend
- Mục tiêu báo cáo: mô tả rõ cấu trúc backend, logic hoạt động tổng quan, phân tích từng domain nghiệp vụ, đánh giá hiện trạng và định hướng hoàn thiện cuối kỳ

---

## 1) Tóm tắt điều hành

Backend hiện tại đã đạt mức vận hành tốt cho luồng người dùng chính: xác thực local, quản lý task đầy đủ vòng đời (CRUD, soft delete, restore), audit log thao tác task, profile/sessions, nhóm API admin và cron jobs xử lý dữ liệu theo thời gian.

Điểm mạnh lớn nhất là kiến trúc chia lớp tương đối rõ (route -> middleware -> viewmodel -> model), giúp code dễ mở rộng và dễ đọc. Điểm còn thiếu tập trung ở phần hardening production và đồng bộ contract giữa backend và frontend ở vài endpoint.

---

## 2) Cấu trúc thư mục backend (ngắn gọn, tường minh)

### 2.1 Cây thư mục

```text
backend/
  package.json
  .env
  src/
    server.js
    config/
      db.js
    cron/
      cronJobs.js
    middleware/
      authMiddleware.js
      taskQueryMiddleware.js
    models/
      User.js
      Task.js
      RefreshSession.js
      AuditLog.js
    routes/
      authRouters.js
      tasksRouters.js
      profileRouters.js
      auditLogsRouters.js
      adminRouters.js
    viewmodels/
      authViewModel.js
      taskViewModel.js
      profileViewModel.js
      adminViewModel.js
    scripts/
      migrateOverdueField.js
```

### 2.2 Vai trò từng folder

| Folder/File    | Vai trò                  | Logic chính                                                                                           |
| -------------- | ------------------------ | ----------------------------------------------------------------------------------------------------- |
| src/server.js  | Điểm vào của backend     | Khởi tạo app Express, CORS, body parser, cookie parser, mount routes, kết nối MongoDB, khởi chạy cron |
| src/config     | Hạ tầng kết nối          | Chứa db.js để connect Mongoose                                                                        |
| src/middleware | Cổng kiểm soát request   | authMiddleware xác thực JWT + trạng thái user; taskQueryMiddleware validate query task                |
| src/models     | Lớp dữ liệu MongoDB      | Định nghĩa schema, index, TTL, pre-save hook                                                          |
| src/routes     | Định nghĩa API endpoint  | Ánh xạ URL sang hàm nghiệp vụ viewmodel                                                               |
| src/viewmodels | Lớp nghiệp vụ chính      | Validate business rule, đọc/ghi DB, tạo response chuẩn, ném lỗi domain                                |
| src/cron       | Nghiệp vụ nền theo lịch  | Đánh dấu overdue mỗi phút, dọn task hết hạn restore mỗi ngày                                          |
| src/scripts    | Script một lần/migration | Chuyển explicitOverdue sang isOverdue + overdueAt                                                     |
| package.json   | Runtime contract         | Scripts chạy app, danh sách dependencies runtime/dev                                                  |

Kết luận kiến trúc folder: backend này áp dụng mô hình service-oriented theo module nghiệp vụ, trong đó viewmodel đóng vai trò business layer thay cho controller truyền thống.

---

## 3) Bức tranh tổng quan cách backend hoạt động

### 3.1 Luồng khởi động hệ thống

1. Nạp biến môi trường và kiểm tra JWT secrets trong môi trường non-dev.
2. Tạo app Express, cấu hình CORS danh sách whitelist từ CORS_ORIGIN.
3. Gắn middleware parse body và cookie.
4. Mount routes public và protected theo tiền tố /api/v1.
5. Kết nối MongoDB thành công thì khởi chạy cron jobs.
6. Bắt đầu listen cổng service.

File thực thi chính: to-do-list/backend/src/server.js

### 3.2 Luồng request chuẩn

1. Client gọi endpoint.
2. Nếu protected route: authMiddleware kiểm tra Bearer token, verify JWT, lấy user từ DB, chặn user disabled.
3. Route chuyển request tới viewmodel tương ứng.
4. Viewmodel validate business data, truy vấn model, xử lý logic domain.
5. Nếu có thay đổi task quan trọng thì ghi AuditLog.
6. Trả response JSON theo format success/data/message hoặc error.

### 3.3 Hợp đồng response và lỗi

- Các route dùng wrapper errorHandler để bắt lỗi domain (AuthViewModelError, ProfileViewModelError, AdminViewModelError, ViewModelError).
- Mỗi lỗi domain trả status code + error code + message rõ ràng.
- Lỗi ngoài dự kiến trả INTERNAL_ERROR (500).

Ý nghĩa: cách này giúp frontend xử lý lỗi theo code ổn định hơn so với chỉ dựa message text.

---

## 4) Phân tích chi tiết theo từng lớp

## 4.1 Lớp config

### db.js

- Sử dụng mongoose.connect với biến MONGODB_CONNECTIONSTRING.
- Nếu thất bại thì process.exit(1) để tránh app chạy trong trạng thái nửa vời.

Nhận xét: đơn giản, đúng mục tiêu cho môi trường học tập và demo.

---

## 4.2 Lớp middleware

### authMiddleware.js

Nghiệp vụ:

- Đọc token từ Authorization: Bearer <token>.
- verify JWT.
- Truy user trong DB để lấy role/status mới nhất.
- Chặn user disabled với 403 USER_DISABLED.
- Gắn req.user và req.userId cho tầng dưới.

Tác dụng:

- Bảo vệ route ở cấp hệ thống.
- Tránh tình trạng token hợp lệ nhưng user đã bị vô hiệu hóa.

### taskQueryMiddleware.js

Nghiệp vụ:

- Validate page, limit, completed, order, sort.
- Giới hạn limit tối đa 100.
- Chặn sort field ngoài whitelist.

Tác dụng:

- Chống query xấu từ client.
- Giảm rủi ro query nặng gây suy giảm hiệu năng.

---

## 4.3 Lớp models (dữ liệu + index)

### User.js

Các thuộc tính chính:

- Danh tính: email, passwordHash, displayName, avatarUrl.
- Phân quyền/trạng thái: role, status.
- Liên kết provider: local/google/github.
- Tuỳ biến hồ sơ: preferredLanguage, themePreference, customStatuses.
- Theo dõi hoạt động: lastOnlineAt, disabledAt.

### Task.js

Các thuộc tính chính:

- ownerId, title, description.
- status (todo/doing/done), priority (low/medium/high), tags.
- dueDate, isOverdue, overdueAt.
- completedAt, deletedAt, restoreUntil.

Index và hook quan trọng:

- Compound index theo owner + status + dueDate + updatedAt.
- Text index title/description phục vụ search.
- Index cho overdue query.
- pre-save tự set completedAt khi status done.

### RefreshSession.js

- Lưu phiên refresh token theo userId + tokenHash.
- TTL index expiresAt để auto xóa session hết hạn.
- Lưu userAgent/ipAddress phục vụ quản lý thiết bị.

### AuditLog.js

- Lưu lịch sử hành động actor/target, action, entityType/entityId, before/after snapshot.
- TTL 30 ngày bằng expireAfterSeconds.
- Index actorId + createdAt để đọc timeline nhanh.

Nhận xét tổng quan model layer:

- Thiết kế chú trọng lifecycle data thực tế (soft delete, TTL, overdue).
- Cân bằng giữa hiệu năng truy vấn và tính truy vết nghiệp vụ.

---

## 4.4 Lớp viewmodels (business logic lõi)

## 4.4.1 authViewModel.js

Các nghiệp vụ chính:

- register: validate input, hash password, tạo user, tạo token access/refresh, hash refresh token lưu RefreshSession.
- login: xác thực email/password, chặn user disabled, phát token mới, tạo session mới.
- refresh: verify refresh token, dò session hash hợp lệ, cấp access token mới.
- logout: xóa toàn bộ refresh sessions của user.

Điểm đáng chú ý:

- Refresh token được hash trước khi lưu DB, không lưu plain token.
- Cookie refreshToken được set httpOnly ở route auth.

## 4.4.2 taskViewModel.js

Các nghiệp vụ chính:

- getAllTasks: filter động theo status/priority/search/tag/due range/completed/isOverdue/includeDeleted + pagination + sort.
- getTaskById: chỉ lấy task của owner và chưa deleted.
- createTask: tạo task mới + ghi audit task.created.
- updateTask: cập nhật whitelist field, đồng bộ completedAt/isOverdue theo status và dueDate + ghi audit task.updated.
- deleteTask: soft delete bằng deletedAt + restoreUntil (7 ngày) + audit task.deleted.
- restoreTask: restore trong cửa sổ hợp lệ + audit task.restored.
- getDeletedTasks: list trash với pagination.
- purgeExpiredDeletedTasks: hard delete task quá hạn restore (cron dùng).
- hardDeleteTask: xóa vĩnh viễn task trong trash.

Điểm đáng chú ý:

- Tầng task là trung tâm nghiệp vụ mạnh nhất của backend.
- Audit log được gắn xuyên suốt các action quan trọng để truy vết thay đổi.

## 4.4.3 profileViewModel.js

Các nghiệp vụ chính:

- getProfile/updateProfile: đọc và cập nhật thông tin cá nhân.
- getSessions/deleteSession: quản lý refresh sessions theo thiết bị.
- getAuditLogs/getAuditLogById/deleteAuditLogById: timeline activity cá nhân.
- deleteAuditLogsByUserWithFilters: xóa hàng loạt audit log theo day/month/type (hỗ trợ admin hoặc self).
- deleteAuditLogs: xóa toàn bộ hoặc giữ lại N log mới nhất.

Điểm đáng chú ý:

- Có cả xóa đơn lẻ và xóa theo bộ lọc, phù hợp màn Activity cleanup.
- Validate filter day/month/type khá chặt.

## 4.4.4 adminViewModel.js

Các nghiệp vụ chính:

- getUsers/updateUser: quản lý danh sách user và role/status.
- getModeration/disableInactiveUser: kiểm duyệt user không hoạt động.
- getTrash: danh sách tài khoản disabled.
- getTasksForModeration: truy cập tasks phục vụ kiểm duyệt.
- getAnalytics: tổng quan users/tasks, taskDistribution, providerUsage.
- deleteUserOffline: xóa user đã offline tối thiểu 7 ngày.
- getAuditLogs: đọc audit log toàn hệ thống.

Điểm đáng chú ý:

- Đủ backend API cho admin dashboard.
- userGrowthTrend hiện đang trả mảng rỗng, là phần còn dang dở.

---

## 4.5 Lớp routes (API map)

## authRouters.js

- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- POST /api/v1/auth/logout

## tasksRouters.js

- GET /api/v1/tasks
- POST /api/v1/tasks
- GET /api/v1/tasks/trash
- GET /api/v1/tasks/:id
- PUT /api/v1/tasks/:id
- POST /api/v1/tasks/:id/restore
- DELETE /api/v1/tasks/:id

## profileRouters.js

- GET /api/v1/profile
- PUT /api/v1/profile
- GET /api/v1/profile/sessions
- DELETE /api/v1/profile/sessions/:id
- GET /api/v1/profile/audit-logs
- DELETE /api/v1/profile/:id (đang gọi deleteAuditLogs theo query)

## auditLogsRouters.js

- GET /api/v1/audit-logs/:id
- DELETE /api/v1/audit-logs/user/:userId
- DELETE /api/v1/audit-logs/:id

## adminRouters.js

- GET /api/v1/admin/users
- PUT /api/v1/admin/users/:id
- DELETE /api/v1/admin/users/:id
- GET /api/v1/admin/moderation
- PUT /api/v1/admin/moderation/:id/disable
- GET /api/v1/admin/trash
- GET /api/v1/admin/tasks
- GET /api/v1/admin/analytics
- GET /api/v1/admin/audit-logs

Nhận xét route layer:

- Route map bao phủ khá rộng các use-case giữa kỳ.
- requireAdmin áp ở router admin, phân quyền rõ tại biên API.

---

## 4.6 Lớp cron và scripts

## cronJobs.js

Có 2 job chính:

1. Overdue evaluator (mỗi phút)

- Tìm task quá hạn nhưng chưa isOverdue.
- updateMany set isOverdue=true, overdueAt=now.
- Ghi batch audit task.overdue bằng insertMany.

2. Expired task purge (03:00 mỗi ngày)

- Gọi taskViewModel.purgeExpiredDeletedTasks để xóa task quá hạn khôi phục.

Ý nghĩa:

- Đảm bảo overdue và trash lifecycle luôn nhất quán dù không có request từ client.

## migrateOverdueField.js

- Migration một lần từ explicitOverdue sang isOverdue.
- Đồng thời đánh dấu overdue cho dữ liệu cũ.

Ý nghĩa:

- Cho thấy dự án có tư duy tiến hóa schema, không chỉ code mới mà còn quan tâm dữ liệu lịch sử.

---

## 5) Sơ đồ logic tổng quan backend

```text
Client
  -> /api/v1/*
  -> server.js (CORS + parser + route mount)
  -> authMiddleware (protected route)
  -> route errorHandler
  -> viewmodel business logic
  -> mongoose model query/update
  -> (optional) AuditLog write
  -> JSON response

Song song:
cronJobs.js
  -> overdue evaluator
  -> purge expired deleted tasks
```

Diễn giải ngắn:

- Request runtime và cron runtime cùng tác động lên Task/AuditLog theo 2 nhịp: theo sự kiện người dùng và theo lịch hệ thống.
- Đây là kiến trúc phù hợp bài toán task management có deadline/time-based behavior.

---

## 6) Đánh giá hiện trạng backend giữa kỳ

### 6.1 Điểm tốt

1. Phân lớp rõ ràng, dễ đọc và dễ bảo trì.
2. Nghiệp vụ task có chiều sâu và đầy đủ vòng đời dữ liệu.
3. Có cơ chế audit log xuyên suốt cho truy vết.
4. Có cron jobs để giữ dữ liệu đồng bộ trạng thái theo thời gian.
5. Session refresh token hash + TTL là điểm cộng về an toàn.

### 6.2 Điểm cần cải thiện (technical debt)

1. Chưa bật middleware hardening production dù đã có dependency:

- express-rate-limit
- helmet
- morgan

2. Có bất nhất semantics ở profile route:

- DELETE /profile/:id hiện gọi deleteAuditLogs theo query và không dùng id.
- Dễ gây hiểu nhầm API contract.

3. Có rủi ro lệch contract auth refresh với frontend:

- Backend refresh trả data.accessToken.
- Frontend interceptor đang ưu tiên đọc data.token.

4. Một số xử lý cần chuẩn hóa thêm kiểu dữ liệu và boundary cases:

- So sánh owner session theo string cần thống nhất triệt để kiểu ObjectId/string trong toàn flow.

---

## 7) Kết luận và hướng hoàn thiện backend cuối kỳ

Backend đã vượt mức “skeleton API” và tiến tới trạng thái “domain-ready backend” cho bài toán To-Do. Trọng tâm cuối kỳ không phải viết lại kiến trúc, mà là:

1. Hardening vận hành production (rate limit, security headers, logging chuẩn).
2. Chuẩn hóa API contract giữa backend và frontend.
3. Làm sạch các route semantics chưa nhất quán.
4. Bổ sung test chiến lược cho các flow critical (auth refresh, task lifecycle, audit cleanup).
5. Hoàn thiện các phần còn dang dở của admin analytics.

Nếu thực hiện tốt 5 nhóm trên, backend sẽ đạt mức ổn định cao để hỗ trợ phần frontend nâng cao và triển khai cuối kỳ.
