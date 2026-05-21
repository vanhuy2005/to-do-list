# Overdue Task Email Notification — UX Flow

## 1. Notification Preferences UI

### Location in App

Settings page → New section: **"Thông báo"** (Notifications)

Position: after the existing Language/Theme section, before the Account section.

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  ⚙️  CÀI ĐẶT                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  🎨 Giao diện                                           │
│  ┌───────────────────────────────────┐                  │
│  │ Chế độ tối       [Toggle: OFF]    │                  │
│  │ Ngôn ngữ         [Radio: VI/EN]   │                  │
│  └───────────────────────────────────┘                  │
│                                                          │
│  🔔 Thông báo                          ← NEW SECTION   │
│  ┌───────────────────────────────────┐                  │
│  │                                    │                  │
│  │ Email khi công việc quá hạn       │                  │
│  │ Nhận email khi có công việc       │                  │
│  │ vượt quá hạn chót                 │                  │
│  │                     [Toggle: ON]   │                  │
│  │                                    │                  │
│  │ ─────────────────────────────     │                  │
│  │                                    │                  │
│  │ Tóm tắt hàng ngày                │                  │
│  │ Nhận email tổng hợp các công      │                  │
│  │ việc quá hạn mỗi ngày            │                  │
│  │                     [Toggle: ON]   │                  │
│  │                                    │                  │
│  │ ─────────────────────────────     │                  │
│  │                                    │                  │
│  │ Giờ gửi tóm tắt     [08:00 ▼]   │                  │
│  │                                    │                  │
│  │ Múi giờ   [Asia/Ho_Chi_Minh ▼]   │                  │
│  │                                    │                  │
│  │         [ 💾 Lưu thay đổi ]       │                  │
│  └───────────────────────────────────┘                  │
│                                                          │
│  👤 Tài khoản                                           │
│  ...                                                     │
└─────────────────────────────────────────────────────────┘
```

### Component Specifications

| Element | Component | Props | Notes |
|---|---|---|---|
| Overdue toggle | shadcn `Switch` | `checked`, `onCheckedChange` | 3px comic border styling |
| Digest toggle | shadcn `Switch` | `checked`, `onCheckedChange` | Disabled when overdue toggle is OFF |
| Digest time | shadcn `Select` | Options: 00:00 – 23:00 (hourly) | Disabled when digest toggle is OFF |
| Timezone | shadcn `Select` | Common IANA timezones | Searchable dropdown |
| Save button | shadcn `Button` | Loading state with `Loader2` | Pop Art primary style |

### Common Timezone Options

```
Asia/Ho_Chi_Minh    (UTC+7) — Việt Nam
Asia/Bangkok        (UTC+7) — Thái Lan
Asia/Singapore      (UTC+8) — Singapore
Asia/Tokyo          (UTC+9) — Nhật Bản
Asia/Seoul          (UTC+9) — Hàn Quốc
America/New_York    (UTC-5) — New York
America/Los_Angeles (UTC-8) — Los Angeles
Europe/London       (UTC+0) — London
Europe/Berlin       (UTC+1) — Berlin
Australia/Sydney    (UTC+11) — Sydney
```

---

## 2. Email Template UX

### Single Overdue Email

**Subject (vi):** `[TaskDo] Công việc quá hạn: {title (max 50 chars)}...`
**Subject (en):** `[TaskDo] Overdue task: {title (max 50 chars)}...`

**Preheader (vi):** `{title} đã quá hạn {daysOverdue} ngày. Nhấp để xem chi tiết.`
**Preheader (en):** `{title} is {daysOverdue} days overdue. Click to view details.`

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│  ████████████████████████████████████████████████████    │
│  ██                                                ██    │
│  ██     ✅ TaskDo                                  ██    │
│  ██                                                ██    │
│  ████████████████████████████████████████████████████    │
│  (Pop Art banner: yellow bg, 3px black border)           │
│                                                          │
│  Chào {displayName},                                     │
│                                                          │
│  Công việc sau đã quá hạn:                              │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │                                                    │  │
│  │  📋  {title}                                       │  │
│  │                                                    │  │
│  │  🔴 Ưu tiên: Cao          ⏰ Hạn chót: 20/05      │  │
│  │                                                    │  │
│  │  ⚠️ Quá hạn: 1 ngày                               │  │
│  │                                                    │  │
│  └───────────────────────────────────────────────────┘  │
│  (Card: white bg, 2px border, rounded corners)           │
│                                                          │
│           ┌─────────────────────────────┐               │
│           │    Xem công việc  →         │               │
│           └─────────────────────────────┘               │
│           (CTA button: #FF2D55 bg, white text,           │
│            3px border, comic shadow, 44px height)        │
│                                                          │
│  ──────────────────────────────────────────────────     │
│                                                          │
│  Bạn nhận email này vì đã bật thông báo quá hạn.       │
│  Hủy đăng ký thông báo                                  │
│                                                          │
│  © 2026 TaskDo                                           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Daily Digest Email

**Subject (vi):** `[TaskDo] Bạn có {count} công việc quá hạn`
**Subject (en):** `[TaskDo] You have {count} overdue tasks`

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│  [TaskDo Pop Art Banner]                                 │
│                                                          │
│  Chào {displayName},                                     │
│                                                          │
│  Bạn có {count} công việc quá hạn:                      │
│                                                          │
│  ┌──────────────┬──────────┬────────────┬────────────┐  │
│  │ Công việc     │ Ưu tiên  │ Hạn chót   │ Quá hạn    │  │
│  ├──────────────┼──────────┼────────────┼────────────┤  │
│  │ Báo cáo GK   │ 🔴 Cao   │ 20/05      │ 1 ngày     │  │
│  │ Review code  │ 🟡 TB    │ 19/05      │ 2 ngày     │  │
│  │ Gửi email    │ 🟢 Thấp  │ 18/05      │ 3 ngày     │  │
│  └──────────────┴──────────┴────────────┴────────────┘  │
│                                                          │
│           [ Xem tất cả → ]                              │
│           (CTA → app home page)                          │
│                                                          │
│  ──────────────────────────────────────────────────     │
│  Hủy đăng ký thông báo                                  │
│  © 2026 TaskDo                                           │
└─────────────────────────────────────────────────────────┘
```

