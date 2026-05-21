# Upload Profile Image — UX Flow

## 1. User Journey Map

### Primary Flow: Upload Avatar

```
Step 1: Navigate to Settings (/settings)
   └─ User taps "Cài đặt" in BottomNav or SidebarNav

Step 2: View Account Section
   └─ Settings page loads → Account section shows:
      ├─ Current avatar (or initials circle if no avatar)
      ├─ Display name field
      └─ Email (read-only)

Step 3: Trigger Upload
   └─ User taps/clicks the avatar circle or "Thay đổi ảnh đại diện" button
   └─ Hidden <input type="file" accept="image/*" capture="user"> opens native file picker

Step 4: Select Image
   └─ User selects image from gallery/camera
   └─ Client-side validation:
      ├─ Check file.type ∈ {image/jpeg, image/png, image/webp, image/gif}
      └─ Check file.size ≤ 5 * 1024 * 1024

Step 5: Instant Preview
   └─ Selected image shown immediately in avatar circle (URL.createObjectURL)
   └─ Overlay shows upload progress indicator

Step 6: Upload in Progress
   └─ POST /api/v1/profile/avatar (FormData)
   └─ Avatar circle shows spinner overlay
   └─ Upload/delete buttons disabled

Step 7: Success
   └─ Toast: "Đã cập nhật ảnh đại diện" ✅
   └─ Avatar updates everywhere (Settings, Profile, Nav)
   └─ localStorage auth_user updated with new avatarUrl
```

### Secondary Flow: Delete Avatar

```
Step 1: View Account Section (avatar exists)
   └─ Trash icon visible next to avatar

Step 2: Tap Delete
   └─ Confirmation dialog:
      Title:  "Xóa ảnh đại diện?"
      Body:   "Ảnh đại diện sẽ được thay bằng chữ cái đầu tên."
      Cancel: "Hủy"
      Confirm: "Xóa"

Step 3: Confirm Delete
   └─ DELETE /api/v1/profile/avatar
   └─ Avatar circle shows brief fade-out animation

Step 4: Success
   └─ Toast: "Đã xóa ảnh đại diện"
   └─ Avatar reverts to initials fallback everywhere
   └─ localStorage auth_user.avatarUrl set to null
```

---

## 2. Loading States

| State | Visual | Duration |
|---|---|---|
| **Initial page load** | Avatar circle shows `Skeleton` (animated pulse circle) | Until `GET /profile` returns |
| **File selected** | Optimistic preview of selected image replaces avatar | Instant (local URL) |
| **Uploading** | Semi-transparent dark overlay on avatar + `Loader2` spinning icon (lucide-react) | 1–5 seconds (depends on file size + Cloudinary) |
| **Upload button** | Disabled with spinner, text changes to "Đang tải lên..." | During upload |
| **Delete in progress** | Confirmation dialog closes, avatar shows brief skeleton | 0.5–2 seconds |

---

## 3. Error States

| Error | Toast Message (Vietnamese) | Toast Type | Recovery Action |
|---|---|---|---|
| File too large (>5MB) | "Ảnh không được vượt quá 5MB" | `error` | User selects smaller file |
| Invalid format | "Chỉ hỗ trợ định dạng JPG, PNG, WebP, GIF" | `error` | User selects valid format |
| Network error | "Lỗi kết nối. Vui lòng thử lại" | `error` | User retries |
| Cloudinary error | "Không thể tải ảnh lên. Vui lòng thử lại" | `error` | User retries |
| Rate limit exceeded | "Bạn đã tải lên quá nhiều. Vui lòng đợi" | `warning` | User waits |
| Delete failed | "Không thể xóa ảnh. Vui lòng thử lại" | `error` | User retries |

All toasts use the existing `sonner` comic style (top-center, 3px border, comic shadow).

---

## 4. Empty States

### No Avatar (Default State)

```
┌─────────────┐
│             │
│    NH       │   ← Initials (first letter of each word in displayName)
│             │      e.g. "Nguyễn Huy" → "NH"
└─────────────┘
Background color: derived from displayName hash (deterministic, consistent)
Text: white, bold, Plus Jakarta Sans
```

**Implementation for hash-based color:**
```javascript
function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#FF2D55', '#00C2FF', '#FFD400', '#7de228', '#9B59B6', '#E67E22'];
  return colors[Math.abs(hash) % colors.length];
}
```

**Hover state (empty avatar):**
- Tooltip: "Thêm ảnh đại diện"
- Camera icon fades in over the initials circle

---

## 5. Responsive Behavior

| Context | Avatar Size | Interaction | Notes |
|---|---|---|---|
| **Settings page (mobile)** | 80px | Tap to upload | `capture="user"` offers camera option |
| **Settings page (desktop)** | 120px | Click to upload, hover shows camera overlay | No drag-and-drop (simpler, reliable) |
| **Profile page hero (mobile)** | 80px | Tap navigates to Settings for editing | Display only on profile page |
| **Profile page hero (desktop)** | 120px | Hover shows "Chỉnh sửa" text overlay | Links to Settings |
| **BottomNav** | 28px | Not interactive (display only) | Uses `thumbnails.small` |
| **SidebarNav** | 36px | Not interactive (display only) | Uses `thumbnails.small` |
| **AppBar** | 32px | Not interactive (display only) | Uses `thumbnails.small` |

