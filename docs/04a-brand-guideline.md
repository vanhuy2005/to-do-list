# 04a — Brand Guideline

> **Phiên bản:** 1.0 · **Cập nhật lần cuối:** 2026-03-25 · **Phong cách:** Pop Art / Comic Offset

---

## 1. Brand Identity

### 1.1 Positioning

**To-Do Web** là ứng dụng quản lý công việc mang phong cách **Pop Art** — năng lượng cao, lạc quan, và tốc độ. Lấy cảm hứng từ truyện tranh Mỹ (American Comics) với viền đen đậm, bóng đổ lệch, và bảng màu tương phản mạnh.

### 1.2 Personality

| Đặc tính | Biểu hiện |
|----------|-----------|
| **Năng động** | Màu sắc sống động, animation nhanh, layout không đối xứng có chủ đích |
| **Trực diện** | Ngôn ngữ ngắn gọn, hành động rõ ràng, không mơ hồ |
| **Vui nhộn** | Comic offset shadows, halftone patterns, explosion bubbles |
| **Đáng tin cậy** | Cấu trúc nhất quán, trạng thái UI rõ ràng, feedback tức thì |

### 1.3 Voice & Tone

| Nguyên tắc | Ví dụ đúng | Ví dụ sai |
|------------|-----------|-----------|
| **Ngắn gọn, hành động** | "Tạo", "Lưu", "Xóa" | "Bấm vào đây để tạo mới" |
| **Trực tiếp** | "Thành Công!" | "Hành động của bạn đã được thực hiện thành công" |
| **Thân thiện** | "Không tìm thấy task nào." | "Lỗi: Truy vấn trả về 0 kết quả." |
| **Ngôn ngữ chính** | Tiếng Việt | — |

---

## 2. Typography

### 2.1 Font Families

| Vai trò | Font | Fallback | Sử dụng |
|---------|------|----------|---------|
| **Display / Logo** | Segoe UI Italic | system-ui | Tiêu đề lớn (H1), logo, splash screen. Tạo cảm giác tốc độ. |
| **Heading** | Bangers | Impact, sans-serif | H1, H2 trong content. Phong cách comic đậm. |
| **Body** | Plus Jakarta Sans | Inter, system-ui | Văn bản nội dung, form labels, descriptions. Dễ đọc. |
| **Monospace** | JetBrains Mono | Consolas, monospace | Code snippets, technical values |

### 2.2 Type Scale

| Level | Font | Size (Mobile) | Size (Tablet) | Line Height | Weight | Sử dụng |
|-------|------|--------------|---------------|-------------|--------|---------|
| **H1** | Bangers | 32px | 40px | 1.1 | 400 | Tiêu đề trang, splash screen |
| **H2** | Bangers | 24px | 28px | 1.2 | 400 | Tiêu đề section, modal header |
| **H3** | Plus Jakarta Sans | 18px | 20px | 1.3 | 700 | Tiêu đề card, sub-section |
| **Body** | Plus Jakarta Sans | 16px | 16px | 1.5 (24px) | 400 | Văn bản chính |
| **Body Small** | Plus Jakarta Sans | 14px | 14px | 1.43 (20px) | 400 | Metadata, timestamps |
| **Caption** | Plus Jakarta Sans | 12px | 12px | 1.33 (16px) | 500 | Labels, badges, hints |

### 2.3 Quy tắc Typography

- **Letter spacing:** H1, H2 sử dụng `0.02em`. Body sử dụng `normal`.
- **Text transform:** Heading không sử dụng `uppercase` (để giữ readability tiếng Việt).
- **Truncation:** Tiêu đề dài hơn 2 dòng → truncate với `...`. Mô tả dài hơn 3 dòng → collapse/expand.
- **Alignment:** Left-aligned mặc định. Center chỉ dùng cho splash screen và empty states.

---

## 3. Color System

### 3.1 Brand Colors

| Token | Hex | Swatch | Vai trò |
|-------|-----|--------|---------|
| `--color-primary` | `#FF2D55` | 🟥 Pink | Nút hành động chính (CTA), active states |
| `--color-secondary` | `#00C2FF` | 🟦 Cyan | Hành động phụ, focus rings, links |
| `--color-highlight` | `#FFD60A` | 🟨 Vàng | Cảnh báo, nhãn nổi bật, badges |
| `--color-outline` | `#111111` | ⬛ Đen | Viền comic, text chính, shadows |
| `--color-bg-base` | `#FFFDF7` | ⬜ Kem | Nền chính toàn ứng dụng |

