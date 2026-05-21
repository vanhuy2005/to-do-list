# Upload Profile Image — Feature Overview

## 1. Feature Summary

Allow authenticated users to upload, replace, and delete a personal avatar image. Images are stored and optimized via **Cloudinary CDN**, ensuring fast delivery and automatic format/quality negotiation across all devices.

---

## 2. Business Goal

| Dimension | Detail |
|---|---|
| **Product value** | Profile images humanize the application, increase perceived ownership, and improve engagement in shared/collaborative contexts (future team features). |
| **Retention lever** | Users who personalize their account (avatar, display name) show higher 30-day retention in SaaS products. The avatar is the lowest-friction personalization. |
| **Platform readiness** | Prepares the platform for future social features (comments, @mentions, team boards) where avatars provide visual identity. |

## 3. User Pain Point Solved

Currently users see only generic initial-based circles. This makes the experience feel impersonal and undifferentiated:

- **No visual identity** — users cannot quickly identify their own account, especially on shared devices.
- **Unprofessional feel** — the app feels like a prototype without avatar support, hurting perception of production readiness.
- **Existing dead UI** — the Settings → Account section already has a partial avatar display (base64 local-only), but changes are not persisted to the backend. Users who upload an avatar see it vanish on next login or different device.

## 4. Scope

### In Scope

| Item | Detail |
|---|---|
| Upload avatar image | JPEG, PNG, WebP, GIF; max 5 MB |
| Replace existing avatar | Old Cloudinary asset is deleted automatically |
| Delete avatar | Reverts to initials-based fallback |
| Optimized delivery | Cloudinary auto-format (`f_auto`), auto-quality (`q_auto`), face-aware cropping |
| Responsive thumbnails | Eager transformations: 80×80 (nav), 200×200 (card), 400×400 (profile) |
| All avatar display surfaces | Settings page, Profile page, AppBar (future), BottomNav (future), SidebarNav (future) |
| Audit logging | Avatar upload/delete tracked in AuditLog |

### Out of Scope

| Item | Rationale |
|---|---|
| Client-side image cropping (e.g., react-easy-crop) | Cloudinary face-crop handles this server-side. Can add later. |
| Avatar moderation / NSFW detection | Future enhancement. Cloudinary offers moderation add-ons. |
| Animated avatar support | GIF uploads accepted but Cloudinary `f_auto` may convert to static WebP. Documented as known behavior. |
| Social login avatar import | OAuth providers (Google/GitHub) may supply an avatar URL in the future, but syncing those is out of scope now. |

## 5. Success Metrics (KPIs)

| Metric | Target | Measurement |
|---|---|---|
| **Avatar adoption rate** | ≥ 30 % of active users upload an avatar within 14 days of feature launch | `count(users where avatarUrl != null) / count(active users)` |
| **Upload success rate** | ≥ 98 % | `successful uploads / total upload attempts` (from AuditLog) |
| **P95 upload latency** | < 3 seconds (including Cloudinary round-trip) | Server-side timing logs |
| **Error rate** | < 2 % of upload attempts result in user-facing errors | Error log monitoring |

## 6. Key Stakeholders

| Role | Responsibility |
|---|---|
| Product owner | Approve UX flow and acceptance criteria |
| Backend engineer | Cloudinary service, upload middleware, profileViewModel extension |
| Frontend engineer | AvatarUpload component, Settings/Profile page integration |
| QA engineer | Cross-browser, mobile, edge-case testing |
| DevOps / Infra | Verify Cloudinary plan limits, CORS, reverse-proxy body-size config |

## 7. Dependencies on Existing System

| Dependency | Status | Notes |
|---|---|---|
| `cloudinary` npm package (v2.6.1) | ✅ Installed | Not yet initialized or used in code |
| `multer` npm package (v1.4.5-lts.1) | ✅ Installed | Currently used only for audio STT uploads |
| `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUD_NAME` env vars | ✅ Configured | Present in `.env` and exported from `config/env.js` |
| `User.avatarUrl` schema field | ✅ Exists | `{ type: String, default: null }` — no migration required |
| `profileViewModel` | ✅ Exists | Has `getProfile`, `updateProfile` — will extend with avatar methods |
| Profile routes (`/api/v1/profile`) | ✅ Exists | Will add `POST /avatar` and `DELETE /avatar` sub-routes |
| `AuditLog` model | ✅ Exists | entityType `'user'` already supported |
| `ProfileViewModelError` | ✅ Exists | Custom error class for structured error responses |

## 8. High-Level Approach

```
┌─────────────┐     multipart/form-data      ┌──────────────┐
│   Browser    │ ─────────────────────────▶   │  Express +   │
│  (React 19)  │                              │  multer      │
└─────────────┘                              │  (memory)    │
       ▲                                      └──────┬───────┘
       │  avatarUrl (CDN)                             │ buffer
       │                                      ┌──────▼───────┐
       │                                      │ profileVM    │
       │                                      │ .uploadAvatar│
       │                                      └──────┬───────┘
       │                                             │
       │                                      ┌──────▼───────┐
       │                                      │ Cloudinary   │
       │   ◀── secure_url ────────────────── │ Service      │
       │                                      └──────┬───────┘
       │                                             │
       │                                      ┌──────▼───────┐
       │                                      │ MongoDB      │
       │                                      │ User.avatarUrl│
       │                                      └──────────────┘
```

1. **Frontend** selects file → validates client-side (type, size) → sends `multipart/form-data` to `POST /api/v1/profile/avatar`.
2. **multer** (memory storage) parses the upload, enforces 5 MB limit and MIME whitelist.
3. **profileViewModel.uploadAvatar** validates the buffer, deletes old Cloudinary asset if exists, uploads new asset with transformations, saves `avatarUrl` to the User document, creates an AuditLog entry.
4. **Response** returns the new `avatarUrl` (Cloudinary CDN URL). Frontend updates localStorage user object and UI.

## 9. Timeline Estimate

| Phase | Duration | Notes |
|---|---|---|
| Backend (cloudinaryService + middleware + viewmodel + routes + tests) | 2–3 days | Most effort in Cloudinary integration and error handling |
| Frontend (AvatarUpload component + page integration + tests) | 2 days | File picker, preview, loading states, multi-surface update |
| Integration testing + E2E | 1 day | Playwright avatar upload flow, cross-browser |
| Code review + QA | 1 day | Edge cases, mobile testing, security review |
| **Total** | **6–7 days** | One engineer, sequential execution |
