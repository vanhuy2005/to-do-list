# 📋 TASKED — Checklist Chi Tiết Xây Dựng Dự Án

> **Cập nhật:** 2026-04-03 · **Quy tắc:** MVP-first → API → UI → Kết nối → Auth → Full Features
>
> **Tech Stack:** Vite + React, Shadcn/ui (custom Pop Art), Axios, dnd-kit, Recharts, Sonner, react-hook-form + Zod
>
> **Kiến trúc Backend:** MVVM (Model-View-ViewModel) — [ADR-006](./07-architectural-decisions.md#adr-006)

---

## PHASE 1 — REFACTOR BACKEND HIỆN TẠI

### 1.1 Chuẩn hóa cấu trúc Backend

- [x] Thêm `cors` package → `npm i cors`
- [x] Cấu hình CORS trong `server.js` (allow frontend origin)
- [x] Đổi prefix route `/api/tasks` → `/api/v1/tasks` (theo chuẩn versioning)
- [ ] Tạo file `.env.example` (bỏ sensitive values, chỉ giữ key mẫu)
- [x] Thêm `.env` vào `.gitignore` (kiểm tra lại)
- [ ] Thêm script `npm run lint` vào `package.json`

### 1.2 Refactor Task Model (`models/Task.js`)

- [x] Thêm field `priority` — enum `["low", "medium", "high"]`, default `"medium"`
- [x] Thêm field `orderIndex` — Number, default `0` (vị trí Kanban kéo-thả)
- [x] Thêm field `deletedAt` — Date, default `null` (soft-delete)
- [x] Thêm field `restoreUntil` — Date, default `null` (deletedAt + 7 ngày)
- [x] Xóa `required: true` cho `dueDate` (cho phép tạo task không có deadline)
- [x] Thêm validation `enum` cho `priority`

### 1.3 Refactor User Model (`models/User.js`)

- [x] Thêm field `email` — String, required, unique, lowercase, trim
- [x] Đổi `name` → `displayName`
- [x] Thêm field `passwordHash` — String (hash bằng bcrypt)
- [x] Thêm field `status` — enum `["active", "disabled"]`, default `"active"`
- [x] Thêm field `providers` — `[String]`, enum `["local", "google", "github"]`, default `[]`
- [x] Thêm field `avatarUrl` — String, default `null`
- [x] Thêm field `lastOnlineAt` — Date, default `null`
- [x] Thêm field `disabledAt` — Date, default `null` (thời điểm bị disable, auto-delete sau 7 ngày)
- [x] Thêm field `preferredLanguage` — enum `["vi", "en"]`, default `"vi"`
- [x] Thêm field `themePreference` — enum `["light", "dark"]`, default `"light"`
- [x] Thêm field `customStatuses` — `[String]`, tối đa 8 phần tử
- [x] Xóa field `password` cũ (thay bằng `passwordHash`)

### 1.4 Refactor Task ViewModel — Soft Delete (`viewmodels/taskViewModel.js`)

- [x] Tạo `viewmodels/taskViewModel.js` — MVVM pattern, chứa toàn bộ business logic
- [x] Tạo class `ViewModelError` — custom error với `statusCode`, `errorCode`, `message`
- [x] Method `deleteTask`: gán `deletedAt = new Date()` + `restoreUntil = +7 ngày` (soft-delete)
- [x] Method `getAllTasks`: thêm filter `{ deletedAt: null }` để ẩn task đã xóa
- [x] Method `restoreTask` — xóa `deletedAt` và `restoreUntil` nếu còn trong cửa sổ 7 ngày
- [x] Method `getDeletedTasks` — query `{ deletedAt: { $ne: null } }` cho Delete Panel
- [x] Method `createTask`: validate `priority`, whitelist allowed fields
- [x] Method `purgeExpiredDeletedTasks` — hard delete tasks quá hạn khôi phục
- [x] Method `hardDeleteTask` — xóa vĩnh viễn task từ thùng rác

### 1.5 Cập nhật Routes (`routes/tasksRouters.js`)

- [x] Tạo `routes/tasksRouters.js` — thin binding layer (MVVM View)
- [x] Route `POST /api/v1/tasks/:id/restore` → `taskViewModel.restoreTask`
- [x] Route `GET /api/v1/tasks/trash` → `taskViewModel.getDeletedTasks`
- [x] Cập nhật prefix tất cả routes → `/api/v1/tasks`
- [x] Error handler wrapper: bắt `ViewModelError` → format response chuẩn

### 1.6 Chuẩn hóa Response Format (MVVM Pattern)

- [x] Mỗi ViewModel method return object chuẩn: `{ statusCode, success, data, message }`
- [x] Routes layer chỉ nhận result và gọi `res.status(result.statusCode).json({...})`
- [x] Error format thống nhất: `{ success: false, error: { code: "...", message: "..." } }`
- [x] Mỗi ViewModel có custom Error class riêng (`ViewModelError`, `AuthViewModelError`, etc.)

### ✅ Checkpoint 1: Test toàn bộ API refactored bằng Thunder Client
- [ ] Test GET `/api/v1/tasks` — chỉ trả task chưa xóa
- [ ] Test POST `/api/v1/tasks` — tạo task với priority
- [ ] Test PUT `/api/v1/tasks/:id` — cập nhật task
- [ ] Test DELETE `/api/v1/tasks/:id` — soft delete (kiểm tra `deletedAt` có giá trị)
- [ ] Test POST `/api/v1/tasks/:id/restore` — khôi phục task
- [ ] Test GET `/api/v1/tasks/trash` — danh sách task đã xóa

---

## PHASE 2 — MỞ RỘNG BACKEND API (MVP)

### 2.1 Thêm Query Parameters cho GET `/tasks`

- [x] Hỗ trợ `?status=todo` — lọc theo status
- [x] Hỗ trợ `?priority=high` — lọc theo priority
- [x] Hỗ trợ `?search=keyword` — full-text search trên title
- [x] Hỗ trợ `?page=1&limit=20` — phân trang
- [x] Hỗ trợ `?sort=dueDate&order=asc` — sắp xếp
- [x] Trả về object pagination: `{ page, limit, total, totalPages }`
- [x] Hỗ trợ `?tag=urgent,report` — lọc theo tags
- [x] Hỗ trợ `?dueDateFrom=...&dueDateTo=...` — lọc theo date range
- [x] Hỗ trợ `?completed=true/false` — lọc theo trạng thái hoàn thành
- [x] Hỗ trợ `?includeDeleted=true` — bao gồm task đã soft-delete

### 2.2 Tạo Text Index cho Search

- [x] Thêm index `{ title: "text", description: "text" }` vào Task model
- [ ] Test search hoạt động đúng bằng Thunder Client

### 2.3 GET chi tiết Task

- [x] Method `getTaskById` trong `taskViewModel` — trả task theo ID + ownerId
- [x] Route `GET /api/v1/tasks/:id`
- [x] Trả 404 nếu task không tồn tại hoặc đã soft-delete

### 2.4 Tạo Task Query Middleware (`middleware/taskQueryMiddleware.js`)

- [x] Validate `page` — phải là số nguyên dương
- [x] Validate `limit` — phải là số nguyên dương, tối đa 100
- [x] Validate `completed` — chỉ nhận true/false
- [x] Validate `order` — chỉ nhận asc/desc
- [x] Validate `sort` — chỉ nhận fields cho phép

### ✅ Checkpoint 2: Test filter, search, pagination
- [ ] Test lọc: `GET /api/v1/tasks?status=doing&priority=high`
- [ ] Test search: `GET /api/v1/tasks?search=báo cáo`
- [ ] Test pagination: `GET /api/v1/tasks?page=2&limit=5`
- [ ] Test sort: `GET /api/v1/tasks?sort=dueDate&order=asc`

---

## PHASE 3 — SETUP FRONTEND

### 3.1 Khởi tạo Vite + React

- [ ] Chạy `npx create-vite@latest ./` trong folder `frontend/` — chọn React + JavaScript
- [ ] Xóa file template mặc định (App.css, assets/react.svg, etc.)
- [ ] Cài dependencies cơ bản: `npm i axios react-router-dom`
- [ ] Tạo file `.env` với `VITE_API_URL=http://localhost:5001/api/v1`
- [ ] Test `npm run dev` — app chạy thành công

### 3.2 Cài TailwindCSS v4

- [ ] Cài TailwindCSS theo docs mới nhất cho Vite
- [ ] Cấu hình `tailwind.config.js` (nếu v3) hoặc CSS config (nếu v4)
- [ ] Test: thêm class `bg-red-500` vào App.jsx → verify hoạt động
- [ ] Xóa test class

### 3.3 Cài Shadcn/ui

- [ ] Chạy `npx shadcn@latest init` — chọn config phù hợp
- [ ] Cấu hình `components.json` — path aliases
- [ ] Override CSS variables của Shadcn bằng Pop Art Design Tokens:
  - [ ] `--primary: #FF2D55` (Pink)
  - [ ] `--secondary: #00C2FF` (Cyan)
  - [ ] `--background: #FFFDF7` (Kem)
  - [ ] `--foreground: #111111` (Đen)
  - [ ] `--destructive: #FF3B30`
  - [ ] `--border: #111111`
  - [ ] `--radius: 12px`
- [ ] Override font: import `Plus Jakarta Sans` từ Google Fonts
- [ ] Thêm custom CSS cho Pop Art:
  - [ ] Class `.comic-border` → `border: 3px solid #111111`
  - [ ] Class `.comic-shadow` → `box-shadow: 3px 3px 0 #111111`
  - [ ] Class `.comic-shadow-hover` → `box-shadow: 4px 4px 0 #111111`
  - [ ] Class `.comic-shadow-press` → `box-shadow: 1px 1px 0 #111111`
  - [ ] Class `.pill` → `border-radius: 9999px`

### 3.4 Setup Routing

- [ ] Tạo `src/App.jsx` — setup `BrowserRouter`
- [ ] Tạo layout `src/layouts/MainLayout.jsx` — Header + Content + Bottom Nav
- [ ] Tạo file routes:
  - [ ] `/` → HomePage
  - [ ] `/tasks/:id` → TaskDetailPage (hoặc drawer)
  - [ ] `/tasks/new` → (redirect, dùng modal)
  - [ ] `/filter` → FilterPage
  - [ ] `/settings` → SettingsPage
  - [ ] `/profile` → ProfilePage
  - [ ] `/login` → LoginPage
  - [ ] `/register` → RegisterPage
  - [ ] `*` → NotFoundPage
- [ ] Tạo placeholder components cho mỗi page (chỉ hiện tên page)

### 3.5 Setup Axios Instance

- [ ] Tạo `src/lib/axios.js` — base instance với `baseURL` từ env
- [ ] Thêm request interceptor (chuẩn bị cho JWT sau)
- [ ] Thêm response interceptor — catch lỗi chung
- [ ] Export instance

### 3.6 Tạo API Service Layer

- [ ] Tạo `src/services/taskService.js`:
  - [ ] `getTasks(params)` — GET `/tasks` + query params
  - [ ] `getTaskById(id)` — GET `/tasks/:id`
  - [ ] `createTask(data)` — POST `/tasks`
  - [ ] `updateTask(id, data)` — PUT `/tasks/:id`
  - [ ] `deleteTask(id)` — DELETE `/tasks/:id`
  - [ ] `restoreTask(id)` — POST `/tasks/:id/restore`
  - [ ] `getDeletedTasks()` — GET `/tasks/trash`

### ✅ Checkpoint 3: Frontend khởi chạy, routing hoạt động
- [ ] Mở browser → thấy trang chủ placeholder
- [ ] Navigate qua các routes → đúng page
- [ ] Vào `/abc` → thấy NotFoundPage
- [ ] Console.log `taskService.getTasks()` → nhận data từ backend

---

## PHASE 4 — XÂY DỰNG UI COMPONENTS (POP ART)

### 4.1 Cài Shadcn Components cần thiết

- [ ] `npx shadcn@latest add button`
- [ ] `npx shadcn@latest add input`
- [ ] `npx shadcn@latest add textarea`
- [ ] `npx shadcn@latest add dialog` (cho Modal)
- [ ] `npx shadcn@latest add sheet` (cho Drawer)
- [ ] `npx shadcn@latest add select`
- [ ] `npx shadcn@latest add badge`
- [ ] `npx shadcn@latest add skeleton`
- [ ] `npx shadcn@latest add dropdown-menu`
- [ ] `npx shadcn@latest add popover`
- [ ] `npx shadcn@latest add calendar` (date picker)

### 4.2 Custom Pop Art overrides cho Shadcn

- [ ] Override `Button` — thêm `comic-border`, `comic-shadow`, hover/press states
- [ ] Override `Card` (nếu cần) — thêm border 3px + shadow
- [ ] Override `Input` — border 3px + focus ring Cyan
- [ ] Override `Badge` — pill shape, pop art colors
- [ ] Override `Dialog` — comic header, border
- [ ] Override `Sheet` — bottom drawer style, 70vh
- [ ] Override `Skeleton` — comic style (border + shimmer)

### 4.3 Shared Components tự build

- [ ] `AppBar.jsx` — Header cố định, comic offset shadow, title + action buttons
- [ ] `BottomNav.jsx` — Thanh điều hướng dưới, 5 links (Home, Filter, FAB, Audit, Profile)
- [ ] `TaskCard.jsx` — Card task: title, status badge, priority badge, due date, action button
- [ ] `StatusCounter.jsx` — 3 badges đếm Todo/Doing/Done
- [ ] `EmptyState.jsx` — Illustration + message + CTA (cho khi không có data)
- [ ] `ErrorState.jsx` — Error message + retry button
- [ ] `FAB.jsx` — Floating Action Button "Tạo Task" (pill, pink, comic shadow)

### 4.4 Cài Toast

- [ ] `npm i sonner`
- [ ] Setup `<Toaster />` trong App.jsx
- [ ] Custom style cho Pop Art (border, shadow, colors)
- [ ] Test: trigger toast thành công

### ✅ Checkpoint 4: Tất cả components render đúng Pop Art style
- [ ] Mở browser → thấy AppBar + BottomNav
- [ ] Mỗi component có border 3px đen + shadow
- [ ] Hover lên button → shadow tăng
- [ ] Click button → shadow giảm (press effect)
- [ ] Skeleton loading hiển thị đúng comic style

---

## PHASE 5 — TRANG HOME + CRUD TASK (MVP CORE)

### 5.1 UI trang Home

- [ ] Layout: AppBar (top) + Content (scroll) + BottomNav (bottom)
- [ ] Section 1: `StatusCounter` — 3 badges (Todo/Doing/Done) với số đếm từ API
- [ ] Section 2: Title "Công việc gần đây" + nút "Xem tất cả"
- [ ] Section 3: Task List — render `TaskCard` cho mỗi task
- [ ] FAB "Tạo Task" — pill button góc phải dưới

### 5.2 Fetch & Hiển thị Data

- [ ] Gọi `taskService.getTasks()` khi component mount
- [ ] Xử lý state: `loading` → hiện Skeleton (3 cards)
- [ ] Xử lý state: `empty` → hiện EmptyState "Chưa có task nào"
- [ ] Xử lý state: `error` → hiện ErrorState + retry button
- [ ] Xử lý state: `ready` → render TaskCard list
- [ ] Tính đếm status counters từ data trả về

### 5.3 Modal Tạo Task (Quick Add)

- [ ] Click FAB → mở Dialog (Shadcn)
- [ ] Form fields: Title (required), Description (optional), Status (select), Priority (select), Due Date (calendar picker)
- [ ] Cài `react-hook-form` + `zod`: `npm i react-hook-form zod @hookform/resolvers`
- [ ] Tạo schema validation Zod cho form tạo task
- [ ] Submit → gọi `taskService.createTask(data)`
- [ ] Thành công → toast "Tạo task thành công" + đóng modal + refresh danh sách
- [ ] Lỗi → toast error + giữ modal mở

### 5.4 Task Detail Drawer

- [ ] Click vào TaskCard → mở Sheet (bottom drawer) ~70vh
- [ ] Hiển thị: Title, Tags, Status Badge, Priority Badge, Due Date, Description
- [ ] Footer: 3 icon buttons (Edit, Delete, Close)
- [ ] Fetch `taskService.getTaskById(id)` khi mở drawer

### 5.5 Chỉnh sửa Task

- [ ] Click icon Edit trong drawer → mở Dialog chỉnh sửa (form pre-filled)
- [ ] Form giống tạo mới nhưng pre-load values
- [ ] Submit → `taskService.updateTask(id, data)` → toast + refresh
- [ ] Đóng dialog + đóng drawer

### 5.6 Xóa Task (Soft Delete)

- [ ] Click icon Delete → mở Confirm Dialog "Bạn có chắc muốn xóa?"
- [ ] Confirm → `taskService.deleteTask(id)` → toast "Đã chuyển vào thùng rác" → refresh
- [ ] Cancel → đóng dialog

### ✅ Checkpoint 5: CRUD Task hoạt động end-to-end
- [ ] Tạo task mới → xuất hiện trong danh sách
- [ ] Click task → xem chi tiết trong drawer
- [ ] Sửa task → data cập nhật
- [ ] Xóa task → biến mất khỏi danh sách (soft delete)
- [ ] Status counters đúng con số
- [ ] Tải trang → thấy skeleton → thấy data

---

## PHASE 6 — TÌM KIẾM, LỌC, PHÂN TRANG

### 6.1 Thanh Search

- [ ] AppBar thêm icon search → click → mở/đóng search bar (toggle)
- [ ] Input search với icon kính lúp
- [ ] Debounce input 300ms trước khi gọi API
- [ ] Gọi `taskService.getTasks({ search: keyword })` → hiện kết quả
- [ ] Nút X xóa search → quay lại danh sách bình thường

### 6.2 Trang Filter

- [ ] Navigate tới `/filter` (từ BottomNav hoặc icon)
- [ ] UI Sections:
  - [ ] Status: Multi-select chips (Todo, Doing, Done, All)
  - [ ] Priority: Radio buttons (Low, Medium, High)
  - [ ] Due Date Range: 2 date pickers (From — To)
  - [ ] Sort: Select dropdown (Due Date, Created, Updated, Priority)
- [ ] Footer: 2 buttons — "Đặt lại" (reset) + "Áp dụng" (apply)
- [ ] Apply → navigate về Home với query params → Home fetch filtered data
- [ ] Reset → xóa tất cả filter values

### 6.3 Phân trang

- [ ] Cuối Task List thêm pagination controls
- [ ] Hiển thị: "Trang 1/5" + nút Previous/Next
- [ ] Click Next → fetch page tiếp theo
- [ ] Hiện loading khi chuyển trang

### ✅ Checkpoint 6: Search, Filter, Pagination hoạt động
- [ ] Gõ keyword → kết quả filter đúng
- [ ] Chọn status "doing" → chỉ hiện task doing
- [ ] Chọn date range → filter đúng
- [ ] Chuyển trang → load data mới
- [ ] Reset filter → quay về tất cả

---

## PHASE 7 — TRANG NOT FOUND + PAGES PHỤ

### 7.1 NotFound Page (404)

- [ ] Explosion bubble icon (SVG hoặc emoji)
- [ ] Heading lớn "Oops! 404"
- [ ] Message "Trang bạn tìm không tồn tại"
- [ ] Button "Về trang chủ" → navigate `/`
- [ ] Style: Pop Art đậm — comic border, bright colors

### 7.2 Delete Panel (Thùng Rác Task)

- [ ] Thêm route `/trash` hoặc accessible từ Settings
- [ ] Gọi `taskService.getDeletedTasks()` → hiện danh sách
- [ ] Mỗi item: title, ngày xóa, thời gian còn lại trước purge
- [ ] Nút "Khôi phục" → `taskService.restoreTask(id)` → toast + refresh
- [ ] Empty state: "Thùng rác trống!"

### ✅ Checkpoint 7: Pages phụ hoạt động
- [ ] Navigate `/abc` → thấy 404 page Pop Art
- [ ] Xóa task → vào thùng rác → thấy task đã xóa
- [ ] Khôi phục → task quay lại danh sách chính

---

## PHASE 8 — AUTHENTICATION (BACKEND)

### 8.1 Cài dependencies Auth

- [x] `npm i bcrypt jsonwebtoken cookie-parser` (backend)
- [x] Thêm `cookie-parser` middleware vào `server.js`

### 8.2 Auth ViewModel (`viewmodels/authViewModel.js`)

- [x] Tạo `viewmodels/authViewModel.js` — MVVM pattern
- [x] Tạo class `AuthViewModelError` — custom error
- [x] Helper `validateRegisterPayload` — validate email, password (≥8 ký tự), displayName (2-50 ký tự)
- [x] Helper `generateTokens(userId)` — sign JWT access token (15m) + refresh token (7d)
- [x] Helper `hashToken(token)` — hash refresh token bằng bcrypt
- [x] Helper `formatUserResponse(user)` — strip sensitive fields (passwordHash)
- [x] Method `register` — validate → check email exists → hash password (bcrypt) → create user → generate tokens → create RefreshSession → return user + accessToken
- [x] Method `login` — find user → check status disabled → compare password (bcrypt) → generate tokens → create RefreshSession → return user + accessToken
- [x] Method `refresh` — verify refresh token JWT → find sessions → compare token hash → issue new access token
- [x] Method `logout` — delete all RefreshSessions of userId

### 8.3 Auth Middleware (`middleware/authMiddleware.js`)

- [x] Tạo `middleware/authMiddleware.js`
- [x] Đọc Bearer token từ header `Authorization`
- [x] Verify JWT → fetch User từ DB → check status `disabled` → gắn `req.user` + `req.userId`
- [x] Trả 401 nếu token missing/invalid, 403 nếu user disabled

### 8.4 Auth Routes (`routes/authRouters.js`)

- [x] Tạo `routes/authRouters.js` — thin binding layer
- [x] `POST /api/v1/auth/register` → set httpOnly cookie + return user + accessToken
- [x] `POST /api/v1/auth/login` → set httpOnly cookie + return user + accessToken
- [x] `POST /api/v1/auth/refresh` → đọc cookie → return new accessToken
- [x] `POST /api/v1/auth/logout` → clear cookie
- [x] Mount vào `server.js`

### 8.5 Env Variables

- [x] Thêm `JWT_SECRET` vào `.env`
- [x] Thêm `JWT_REFRESH_SECRET` vào `.env`
- [x] Thêm validation: server exit nếu missing secrets (trừ development mode)
- [ ] Cập nhật `.env.example`

### ✅ Checkpoint 8: Auth API hoạt động
- [ ] Register → trả user + token + set cookie
- [ ] Login → trả user + token
- [ ] Gọi GET `/tasks` không có token → 401
- [ ] Gọi GET `/tasks` có token → trả tasks của user đó
- [ ] Logout → cookie bị xóa
- [ ] Refresh → trả access token mới

---

## PHASE 9 — AUTHENTICATION (FRONTEND)

### 9.1 Auth Pages

- [ ] `LoginPage.jsx`:
  - [ ] Form: Email + Password + nút "Đăng nhập"
  - [ ] Link "Chưa có tài khoản? Đăng ký"
  - [ ] OAuth buttons (Google/GitHub) — UI chỉ, chưa functional
  - [ ] Validation: react-hook-form + Zod
  - [ ] Submit → gọi API → lưu token → redirect Home
- [ ] `RegisterPage.jsx`:
  - [ ] Form: Display Name + Email + Password + Confirm Password
  - [ ] Password Strength Hint (hiện mức độ mạnh/yếu)
  - [ ] Submit → gọi API → lưu token → redirect Home
  - [ ] Link "Đã có tài khoản? Đăng nhập"

### 9.2 Auth Context / State

- [ ] Tạo `src/contexts/AuthContext.jsx`:
  - [ ] State: `user`, `accessToken`, `isLoading`, `isAuthenticated`
  - [ ] Functions: `login()`, `register()`, `logout()`, `refreshToken()`
  - [ ] Lưu `accessToken` trong memory (useState), KHÔNG localStorage
  - [ ] Auto-refresh token khi app mount (gọi `/auth/refresh`)
- [ ] Wrap `App.jsx` với `<AuthProvider>`

### 9.3 Route Protection

- [ ] Tạo `ProtectedRoute.jsx` — check `isAuthenticated` → redirect `/login` nếu false
- [ ] Tạo `GuestRoute.jsx` — check `isAuthenticated` → redirect `/` nếu true (cho login/register)
- [ ] Áp `ProtectedRoute` cho: Home, Filter, Settings, Profile, TaskDetail
- [ ] Áp `GuestRoute` cho: Login, Register

### 9.4 Axios Interceptors (JWT)

- [ ] Request interceptor: gắn `Authorization: Bearer <token>` vào mọi request
- [ ] Response interceptor: nếu 401 → tự động gọi `/auth/refresh` → retry request
- [ ] Nếu refresh cũng fail → logout + redirect login

### ✅ Checkpoint 9: Auth flow end-to-end
- [ ] Mở app chưa đăng nhập → redirect Login
- [ ] Register → tạo tài khoản → vào Home
- [ ] Logout → quay về Login
- [ ] Login → vào Home → thấy tasks
- [ ] Task của user A không hiện cho user B
- [ ] Token hết hạn → tự động refresh → không bị logout

---

## PHASE 10 — PROFILE & SETTINGS (UI)

### 10.1 Profile Page

- [ ] Hero section: Avatar + Display Name + Role badge
- [ ] Stats dashboard: 3 cards (Tổng tasks, Hoàn thành, Đang làm)
- [ ] Info section: Email, Ngày tạo, Provider list
- [ ] Nút "Chỉnh sửa" → mở form sửa displayName
- [ ] Nút "Đăng xuất" → confirm → logout

### 10.2 Settings Page

- [ ] Section Ngôn ngữ: Radio VI / EN (lưu vào user preference — sau)
- [ ] Section Theme: Light / Dark toggle (UI only v1)
- [ ] Section Danger Zone: Nút "Xóa tài khoản" (confirm modal)

### 10.3 Backend Profile API (`viewmodels/profileViewModel.js` + `routes/profileRouters.js`)

- [x] Tạo `viewmodels/profileViewModel.js` — MVVM pattern
- [x] Tạo class `ProfileViewModelError` — custom error
- [x] Method `getProfile(userId)` — trả thông tin user (stripped sensitive fields)
- [x] Method `updateProfile(userId, payload)` — cập nhật displayName, preferredLanguage, themePreference
- [x] Method `getSessions(userId)` — danh sách refresh sessions (thiết bị đang đăng nhập)
- [x] Method `deleteSession(sessionId, userId)` — xóa session cụ thể + ownership check
- [x] Tạo `routes/profileRouters.js` — thin binding layer
- [x] Route `GET /api/v1/profile` → `profileViewModel.getProfile`
- [x] Route `PUT /api/v1/profile` → `profileViewModel.updateProfile`
- [x] Route `GET /api/v1/profile/sessions` → `profileViewModel.getSessions`
- [x] Route `DELETE /api/v1/profile/sessions/:id` → `profileViewModel.deleteSession`

### ✅ Checkpoint 10: Profile & Settings hoạt động
- [ ] Vào Profile → thấy thông tin đúng
- [ ] Sửa displayName → lưu thành công
- [ ] Stats hiện đúng con số từ API

---

## PHASE 11 — OAUTH (Google + GitHub)

### 11.1 Backend OAuth

- [ ] `npm i passport passport-google-oauth20 passport-github2`
- [ ] Tạo `config/passport.js`:
  - [ ] Configure Google Strategy
  - [ ] Configure GitHub Strategy
  - [ ] Logic: tìm user theo email → auto-link nếu đã tồn tại → tạo mới nếu chưa
- [ ] Tạo routes:
  - [ ] `GET /api/v1/auth/google` → passport authenticate
  - [ ] `GET /api/v1/auth/google/callback` → callback + redirect SPA với token
  - [ ] `GET /api/v1/auth/github` → tương tự
  - [ ] `GET /api/v1/auth/github/callback`
- [ ] Thêm `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` vào `.env`

### 11.2 Frontend OAuth

- [ ] Login/Register: kích hoạt nút Google/GitHub → redirect tới `/api/v1/auth/google`
- [ ] Callback page: nhận token từ URL params → lưu vào AuthContext → redirect Home
- [ ] Toast warning nếu auto-link xảy ra

### ✅ Checkpoint 11: OAuth hoạt động
- [ ] Click "Đăng nhập Google" → redirect Google → quay lại app → đã đăng nhập
- [ ] Click "Đăng nhập GitHub" → tương tự
- [ ] Đăng nhập Google với email đã có → auto-link → toast warning

---

## PHASE 12 — ADMIN SYSTEM

### 12.1 Backend Admin ViewModel (`viewmodels/adminViewModel.js`)

- [x] Tạo `viewmodels/adminViewModel.js` — MVVM pattern
- [x] Tạo class `AdminViewModelError` — custom error
- [x] Method `getUsers(query)` — GET users + search, filter (role, status), pagination
- [x] Method `updateUser(userId, payload)` — cập nhật role, status (strip passwordHash)
- [x] Method `getModeration(query)` — users offline > 30 ngày + `daysSinceLastOnline`
- [x] Method `disableInactiveUser(userId)` — gán `status: "disabled"`, `disabledAt: new Date()`
- [x] Method `getTrash(query)` — users có `status: "disabled"`
- [x] Method `getTasksForModeration(query)` — dashboard tất cả tasks của hệ thống
- [x] Method `getAnalytics()` — totalUsers, totalTasks, taskDistribution, providerUsage
- [x] Method `deleteUserOffline(userId)` — hard delete user offline > 7 ngày
- [x] Method `getAuditLogs(query)` — nhật ký kiểm toán + pagination

### 12.2 Admin Routes (`routes/adminRouters.js`)

- [x] Tạo `routes/adminRouters.js` — thin binding layer
- [x] Middleware `requireAdmin` — check `req.user.role === "admin"` → 403 nếu không phải
- [x] Route `GET /api/v1/admin/users` → `adminViewModel.getUsers`
- [x] Route `PUT /api/v1/admin/users/:id` → `adminViewModel.updateUser`
- [x] Route `DELETE /api/v1/admin/users/:id` → `adminViewModel.deleteUserOffline`
- [x] Route `GET /api/v1/admin/moderation` → `adminViewModel.getModeration`
- [x] Route `PUT /api/v1/admin/moderation/:id/disable` → `adminViewModel.disableInactiveUser`
- [x] Route `GET /api/v1/admin/trash` → `adminViewModel.getTrash`
- [x] Route `GET /api/v1/admin/tasks` → `adminViewModel.getTasksForModeration`
- [x] Route `GET /api/v1/admin/analytics` → `adminViewModel.getAnalytics`
- [x] Route `GET /api/v1/admin/audit-logs` → `adminViewModel.getAuditLogs`

### 12.3 Audit Log Model + Logic

- [x] Tạo `models/AuditLog.js` — schema: actorId, targetId, action, entityType, entityId, summaryBefore, summaryAfter, createdAt
- [x] TTL index `{ createdAt: 1 }, { expireAfterSeconds: 2592000 }` (30 ngày tự xóa)
- [x] Compound index `{ actorId: 1, createdAt: -1 }`
- [ ] Tạo helper `utils/auditLogger.js` — hàm `logAction(actorId, action, entityType, entityId, before, after)`
- [ ] Gắn auditLogger vào: Admin thay đổi user, Admin disable user

### 12.4 User Account Lifecycle (Disable → Auto-Delete)

- [x] Admin disable user → gán `status: "disabled"`, `disabledAt: new Date()`
- [ ] Admin re-enable user → gán `status: "active"`, `disabledAt: null`
- [ ] Cron job quét `disabledAt + 7 ngày < now` → hard delete user + tasks
- [ ] Hiển thị thời gian còn lại trước auto-delete trong Admin Trash

### 12.5 Frontend Admin Pages

- [ ] Route guard: chỉ `role === "admin"` mới vào `/admin/*`
- [ ] `AdminHomePage.jsx`:
  - [ ] 2 Stat Cards (Total Users, Total Tasks)
  - [ ] Menu Grid 4 ô: Kiểm duyệt, Audit, Settings, Thùng rác
- [ ] `AdminUsersPage.jsx`:
  - [ ] Search bar + Filter Chips (All/Active/Disabled)
  - [ ] User Cards list + Pagination
  - [ ] Click user → mở Detailed User Modal
  - [ ] Actions: Ban, Disable, Chỉnh quyền
- [ ] `AdminAnalyzePage.jsx`:
  - [ ] Cài `npm i recharts`
  - [ ] Biểu đồ User Growth Trend (Line chart)
  - [ ] Task Distribution (Pie chart)
  - [ ] Provider Usage (Bar chart)
  - [ ] Custom Pop Art style cho charts (colors, borders)
- [ ] `AdminModerationPage.jsx`:
  - [ ] Danh sách users offline > 30 ngày
  - [ ] Nút "Vô hiệu hóa" → confirm → call API → toast
- [ ] `AdminAuditPage.jsx`:
  - [ ] Timeline theo ngày (Today, Yesterday, Older)
  - [ ] Event Cards: icon + action description + timestamp
- [ ] `AdminTrashPage.jsx`:
  - [ ] Danh sách users bị disabled
  - [ ] Hiển thị thời gian còn lại trước auto-delete (7 ngày kể từ `disabledAt`)
  - [ ] Nút khôi phục (re-enable)

### ✅ Checkpoint 12: Admin system hoạt động
- [ ] Login admin → thấy AdminHomePage
- [ ] Xem Users → search, filter, pagination OK
- [ ] Disable user → user đó thấy bị khóa
- [ ] Analyze → 3 chart hiển thị data đúng
- [ ] Audit Log → timeline events
- [ ] Trash → hiển thị countdown trước auto-delete

---

## PHASE 13 — REALTIME (Socket.IO)

### 13.1 Backend Socket.IO

- [ ] `npm i socket.io` (backend)
- [ ] Tạo `config/socket.js`:
  - [ ] Init Socket.IO server trên Express HTTP server
  - [ ] Namespace `/v1/realtime`
  - [ ] JWT handshake middleware — verify token khi connect
  - [ ] Join room `user:{userId}` khi connect
  - [ ] Join room `admin-channel` nếu role === admin
- [ ] Refactor `server.js` — tạo HTTP server + gắn Socket.IO
- [ ] Export `io` instance để dùng trong ViewModels

### 13.2 Emit Events từ Routes/ViewModels

- [ ] Task create → emit `task:changed` to `user:{ownerId}`
- [ ] Task update → emit `task:changed`
- [ ] Task delete → emit `task:changed`
- [ ] Task restore → emit `task:changed`
- [ ] Admin update user → emit `user:updated` to `user:{targetUserId}`
- [ ] Admin action → emit `admin:metrics-updated` to `admin-channel`

### 13.3 Frontend Socket.IO Client

- [ ] `npm i socket.io-client` (frontend)
- [ ] Tạo `src/lib/socket.js` — connect tới `/v1/realtime` với auth token
- [ ] Tạo `useSocket` hook:
  - [ ] Connect khi authenticated, disconnect khi logout
  - [ ] Listen `task:changed` → refetch tasks (Full Refetch strategy)
  - [ ] Listen `user:updated` → refetch profile
- [ ] Gắn vào Home page, Admin dashboard

### ✅ Checkpoint 13: Realtime hoạt động
- [ ] Mở 2 tabs cùng user → tạo task tab 1 → tab 2 tự cập nhật
- [ ] Admin disable user → user nhận event + bị redirect login

---

## PHASE 14 — KANBAN DRAG & DROP

### 14.1 Cài dnd-kit

- [ ] `npm i @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

### 14.2 Kanban Board View

- [ ] Tạo `KanbanBoard.jsx` — 3 cột: Todo / Doing / Done
- [ ] Mỗi cột: Droppable area (dnd-kit)
- [ ] Mỗi TaskCard: Draggable (dnd-kit)
- [ ] Kéo task từ cột này sang cột kia → update `status` + `orderIndex`
- [ ] Animation kéo-thả: shadow tăng (lift state), opacity 0.9
- [ ] Drop → gọi `taskService.updateTask(id, { status, orderIndex })`
- [ ] Toast xác nhận cập nhật

### 14.3 Toggle View

- [ ] Nút toggle trên AppBar: List View ↔ Kanban View
- [ ] Lưu preference view vào localStorage
- [ ] Home page render đúng view theo preference

### ✅ Checkpoint 14: Drag & Drop hoạt động
- [ ] Kéo task từ "Todo" sang "Doing" → status cập nhật
- [ ] Thả task ở vị trí mới → orderIndex cập nhật
- [ ] Refresh page → thứ tự giữ nguyên
- [ ] Toggle list ↔ kanban → hoạt động

---

## PHASE 15 — UX POLISH

### 15.1 Animation & Transitions

- [ ] Page transitions: fade 220ms khi chuyển route
- [ ] Modal/Drawer: enter/exit animation 220ms
- [ ] TaskCard hover: shadow rest → lift, scale 1.01
- [ ] Button press: shadow rest → press, translate 1px
- [ ] Focus ring: 2px Cyan offset cho tất cả focusable elements

### 15.2 Responsive

- [ ] Test trên viewport 390px (iPhone) — layout 4 cột
- [ ] Test trên viewport 768px (Tablet) — layout 8 cột
- [ ] Kanban board: horizontal scroll trên mobile
- [ ] Bottom Nav ẩn khi keyboard mở (mobile)

### 15.3 Loading & Empty States

- [ ] Verify tất cả list pages có 4 states (loading, empty, error, ready)
- [ ] Skeleton cards: comic style (border + shimmer)
- [ ] Empty state: illustration + message + CTA

### ✅ Checkpoint 15: UI polish hoàn thiện
- [ ] Mọi animation mượt, đúng timing
- [ ] Mobile responsive OK
- [ ] Thumbnail review mỗi page → đạt "WOW" Pop Art

---

## PHASE 16 — DEPLOYMENT

### 16.1 Deploy đơn giản (Render/Railway)

- [ ] Build frontend: `npm run build` → output folder `dist/`
- [ ] Cấu hình backend serve static: `express.static("../frontend/dist")`
- [ ] Fallback route `*` → `index.html` (SPA routing)
- [ ] Thêm `Procfile` hoặc config cho hosting platform
- [ ] Deploy lên Render free tier (hoặc Railway)
- [ ] Test app chạy trên URL public
- [ ] Setup environment variables trên hosting

### 16.2 Deploy VPS + DNS (sau)

- [ ] Mua VPS (DigitalOcean / Vultr / etc.)
- [ ] Setup Node.js + PM2 process manager
- [ ] Cấu hình Nginx reverse proxy
- [ ] Cài SSL certificate (Let's Encrypt)
- [ ] Setup domain → DNS A record trỏ về VPS
- [ ] Health check endpoint `/health`
- [ ] Setup PM2 auto-restart on crash

### ✅ Checkpoint 16: App live trên internet
- [ ] Truy cập URL → app hoạt động
- [ ] Register/Login → đầy đủ chức năng
- [ ] CRUD tasks → hoạt động realtime

---

## PHASE 17 — MANUAL TESTING FINAL

- [ ] Flow: Register → Login → Tạo task → Sửa task → Xóa task → Khôi phục
- [ ] Flow: Search → Filter → Pagination
- [ ] Flow: Kanban drag & drop
- [ ] Flow: OAuth Google → Auto-link
- [ ] Flow: OAuth GitHub → Tạo tài khoản mới
- [ ] Flow: Admin Dashboard → Users → Disable user → Audit Log
- [ ] Flow: Admin Trash → countdown auto-delete → kiểm tra purge sau 7 ngày
- [ ] Flow: Realtime — 2 tabs đồng bộ
- [ ] Flow: 404 page → Back to Home
- [ ] Mobile: Test tất cả flow trên viewport 390px
- [ ] Kiểm tra: Mọi toast hiển thị đúng
- [ ] Kiểm tra: Mọi error state hiển thị đúng
- [ ] Kiểm tra: SSL + CORS hoạt động trên production