### 3.2 Semantic Colors

| Token | Hex | Sử dụng |
|-------|-----|---------|
| `--color-success` | `#34C759` | Toast thành công, checkmarks |
| `--color-error` | `#FF3B30` | Lỗi, validation errors |
| `--color-warning` | `#FF9500` | Cảnh báo, overdue indicators |
| `--color-info` | `#5AC8FA` | Thông tin, tooltips |

### 3.3 Neutral Palette

| Token | Hex | Sử dụng |
|-------|-----|---------|
| `--color-gray-100` | `#F5F5F5` | Background phụ, disabled bg |
| `--color-gray-200` | `#E0E0E0` | Dividers, borders phụ |
| `--color-gray-400` | `#9E9E9E` | Placeholder text |
| `--color-gray-600` | `#616161` | Secondary text |
| `--color-gray-800` | `#212121` | Primary text (thay thế cho pure black) |

### 3.4 Contrast Ratio

| Tổ hợp | Ratio | WCAG |
|--------|-------|------|
| `#111111` trên `#FFFDF7` | 18.5:1 | ✅ AAA |
| `#FF2D55` trên `#FFFDF7` | 4.6:1 | ✅ AA |
| `#00C2FF` trên `#111111` | 8.2:1 | ✅ AAA |
| `#FFD60A` trên `#111111` | 12.1:1 | ✅ AAA |

> **Quy tắc:** KHÔNG sử dụng bất kỳ mã màu nào ngoài các token đã định nghĩa ở trên.

---

## 4. Iconography

### 4.1 Style Guide

| Thuộc tính | Giá trị |
|------------|---------|
| **Phong cách** | Outline icons, nét tròn (rounded caps & joins) |
| **Stroke width** | 2px (consistent across all icons) |
| **Size grid** | 24×24px (standard), 20×20px (compact), 32×32px (large) |
| **Color** | Kế thừa `currentColor` — tự đổi theo context |
| **Touch area** | Luôn bọc trong container ≥ 44×44px |

### 4.2 Icon Categories

| Category | Ví dụ | Sử dụng |
|----------|-------|---------|
| **Navigation** | Home, Filter, Profile, Settings | Bottom Navigation Bar, App Bar |
| **Action** | Add, Edit, Delete, Restore, Search | Buttons, FAB, context menus |
| **Status** | Check, Clock, Warning, Info | Task badges, notifications |
| **Social** | Google, GitHub | OAuth buttons |

---

## 5. Spacing System

### 5.1 Base Unit

**Base unit: 4px.** Mọi giá trị spacing đều là bội số của 4.

### 5.2 Spacing Scale

| Token | Giá trị | Sử dụng |
|-------|---------|---------|
| `--space-1` | 4px | Padding nhỏ nhất (giữa icon và text trong badge) |
| `--space-2` | 8px | Gaps giữa inline elements, icon margins |
| `--space-3` | 12px | Padding internal cards |
| `--space-4` | 16px | Padding standard, gutter mobile |
| `--space-5` | 20px | Gap giữa form fields |
| `--space-6` | 24px | Gutter tablet, section spacing nhỏ |
| `--space-8` | 32px | Section spacing trung bình |
| `--space-10` | 40px | Section spacing lớn |
| `--space-12` | 48px | Page top/bottom padding |
| `--space-16` | 64px | Spacing giữa major sections |

### 5.3 Quy tắc Spacing

- **Padding nội bộ card:** `16px` (mobile), `20px` (tablet)
- **Margin giữa cards:** `12px`
- **Form field gap:** `20px`
- **Section gap:** `32px` (mobile), `40px` (tablet)

---

## 6. Layout

### 6.1 Grid System

| Breakpoint | Width | Columns | Gutter | Margin |
|------------|-------|---------|--------|--------|
| **Mobile** | 390px | 4 | 16px | 16px |
| **Tablet** | 768px | 8 | 24px | 24px |

