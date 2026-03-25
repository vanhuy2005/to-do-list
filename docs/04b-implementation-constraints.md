# 04b — Implementation Constraints

> **Phiên bản:** 1.0 · **Cập nhật lần cuối:** 2026-03-25 · **Loại:** Quy tắc code bắt buộc

Tài liệu này định nghĩa các **quy tắc code cứng** mà frontend developer phải tuân thủ khi implement UI. Đây **không phải** design guideline (xem [04a-brand-guideline.md](./04a-brand-guideline.md)) — đây là coding constraints.

---

## 1. Component Rules

### 1.1 Không tạo Component trùng lặp

> **BLOCKER:** Trước khi tạo React component mới, kiểm tra inventory trong thư mục `/components/ui/`. Nếu đã có component đa năng tương tự (Button, Modal, Card, Input...) → sử dụng lại, KHÔNG tạo mới.

### 1.2 Inventory Components bắt buộc

| Component | Mô tả | Variants |
|-----------|-------|----------|
| `Button` | Nút bấm đa năng | `primary`, `secondary`, `danger`, `ghost` |
| `Card` | Thẻ chứa nội dung | `task-card`, `user-card`, `stat-card` |
| `Modal` | Hộp thoại floating | `confirm`, `warning`, `form` |
| `Input` | Ô nhập liệu | `text`, `password`, `email`, `textarea` |
| `Drawer` | Panel trượt từ dưới | `task-detail` |
| `Toast` | Thông báo nhanh | `success`, `error`, `warning`, `info` |
| `Skeleton` | Loading placeholder | `card`, `list`, `form` |
| `Badge` | Nhãn nhỏ | `status`, `priority`, `tag` |

---

## 2. UI State Rules

### 2.1 Bốn trạng thái bắt buộc

> **BLOCKER:** Mọi component hiển thị dữ liệu dạng list hoặc form **phải** implement đủ 4 trạng thái:

| State | Mô tả | UI |
|-------|-------|-----|
| **Loading** | Đang tải dữ liệu | Skeleton comic-style: Header block + 2 body lines |
| **Empty** | Không có dữ liệu | Illustration + message + CTA button |
| **Error** | Lỗi khi tải | Error message + retry button |
| **Ready** | Dữ liệu sẵn sàng | Hiển thị nội dung bình thường |

### 2.2 Skeleton Loading

```
┌────────────────────────────┐
│ ████████████               │ ← Header block (shimmer)
│                            │
│ ██████████████████████     │ ← Body line 1
│ ████████████████           │ ← Body line 2
└────────────────────────────┘
```

- Phong cách: Comic (viền đen `3px`, bo góc `12px`)
- Animation: shimmer effect `1.5s` infinite
- Số lượng: 2-3 skeleton cards cho list view

---

## 3. Interaction Patterns

### 3.1 Tạo Task

> **BLOCKER:** Nút "Tạo Task" (FAB) → mở **Quick Add Modal**. KHÔNG redirect sang một page riêng.

### 3.2 Chi tiết Task

> **BLOCKER:** Xem chi tiết task → **Bottom Drawer** trượt từ dưới lên, chiếm `~70vh`.
>
> - Backdrop: overlay `rgba(0,0,0,0.4)`
> - Pull-to-dismiss: Vuốt xuống để đóng
> - Animation: Enter/exit `220ms` ease

### 3.3 Soft-delete UI

> **BLOCKER:** Khi user xóa task:
> 1. Hiện **Confirm Modal** trước khi xóa
> 2. Sau khi xóa → hiện **Toast** "Đã chuyển vào thùng rác"
> 3. Cung cấp **Delete Panel** (accessible từ Settings hoặc icon thùng rác) hiển thị tasks đã xóa
> 4. Mỗi task trong Delete Panel hiển thị thời gian còn lại trước khi bị purge

→ Xem chính sách: [ADR-001](./07-architectural-decisions.md#adr-001)

---

## 4. Accessibility Requirements

### 4.1 Touch Targets

> **BLOCKER:** Mọi nút bấm hoặc vùng tương tác phải có kích thước tối thiểu **44×44px**.
>
> Nếu visual size nhỏ hơn (ví dụ icon 24px), phải mở rộng padding/hit area.

### 4.2 Focus Management

| Quy tắc | Chi tiết |
|---------|----------|
| **Focus ring** | `2px solid #00C2FF` với `2px offset` |
| **Tab order** | Logic từ trên xuống, trái sang phải |
| **Focus trap** | Modal và drawer phải trap focus bên trong |
| **Skip to content** | Không bắt buộc cho v1 |

### 4.3 Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Di chuyển focus đến element tiếp theo |
| `Shift + Tab` | Di chuyển ngược |
| `Enter` / `Space` | Kích hoạt button, link, toggle |
| `Escape` | Đóng modal, drawer, dropdown |
| `Arrow keys` | Navigate trong dropdown, radio group |

---

## 5. Design Token Usage

> **BLOCKER:** Tuyệt đối KHÔNG hard-code giá trị màu, font size, spacing, hoặc shadow trực tiếp trong code.

**Đúng:**
```css
.card {
  border: 3px solid var(--color-outline);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-rest);
  padding: var(--space-4);
}
```

**Sai:**
```css
.card {
  border: 3px solid #111111;
  border-radius: 12px;
  box-shadow: 3px 3px 0 #111111;
  padding: 16px;
}
```

---

## 6. Performance Rules

| Quy tắc | Chi tiết |
|---------|----------|
| **Image lazy loading** | Sử dụng `loading="lazy"` cho tất cả images ngoài viewport |
| **Code splitting** | Mỗi route = 1 chunk (Vite dynamic import) |
| **List virtualization** | Danh sách > 50 items → sử dụng virtual scrolling |
| **Debounce search** | Input search debounce `300ms` trước khi gọi API |
| **Memoization** | Sử dụng `React.memo` cho cards trong list |

---

> **Tham chiếu:**
> - Design tokens chi tiết → [04a-brand-guideline.md](./04a-brand-guideline.md)
> - Schema dữ liệu → [02-thiet-ke-csdl.md](./02-thiet-ke-csdl.md)
> - API endpoints → [03-thiet-ke-api.md](./03-thiet-ke-api.md)