### Priority Badge Colors (in email)

| Priority | Vietnamese | English | Color | Emoji |
|---|---|---|---|---|
| high | Cao | High | `#FF2D55` | 🔴 |
| medium | Trung bình | Medium | `#FFD400` | 🟡 |
| low | Thấp | Low | `#7de228` | 🟢 |

---

## 3. Loading States

| State | Visual | Duration |
|---|---|---|
| Settings page load | Skeleton for notification section (2 toggle skeletons + 2 select skeletons) | Until `GET /profile/notifications/preferences` returns |
| Saving preferences | Save button shows `Loader2` spinner, all controls disabled | During `PUT` request (~0.5-1s) |
| Save success | Toast: "Đã cập nhật cài đặt thông báo" (green, comic style) | 3 seconds |

---

## 4. Error States

| Error | Toast Message (vi) | Toast Type | Recovery |
|---|---|---|---|
| Failed to load preferences | "Không thể tải cài đặt thông báo" | `error` | Retry button in section |
| Failed to save | "Không thể lưu cài đặt. Vui lòng thử lại" | `error` | User retries |
| Invalid timezone | "Múi giờ không hợp lệ" | `error` | User selects valid timezone |
| Network error | "Lỗi kết nối. Vui lòng thử lại" | `error` | User retries |

---

## 5. Empty States

| Context | Message (vi) | Visual |
|---|---|---|
| No notification history | "Chưa có thông báo nào" | Empty state illustration + text |
| All notifications disabled | Both toggles OFF → subtle info text: "Bạn sẽ không nhận email thông báo" | Muted text below toggles |

---

## 6. Email Client Considerations

### Compatibility Matrix

| Client | Inline CSS | Tables | Media Queries | Dark Mode | `<style>` block |
|---|---|---|---|---|---|
| Gmail (web) | ✅ | ✅ | ❌ | ✅ | Partial |
| Gmail (mobile) | ✅ | ✅ | ❌ | ✅ | Partial |
| Outlook 365 | ✅ | ✅ (required!) | ❌ | ❌ | ❌ |
| Apple Mail | ✅ | ✅ | ✅ | ✅ | ✅ |
| Yahoo Mail | ✅ | ✅ | ❌ | ❌ | Partial |

### Implementation Rules

1. **Inline CSS only** — all styles applied via `style=""` attributes
2. **Table-based layout** — `<table>` for structure (Outlook compatibility)
3. **Fallback fonts** — `font-family: 'Plus Jakarta Sans', Arial, Helvetica, sans-serif`
4. **600px max width** — standard email content width
5. **Image alt text** — all `<img>` tags have descriptive `alt` attributes
6. **Preheader text** — hidden text after `<body>` for inbox preview
7. **Dark mode** — `@media (prefers-color-scheme: dark)` in `<style>` block (supported clients only)

### Dark Mode Support

```html
<style>
  @media (prefers-color-scheme: dark) {
    .email-body { background-color: #1a1a1a !important; }
    .email-card { background-color: #2a2a2a !important; border-color: #444 !important; }
    .email-text { color: #e0e0e0 !important; }
  }
</style>
```