### 6.2 Page Structure

```
┌─────────────────────────┐
│      App Bar (Header)   │ ← Fixed top, 56px height
├─────────────────────────┤
│                         │
│     Main Content        │ ← Scrollable, padding 16px
│     (Page Body)         │
│                         │
├─────────────────────────┤
│   Bottom Navigation     │ ← Fixed bottom, 64px height
└─────────────────────────┘
```

### 6.3 Component Layout Patterns

| Pattern | Mô tả | Sử dụng |
|---------|-------|---------|
| **Card Stack** | Cards xếp chồng dọc, gap 12px | Task list, user list |
| **Grid 2×2** | 2 cột, gap 12px | Admin menu grid, stat cards |
| **Form Stack** | Fields xếp dọc, gap 20px | Add Task, Register, Login |
| **Drawer** | Bottom sheet trượt lên, ~70vh | Task Detail |

### 6.4 Responsive Behavior

- **Mobile → Tablet:** 4-col → 8-col. Cards có thể hiển thị side-by-side.
- **Content max-width:** 768px (center aligned khi viewport > 768px).
- **No horizontal scroll:** Content luôn fit trong viewport width.

---

## 7. Emphasis & Visual Hierarchy

### 7.1 Border System (Comic Offset)

| Thuộc tính | Giá trị | Sử dụng |
|------------|---------|---------|
| **Viền tĩnh** | `3px solid #111111` | Tất cả cards, inputs, buttons |
| **Bo góc card** | `12px` | Cards, modals, drawers |
| **Bo góc button** | `9999px` (pill) | Tất cả buttons |
| **Bo góc input** | `8px` | Text inputs, textareas |

### 7.2 Shadow System

| State | CSS Value | Sử dụng |
|-------|-----------|---------|
| **Rest** | `3px 3px 0 #111111` | Trạng thái mặc định |
| **Hover** | `4px 4px 0 #111111` | Rê chuột lên element |
| **Press / Active** | `1px 1px 0 #111111` | Nhấn xuống element |
| **Lift / Drag** | `4px 4px 0 #111111` | Kéo-thả Kanban card |
| **None** | `none` | Disabled state |

### 7.3 Visual Weight Hierarchy

```
[Cao]  ─── Primary CTA (Pink bg + black border + shadow)
  │    ─── Secondary Action (Cyan bg + black border + shadow)
  │    ─── Cards (White bg + black border + shadow)
  │    ─── Input fields (White bg + black border, no shadow)
  │    ─── Dividers (Gray line)
[Thấp] ─── Background (Cream #FFFDF7)
```

---

## 8. Motion & Animation

### 8.1 Timing

| Loại | Duration | Sử dụng |
|------|----------|---------|
| **Micro** | 150ms | Button press, toggle, checkbox |
| **Standard** | 220ms | Card transitions, drawer open/close, page transitions |
| **Complex** | 300ms | Modal overlay fade, search expand |

### 8.2 Easing

| Easing | CSS Value | Sử dụng |
|--------|-----------|---------|
| **Standard** | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Mặc định cho mọi animation |
| **Enter** | `cubic-bezier(0, 0, 0.2, 1)` | Elements xuất hiện (drawer mở, modal mở) |
| **Exit** | `cubic-bezier(0.4, 0, 1, 1)` | Elements biến mất (drawer đóng, toast dismiss) |

### 8.3 Interactive States

| State | Visual Change | Duration |
|-------|--------------|----------|
| **Hover** | Shadow tăng (rest → lift), nhẹ scale `1.01` | 150ms |
| **Active / Press** | Shadow giảm (rest → press), translate `1px 1px` | 100ms |
| **Focus** | Focus ring 2px `#00C2FF` offset | Instant |
| **Disabled** | Opacity `0.5`, shadow `none`, cursor `not-allowed` | — |
| **Drag** | Shadow tăng (lift), opacity `0.9`, scale `1.03` | 220ms |

---

> **Tham chiếu:**
> - Quy tắc code áp dụng design này → [04b-implementation-constraints.md](./04b-implementation-constraints.md)
> - Danh sách màn hình và components → [01-yeu-cau-phan-mem.md](./01-yeu-cau-phan-mem.md)
