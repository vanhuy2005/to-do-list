# Ứng dụng To-Do Web

> **Pop Art Kanban Task Manager** — Quản lý công việc dạng bảng Kanban với phong cách Pop Art năng động.

## Ứng dụng này là gì?

To-Do Web là ứng dụng quản lý công việc mã nguồn mở, hỗ trợ trực quan hóa quy trình làm việc dưới dạng bảng Kanban và List. Thiết kế lấy cảm hứng từ phong cách **Pop Art** — viền đen nét, bóng đổ lệch, màu sắc tương phản cao — mang lại trải nghiệm tương tác cao với cập nhật dữ liệu thời gian thực (Realtime).

**📚 Documentation đầy đủ:** [docs/00-tong-quan.md](./docs/00-tong-quan.md)

---

## Tech Stack

| Tầng | Công nghệ |
|------|-----------|
| **Frontend** | React + Vite + TailwindCSS |
| **Backend** | Node.js + Express.js |
| **Database** | MongoDB + Mongoose |
| **Realtime** | Socket.IO |
| **Auth** | Passport.js (Google/GitHub OAuth) + JWT |
| **i18n** | Đa ngôn ngữ (VI/EN) |

---

## Feature Dev Checklist

### 🔐 Authentication
- [ ] Đăng ký tài khoản cục bộ (email + password)
- [ ] Đăng nhập cục bộ (JWT access + httpOnly refresh cookie)
- [ ] Refresh token rotation
- [ ] Logout (revoke session + xóa cookie)
- [ ] OAuth Google (Passport.js)
- [ ] OAuth GitHub (Passport.js)
- [ ] Auto-link account cùng email khi OAuth + toast warning
- [ ] Forgot Password flow
- [ ] Account Existed Fallback (xử lý trùng OAuth)

### 📝 Task Management (User)
- [ ] CRUD Task (tạo, xem, sửa, xóa mềm)
- [ ] Bảng Kanban 3 cột: Todo / Doing / Done
- [ ] Kéo-thả (drag & drop) thay đổi status + orderIndex
- [ ] Gắn Tags, Priority (Low/Medium/High), Due Date
- [ ] Tính toán Overdue (frontend: `dueDate < now && status ≠ done`)
- [ ] explicitOverdue — user tự đánh dấu quá hạn
- [ ] Tìm kiếm Task (text search)
- [ ] Bộ lọc nâng cao: Status, Priority, Tags, Due Date range, Sort
- [ ] Phân trang danh sách Task
- [ ] Soft-delete + khôi phục trong 7 ngày (Delete Panel)

### 🛡️ Admin System
- [ ] Admin Dashboard — Stat Cards tổng quan
- [ ] Menu Grid: Moderation, Audit, Settings, Trash
- [ ] Trang Kiểm duyệt (Moderation) — Vô hiệu hóa user offline > 30 ngày
- [ ] Trang Audit Log — Timeline xem log hệ thống
- [ ] Trang Thùng rác (Trash) — Tài khoản bị ban/xóa
- [ ] Trang Analyze — Biểu đồ User Growth Trend, Task Distribution, Provider Usage
- [ ] Quản lý Users — List, Search, Filter (Role/Status/Date), Pagination
- [ ] Chi tiết User — Profile info, Email, Work stats
- [ ] Thêm User mới (Admin tạo tay)
- [ ] Ban/Disable/Chỉnh quyền User
- [ ] Filter User Modal (Role, Status, Date range)

### ⚡ Realtime (Socket.IO)
- [ ] JWT handshake khi thiết lập kết nối
- [ ] Namespace `/v1/realtime`, Room theo `userId`
- [ ] Admin tự động vào `admin-channel`
- [ ] Event `task:changed` — broadcast khi CRUD task
- [ ] Event `user:updated` — broadcast khi Admin tác động user
- [ ] Event `admin:metrics-updated` — cập nhật dashboard
- [ ] Client Full Refetch strategy khi nhận event

### 👤 Profile & Settings
- [ ] Xem/sửa Profile (displayName, preferredLanguage, themePreference)
- [ ] Xem danh sách Sessions (thiết bị đang login)
- [ ] Đăng xuất thiết bị cụ thể
- [ ] Đổi Theme (Light/Dark)
- [ ] Đổi ngôn ngữ (VI/EN) — i18n
- [ ] Sync & Data section
- [ ] Danger Zone — Xóa tài khoản