---

## 7. Responsive Email

### Mobile (< 600px)

- Single column layout
- CTA button: full width, 44px height, large text
- Task card: stacked fields (title on top, priority/date below)
- Font size: 16px body (prevents iOS zoom)

### Desktop (≥ 600px)

- Centered 600px container
- Task cards: inline fields (title left, priority/date right)
- CTA button: auto-width with padding

---

## 8. Accessibility

### Email Accessibility

| Concern | Implementation |
|---|---|
| **Semantic HTML** | `<h1>` for email title, `<table>` with `role="presentation"` for layout, `<th>` for table headers |
| **Alt text** | Logo: `alt="TaskDo logo"`. Priority badges: `alt="Ưu tiên cao"` |
| **Color contrast** | WCAG AA minimum. Text on colored backgrounds meets 4.5:1 ratio |
| **Link text** | Descriptive: "Xem công việc" not "Click here" |
| **Font size** | Minimum 14px for body text |
| **Language attribute** | `<html lang="vi">` or `<html lang="en">` based on preference |

### Settings Page Accessibility

| Concern | Implementation |
|---|---|
| **Toggle labels** | Each `Switch` has a visible label + `aria-label` |
| **Keyboard navigation** | Tab order: overdue toggle → digest toggle → time picker → timezone → save button |
| **Screen reader** | Toggle state changes announced: "Email thông báo quá hạn: đã bật" |
| **Focus management** | After save, focus returns to save button with success announcement |
| **Reduced motion** | `@media (prefers-reduced-motion)` disables toggle animations |

---

## 9. Animations & Micro-interactions

| Interaction | Animation | Implementation |
|---|---|---|
| Toggle switch | Smooth slide with comic border | shadcn Switch default + custom border styling |
| Save button press | `comic-shadow-press` (shadow reduces to 1px 1px) | Existing CSS class |
| Save success | Brief pulse animation on save button | `animate-pulse` for 1 cycle |
| Toast appearance | Slide down from top with comic shadow | Sonner default + existing comic overrides |
| Section expand | Height transition when showing/hiding time picker (based on digest toggle) | `transition: max-height 200ms ease` |

---

## 10. Unsubscribe Flow

### From Email Link

```
1. User clicks "Hủy đăng ký thông báo" in email footer
2. Browser opens: {APP_URL}/unsubscribe?userId=X&token=Y
3. Frontend unsubscribe page:
   ┌─────────────────────────────────────┐
   │                                      │
   │  ✅ TaskDo                           │
   │                                      │
   │  Đã hủy đăng ký thông báo          │
   │                                      │
   │  Bạn sẽ không nhận email thông báo  │
   │  quá hạn nữa.                       │
   │                                      │
   │  Muốn bật lại? Vào Cài đặt →       │
   │                                      │
   │        [ Về trang chủ ]              │
   │                                      │
   └─────────────────────────────────────┘
4. Page calls POST /api/v1/profile/notifications/unsubscribe?userId=X&token=Y
5. Backend verifies HMAC, disables notifications
6. Page shows confirmation
```

### From Settings Page

```
1. User navigates to Settings → Thông báo
2. User toggles "Email khi công việc quá hạn" → OFF
3. User clicks "Lưu thay đổi"
4. PUT /api/v1/profile/notifications/preferences { emailOverdue: false }
5. Toast: "Đã cập nhật cài đặt thông báo"
6. Future overdue tasks will not trigger emails
```

### Re-subscribe

```
1. User navigates to Settings → Thông báo
2. User toggles "Email khi công việc quá hạn" → ON
3. Saves → PUT /profile/notifications/preferences { emailOverdue: true }
4. Backend clears unsubscribedAt
5. Future overdue tasks will trigger emails again
```

---

## 11. Component Hierarchy

```
SettingsPage
└─ NotificationSection                         ← New component
   ├─ SectionHeader                            ← "🔔 Thông báo"
   ├─ OverdueToggle                            ← Switch + label + description
   ├─ DigestToggle                             ← Switch + label (disabled if overdue=OFF)
   ├─ DigestTimePicker                         ← Select (disabled if digest=OFF)
   │   └─ Options: 00:00 – 23:00 (hourly)
   ├─ TimezoneSelector                         ← Select (searchable)
   │   └─ Options: common IANA timezones
   └─ SaveButton                               ← Button with loading state

UnsubscribePage                                 ← New page (/unsubscribe)
   ├─ Loading state (verifying token)
   ├─ Success state (unsubscribed confirmation)
   └─ Error state (invalid token)
```
