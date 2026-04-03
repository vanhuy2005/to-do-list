# 07 — Quyết Định Kiến Trúc (ADR Registry)

> **Phiên bản:** 1.1 · **Cập nhật lần cuối:** 2026-04-03

Tài liệu này ghi nhận các quyết định kỹ thuật quan trọng của dự án theo format **Architecture Decision Record (ADR)**. Mỗi quyết định bao gồm bối cảnh, lựa chọn, và hệ quả.

---

## Mục Lục

| ADR | Tiêu đề | Trạng thái |
|-----|---------|------------|
| [ADR-001](#adr-001) | Soft-delete Policy | ✅ Accepted |
| [ADR-002](#adr-002) | Full Refetch Strategy | ✅ Accepted |
| [ADR-003](#adr-003) | OAuth Auto-link | ✅ Accepted |
| [ADR-004](#adr-004) | Single-tenant v1 | ✅ Accepted |
| [ADR-005](#adr-005) | UTC Storage | ✅ Accepted |
| [ADR-006](#adr-006) | MVVM Architecture Pattern | ✅ Accepted |

---

## ADR-001

### Soft-delete Policy

| Thông tin | Giá trị |
|-----------|---------|
| **Ngày** | 2026-01-20 |
| **Trạng thái** | ✅ Accepted |
| **Áp dụng** | Toàn bộ hệ thống (tasks, users) |

**Bối cảnh:**
Người dùng có thể lỡ tay xóa task quan trọng. Xóa vật lý (hard delete) khiến dữ liệu mất vĩnh viễn, không thể khôi phục. Cần cơ chế "undo" an toàn.

**Quyết định:**
- Tuyệt đối **KHÔNG xóa dữ liệu vật lý** trong lệnh delete.
- Mọi thao tác xóa chỉ gán trường `deletedAt` = timestamp hiện tại.
- Gán `restoreUntil` = `deletedAt + 7 ngày`.
- User có thể khôi phục qua API `POST /tasks/:id/restore` (hoặc Delete Panel trên UI).
- **Cron job** chạy định kỳ, quét `restoreUntil < now` → xóa vĩnh viễn (purge).

**Hệ quả:**
- ✅ User có 7 ngày để khôi phục data bị xóa nhầm.
- ✅ Audit trail đầy đủ — dữ liệu không mất bất ngờ.
- ⚠️ Cần cron job để dọn rác — nếu không chạy, data tích lũy vô hạn.
- ⚠️ Mọi query phải thêm điều kiện `{ deletedAt: null }` để loại trừ data đã xóa.

**Tham chiếu:**
- Schema: [02-thiet-ke-csdl.md](./02-thiet-ke-csdl.md) (trường `deletedAt`, `restoreUntil`)
- API: [03-thiet-ke-api.md](./03-thiet-ke-api.md#35-xóa-mềm-task) (DELETE endpoint, restore endpoint)
- UI: [04b-implementation-constraints.md](./04b-implementation-constraints.md#33-soft-delete-ui) (Delete Panel)

---

## ADR-002

### Full Refetch Strategy

| Thông tin | Giá trị |
|-----------|---------|
| **Ngày** | 2026-01-20 |
| **Trạng thái** | ✅ Accepted |
| **Áp dụng** | Client-side sync khi nhận Socket.IO event |

**Bối cảnh:**
Khi nhiều thiết bị cùng thao tác, server phát Socket.IO event để đồng bộ UI. Có 2 chiến lược:
1. **Patch state:** Server gửi delta (chỉ phần thay đổi), client cập nhật local state.
2. **Full refetch:** Server gửi tín hiệu event, client fetch lại toàn bộ dữ liệu.

**Quyết định:**
Chọn **Full Refetch** — khi client nhận event (ví dụ `task:changed`), client gọi `GET /tasks` để lấy lại toàn bộ danh sách thay vì patch array trong React state.

**Lý do:**
- Patch state phức tạp: phải xử lý đúng thứ tự event, conflict resolution, partial updates.
- Full refetch đơn giản, đảm bảo UI luôn đồng nhất với server.
- Với quy mô nhỏ (cá nhân/nhóm nhỏ), cost của full refetch chấp nhận được.

**Hệ quả:**
- ✅ Code đơn giản, dễ debug, không lo race condition trên client.
- ✅ UI luôn phản ánh chính xác trạng thái DB.
- ⚠️ Tăng số request API — mỗi event = 1 GET request.
- ⚠️ Không scale tốt cho dataset lớn (> 1000 tasks/user). Cần xem xét lại nếu scale.

**Tham chiếu:**
- Flow: [05-kien-truc-he-thong.md](./05-kien-truc-he-thong.md#23-task-crud--realtime-sync) (Sequence Diagram)
- API: [03-thiet-ke-api.md](./03-thiet-ke-api.md#54-chiến-lược-đồng-bộ-client)

---

## ADR-003

### OAuth Auto-link

| Thông tin | Giá trị |
|-----------|---------|
| **Ngày** | 2026-01-22 |
| **Trạng thái** | ✅ Accepted |
| **Áp dụng** | OAuth login flow (Google, GitHub) |

**Bối cảnh:**
Khi user đăng nhập qua OAuth (Google/GitHub), có thể email đã tồn tại trong hệ thống (đã đăng ký bằng tài khoản cục bộ hoặc OAuth khác). Cần quyết định xử lý thế nào.

**Quyết định:**
- Nếu email từ OAuth provider **đã tồn tại** trong DB → **tự động liên kết** (push provider vào mảng `providers[]`).
- Đồng thời hiển thị **toast warning** cho user: "Tài khoản của bạn đã được liên kết với [Provider]."
- User vẫn đăng nhập thành công, không cần xác nhận thêm.

**Lý do:**
- UX mượt — user không bị block bởi flow xác nhận phức tạp.
- Email là unique identifier đáng tin cậy (Google/GitHub đã verify email).
- Toast warning đảm bảo user biết tài khoản đã liên kết.

**Hệ quả:**
- ✅ UX liền mạch — đăng nhập OAuth luôn thành công.
- ✅ Không tạo duplicate accounts.
- ⚠️ Rủi ro bảo mật nhỏ: nếu attacker compromise email, có thể link vào account. Mitigation: OAuth providers đã verify email.
- ⚠️ Cần UI fallback nếu user muốn **tách liên kết** provider (v2 feature).

**Tham chiếu:**
- Flow: [05-kien-truc-he-thong.md](./05-kien-truc-he-thong.md#22-oauth-flow) (Sequence Diagram)
- UI: [01-yeu-cau-phan-mem.md](./01-yeu-cau-phan-mem.md) (Screen: Account Existed Fallback)

---

## ADR-004

### Single-tenant v1

| Thông tin | Giá trị |
|-----------|---------|
| **Ngày** | 2026-01-20 |
| **Trạng thái** | ✅ Accepted |
| **Áp dụng** | Database schema design |

**Bối cảnh:**
Dự án ban đầu phục vụ một nhóm người dùng. Có thể mở rộng sang mô hình SaaS (nhiều tổ chức dùng chung hệ thống) trong tương lai.

**Quyết định:**
- v1 thiết kế **Single-tenant** — tất cả users chia sẻ chung 1 database.
- Schema giữ **clean và independent** — không có dependency ẩn giữa các collections.
- Data isolation dựa trên `ownerId` (mỗi user chỉ thấy task của mình).

**Hệ quả:**
- ✅ Đơn giản, phát triển nhanh cho v1.
- ✅ Schema sẵn sàng thêm trường `tenantId` nếu cần multi-tenant.
- ⚠️ Không có data isolation cấp database — nếu có bug query, user A có thể thấy data user B.

---

## ADR-005

### UTC Storage

| Thông tin | Giá trị |
|-----------|---------|
| **Ngày** | 2026-01-20 |
| **Trạng thái** | ✅ Accepted |
| **Áp dụng** | Toàn bộ database |

**Bối cảnh:**
Users có thể ở nhiều timezone khác nhau. Cần quy ước thống nhất cách lưu thời gian.

**Quyết định:**
- Database lưu **100% UTC** cho tất cả trường Date.
- **Frontend** chịu trách nhiệm convert UTC → timezone thiết bị khi hiển thị.
- **Backend** thao tác và so sánh trên UTC.

**Hệ quả:**
- ✅ Nhất quán — không bao giờ có ambiguous timezone trong DB.
- ✅ Dễ so sánh thời gian giữa các records.
- ⚠️ Frontend phải luôn nhớ convert — nếu quên, user thấy giờ UTC.

**Tham chiếu:**
- Schema: [02-thiet-ke-csdl.md](./02-thiet-ke-csdl.md#4-quy-tắc-dữ-liệu)

---

> **Tham chiếu:**
> - Thuật ngữ → [00-tong-quan.md](./00-tong-quan.md#4-bảng-thuật-ngữ-glossary)
> - Kiến trúc → [05-kien-truc-he-thong.md](./05-kien-truc-he-thong.md)

---

## ADR-006

### MVVM Architecture Pattern

| Thông tin | Giá trị |
|-----------|---------|
| **Ngày** | 2026-04-03 |
| **Trạng thái** | ✅ Accepted |
| **Áp dụng** | Backend architecture (Node.js + Express.js) |

**Bối cảnh:**
Ban đầu, backend được thiết kế theo pattern MVC (Model-View-Controller) truyền thống, với Controller chứa business logic và Routes nhận request. Tuy nhiên, khi logic phức tạp hơn (validation, data transformation, error handling riêng biệt cho từng domain), Controller trở nên phình to và khó test.

**Quyết định:**
Chuyển từ MVC sang **MVVM (Model-View-ViewModel)**:
- **Model** (`models/`): Mongoose schemas — chỉ define data structure, validation mongoose-level, và indexes.
- **ViewModel** (`viewmodels/`): Chứa toàn bộ business logic, input validation, data transformation, và format response object. Mỗi ViewModel method return `{ statusCode, success, data, message }`.
- **View** (`routes/`): Thin binding layer — chỉ nhận request, gọi ViewModel method, và gửi response. KHÔNG chứa business logic.

**Error Handling Pattern:**
- Mỗi ViewModel có custom Error class riêng (`ViewModelError`, `AuthViewModelError`, `ProfileViewModelError`, `AdminViewModelError`).
- Routes layer sử dụng `errorHandler` wrapper function bắt ViewModel Errors → format error response chuẩn `{ success: false, error: { code, message } }`.

**Cấu trúc thư mục:**
```
backend/src/
├── models/          ← Model (Mongoose schemas)
├── viewmodels/      ← ViewModel (business logic)
├── routes/          ← View (thin binding)
├── middleware/      ← Cross-cutting concerns (auth, query validation)
├── config/          ← Database config
└── server.js        ← Entry point
```

**Hệ quả:**
- ✅ Tách biệt rõ ràng giữa data layer (Model), business logic (ViewModel), và HTTP layer (View/Routes).
- ✅ ViewModel có thể test độc lập (unit test) mà không cần HTTP context.
- ✅ Error handling nhất quán và tập trung.
- ✅ Routes layer mỏng, dễ đọc và bảo trì.
- ⚠️ Cần quy ước rõ ràng giữa những gì thuộc ViewModel vs Middleware.

**Tham chiếu:**
- Component Diagram: [05-kien-truc-he-thong.md](./05-kien-truc-he-thong.md#1-component-diagram)
- Glossary: [00-tong-quan.md](./00-tong-quan.md#4-bảng-thuật-ngữ-glossary)