**File picker:** Uses native `<input type="file">` — no custom drop zone. This ensures consistent behavior across mobile browsers and provides camera capture on mobile.

---

## 6. Accessibility

| Concern | Implementation |
|---|---|
| **Alt text** | `<AvatarImage alt="{displayName} avatar" />` |
| **Upload button** | `<button aria-label="Thay đổi ảnh đại diện">` |
| **Delete button** | `<button aria-label="Xóa ảnh đại diện">` |
| **File input** | `<input type="file" aria-label="Chọn ảnh đại diện" />` |
| **Keyboard navigation** | Enter/Space triggers file picker. Tab order: avatar → upload button → delete button |
| **Focus management** | After upload completes, focus returns to avatar area. After delete dialog confirms, focus returns to avatar area |
| **Screen reader** | Live region announces: "Đã tải ảnh lên thành công" (upload) or "Đã xóa ảnh đại diện" (delete) |
| **Color contrast** | Initials on colored background meet WCAG AA (white text on curated palette) |
| **Reduced motion** | `@media (prefers-reduced-motion)` → disable hover animations, pulse effects |

---

## 7. Animations & Micro-interactions

| Interaction | Animation | CSS/Library |
|---|---|---|
| **Avatar hover (desktop)** | Scale to 1.05 + comic-shadow-hover (4px 4px 0 #111) | `desktop-hover-scale` class (existing) |
| **Camera icon overlay** | Fade in from 0 to 0.8 opacity | `transition: opacity 200ms ease` |
| **Upload progress** | Pulsing overlay (60% black, white spinner) | `animate-pulse` from tw-animate-css |
| **Upload success** | Brief green checkmark (✓) overlay for 1.5s, fades out | CSS keyframe: `fadeIn 200ms → hold 1000ms → fadeOut 300ms` |
| **Delete confirmation** | Standard shadcn Dialog animation (scale + fade) | Radix Dialog built-in |
| **Avatar removal** | Fade-out of image (300ms) → fade-in of initials | CSS transition on `opacity` |
| **Toast** | Slide down from top, comic shadow | Sonner default + comic overrides (existing) |

---

## 8. Component Hierarchy

```
SettingsPage
└─ Account Section
   └─ AvatarUpload                          ← New component
      ├─ AvatarDisplay                       ← shadcn Avatar + AvatarImage + AvatarFallback
      │   ├─ <AvatarImage src={previewUrl || avatarUrl} />
      │   └─ <AvatarFallback>{initials}</AvatarFallback>
      ├─ CameraOverlay                       ← Hover/tap trigger (Camera icon from lucide)
      ├─ UploadProgress                      ← Conditional: visible during upload (Loader2 icon)
      ├─ HiddenFileInput                     ← <input type="file" ref={fileInputRef} />
      ├─ UploadButton                        ← "Thay đổi ảnh" text button (below avatar)
      └─ DeleteButton                        ← Trash2 icon button (only when avatarUrl exists)
         └─ DeleteConfirmDialog              ← shadcn Dialog for confirmation

ProfilePage
└─ ProfileHeader
   └─ AvatarDisplay                          ← Reuse same component (read-only mode)
      ├─ <AvatarImage src={avatarUrl} />
      └─ <AvatarFallback>{initials}</AvatarFallback>
```

---

## 9. State Management for Avatar

Since the app uses **no global state library** (per codebase research), avatar state is managed via localStorage:

```javascript
// After successful upload:
const user = authService.getUser();
user.avatarUrl = response.data.avatarUrl;
authService.setUser(user); // Updates localStorage

// All components reading avatar:
const user = authService.getUser();
const avatarUrl = user?.avatarUrl;
```

**Cross-component sync:** After updating localStorage, the Settings page callback triggers a re-render. Other pages (Profile, Nav) read from localStorage on mount — they'll pick up the new avatar on next navigation.

**Same-page sync (Settings → Nav):** If nav components are mounted at the same time as Settings, fire a `window.dispatchEvent(new Event('storage'))` or use a simple callback prop through the layout.

---

## 10. Mobile-Specific Considerations

| Concern | Implementation |
|---|---|
| **Camera capture** | `<input accept="image/*" capture="user">` offers camera as first option on mobile |
| **Touch target** | Avatar circle is 80px (≥44px minimum). Buttons are 44px height minimum |
| **File picker UX** | Native OS file picker — consistent, familiar, handles permissions |
| **Large file on cellular** | Client-side 5MB check prevents wasting cellular data on oversized uploads |
| **Upload timeout** | 30-second timeout on the API call; if exceeded, show timeout error toast |
| **Orientation** | Cloudinary auto-rotates based on EXIF orientation data |
| **Memory** | `URL.revokeObjectURL()` called after preview is no longer needed |