### 🎨 UI/UX
- [ ] Pop Art / Comic style design
- [ ] Mobile-first responsive (390px → 768px)
- [ ] Skeleton loading (comic style)
- [ ] 4 state cho mọi list: loading, empty, error, ready
- [ ] Toast notifications
- [ ] 404 Page (Pop Art style)
- [ ] Confirm Modal (comic panel)
- [ ] Warning Modal (halftone header)

---

## ⚠️ Lưu Ý Quan Trọng Khi Dev

### Quy tắc bắt buộc (Blockers)
- [ ] Tuyệt đối KHÔNG xóa dữ liệu vật lý — mọi delete đều là soft-delete (`deletedAt`)
- [ ] DB lưu 100% UTC — frontend chịu trách nhiệm convert timezone
- [ ] Token Hash bằng argon2 — KHÔNG bao giờ lưu raw refresh token
- [ ] Touch target tối thiểu 44x44px
- [ ] Mọi animation/transition: 150-220ms, `cubic-bezier(0.2, 0.8, 0.2, 1)`
- [ ] Focus ring: 2px Cyan (`#00C2FF`) offset
- [ ] KHÔNG dùng mã màu ngoài Design Tokens đã định nghĩa

### Quy tắc kiến trúc
- [ ] Socket.IO event → Client luôn Full Refetch (KHÔNG patch state cục bộ)
- [ ] OAuth auto-link: cùng email → liên kết tự động + hiển thị toast warning
- [ ] Nút "Tạo Task" → mở Quick Add Modal (KHÔNG redirect sang page riêng)
- [ ] Task Detail → Bottom Drawer chiếm ~70vh
- [ ] KHÔNG tạo React component mới nếu inventory đã có component tương tự
- [ ] Cron job quét `restoreUntil` > 7 ngày → purge (xóa vĩnh viễn)
- [ ] Audit Logs TTL: 30 ngày tự xóa

### Quy tắc UI
- [ ] Viền tĩnh: `3px solid #111111`
- [ ] Bo thẻ: `12px` / Bo nút: `9999px` (pill)
- [ ] Shadow Rest: `3px 3px 0 #111` / Press: `1px 1px 0 #111` / Lift: `4px 4px 0 #111`
- [ ] Grid Mobile: 4 cột, gutter 16px / Tablet: 8 cột, gutter 24px
- [ ] List/Form loading luôn hiện Skeleton comic (Header + 2 dòng Body)

---

## Bắt đầu nhanh

### Yêu cầu hệ thống
- Node.js ≥ 18.x
- MongoDB đang hoạt động (Local hoặc Atlas)

### Các bước thực hiện

```bash
# 1. Clone mã nguồn
git clone https://github.com/vanhuy2005/to-do-list.git
cd to-do-list

# 2. Cài đặt dependencies
npm install

# 3. Thiết lập biến môi trường
cp .env.example .env
# Điền: MongoDB URI, JWT Secret, OAuth client info

# 4. Khởi chạy dự án
npm run dev
```

---

## 📚 Documentation

| # | Tài liệu | Nội dung |
|---|----------|----------|
| 00 | [Tổng Quan](docs/00-tong-quan.md) | Overview, Tech Stack, Glossary |
| 01 | [Yêu Cầu Phần Mềm](docs/01-yeu-cau-phan-mem.md) | Use-case, User Stories, danh sách màn hình |
| 02 | [Thiết Kế CSDL](docs/02-thiet-ke-csdl.md) | ERD Diagram, Schema, Indexing |
| 03 | [Thiết Kế API](docs/03-thiet-ke-api.md) | Swagger-style REST + Socket.IO |
| 04a | [Brand Guideline](docs/04a-brand-guideline.md) | Typography, Color, Spacing, Layout |
| 04b | [Implementation Constraints](docs/04b-implementation-constraints.md) | Quy tắc code UI |
| 05 | [Kiến Trúc Hệ Thống](docs/05-kien-truc-he-thong.md) | Component + Sequence Diagrams |
| 06 | [Kế Hoạch Triển Khai](docs/06-ke-hoach-trien-khai.md) | Roadmap + Deployment |
| 07 | [Quyết Định Kiến Trúc](docs/07-architectural-decisions.md) | 5 ADR Records |

---

## Cách đóng góp

1. **Fork** repository này
2. Tạo branch mới: `git checkout -b feature/tinh-nang-moi`
3. Commit: `git commit -m 'Thêm tính năng mới'`
4. Push: `git push origin feature/tinh-nang-moi`
5. Tạo **Pull Request**

## Tác giả

Được phát triển và thiết kế bởi **vanhuy2005**.
