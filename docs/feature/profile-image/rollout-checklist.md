# Upload Profile Image — Rollout Checklist

## 1. Pre-Development

- [ ] **Verify Cloudinary account** — Login to dashboard, confirm cloud name `ddnauyhho` matches env
- [ ] **Verify Cloudinary plan** — Check monthly credit balance (free: 25 credits). Confirm transformation, bandwidth, storage headroom for expected user volume
- [ ] **Test credentials** — Run a programmatic test upload/delete cycle using the configured API key
- [ ] **Review User model** — Confirm `avatarUrl: { type: String, default: null }` exists in `src/models/User.js`
- [ ] **Design review** — Review AvatarUpload component mockup for Pop Art design consistency (3px borders, comic shadow, colors)

**Owner:** Backend engineer + Product designer
**Acceptance:** All items checked, no blockers identified

---

## 2. Backend Development

- [ ] **Create `src/services/cloudinaryService.js`** — Cloudinary SDK init, uploadAvatar, deleteAvatar, extractPublicId
- [ ] **Create `src/middleware/imageUpload.js`** — multer config (memory, 5MB, MIME whitelist) + magic bytes validation
- [ ] **Extend `src/viewmodels/profileViewModel.js`** — Add uploadAvatar(req, res) and deleteAvatar(req, res)
- [ ] **Add routes** — `POST /profile/avatar` and `DELETE /profile/avatar` in profile router
- [ ] **Add avatar rate limiter** — 10 requests/hour/user for avatar endpoints
- [ ] **Add avatar cleanup to user deletion** — In adminViewModel.deleteUserOffline, delete Cloudinary assets
- [ ] **Code review** — Peer review of all backend changes

**Owner:** Backend engineer
**Acceptance:** All endpoints work via curl/Postman, error codes correct, audit logs created

---

## 3. Frontend Development

- [ ] **Create `src/components/settings/AvatarUpload.jsx`** — Avatar display + upload + delete with Pop Art styling
- [ ] **Add avatar service methods** — `uploadAvatar(file)`, `deleteAvatar()` with localStorage sync
- [ ] **Update SettingsPage** — Integrate AvatarUpload into Account section
- [ ] **Update ProfilePage** — Display Cloudinary avatarUrl with initials fallback
- [ ] **Audit all avatar surfaces** — Update AppBar, BottomNav, SidebarNav to use appropriate thumbnail sizes
- [ ] **Code review** — Peer review of all frontend changes

**Owner:** Frontend engineer
**Acceptance:** Upload/delete works from UI, avatar consistent across all pages, matches design system

---

## 4. Testing

### Automated
- [ ] **Backend unit tests** — cloudinaryService (mocked), profileViewModel avatar methods (mocked)
- [ ] **API integration tests** — supertest for upload/delete endpoints, all error scenarios
- [ ] **Frontend component tests** — AvatarUpload render states, interactions, error handling
- [ ] **E2E test** — Playwright: upload → verify → delete → verify flow

### Manual
- [ ] **Upload JPEG** — standard photo, verify avatar appears correctly
- [ ] **Upload PNG** — transparent background, verify rendering
- [ ] **Upload WebP** — modern format, verify acceptance
- [ ] **Upload GIF** — animated, verify Cloudinary serves static frame (documented behavior)
- [ ] **Upload oversized file (>5MB)** — verify rejection toast in Vietnamese
- [ ] **Upload non-image file** — verify rejection
- [ ] **Upload renamed non-image** — e.g., `text.jpg` → verify magic bytes rejection
- [ ] **Delete avatar** — verify initials return
- [ ] **Replace avatar** — upload → upload again → verify old replaced
- [ ] **Mobile test (Chrome Android)** — verify camera capture option, 80px avatar, tap upload
- [ ] **Mobile test (Safari iOS)** — same as above
- [ ] **Slow connection (3G throttled)** — verify timeout handling, loading state persists
- [ ] **Cross-browser** — Chrome, Firefox, Safari, Edge on desktop

**Owner:** QA engineer
**Acceptance:** All manual test cases pass, no visual regressions

---

## 5. Security Review

- [ ] **MIME validation** — Verify both Content-Type header and magic bytes are checked
- [ ] **File size limit** — Verify 5MB enforced at multer level, not just client-side
- [ ] **Authentication** — Verify unauthenticated requests return 401
- [ ] **Authorization** — Verify disabled users receive 403
- [ ] **EXIF stripping** — Upload photo with GPS EXIF data, verify Cloudinary strips it
- [ ] **SVG rejection** — Attempt SVG upload, verify blocked
- [ ] **No directory traversal** — Verify Cloudinary public_id is server-generated
- [ ] **Audit trail** — Verify AuditLog entries for upload and delete
- [ ] **Rate limiting** — Send >10 uploads in 1 hour, verify 429 response

**Owner:** Security reviewer
**Acceptance:** No vulnerabilities identified in file upload path

---

## 6. Performance Review

- [ ] **CDN delivery** — Verify avatar images served from `res.cloudinary.com` with proper cache headers
- [ ] **Thumbnail sizes** — Verify 80×80, 200×200, 400×400 variants generated correctly
- [ ] **Response time** — P95 upload latency < 3 seconds (measure with different file sizes)
- [ ] **Memory usage** — Monitor server memory during concurrent uploads (multer memory storage)
- [ ] **No memory leaks** — Frontend `URL.revokeObjectURL` called after preview cleanup

**Owner:** Backend engineer
**Acceptance:** Performance targets met, no memory issues under load

---

## 7. Deployment

- [ ] **Environment variables** — Verify `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUD_NAME` set in production env
- [ ] **CORS configuration** — Verify multipart uploads allowed from production frontend origin
- [ ] **Reverse proxy body size** — If using nginx: `client_max_body_size` ≥ 10m (gives headroom above 5MB limit)
- [ ] **Deploy backend** — Deploy backend with new routes, services, middleware
- [ ] **Deploy frontend** — Deploy frontend with AvatarUpload component and page updates
- [ ] **Smoke test** — Upload and delete an avatar in production
- [ ] **Verify CDN** — Confirm avatar served via Cloudinary CDN (not proxied through app server)

**Owner:** DevOps / Backend engineer
**Acceptance:** Feature works end-to-end in production

---

## 8. Post-Deployment Monitoring

- [ ] **Error rate** — Monitor `AVATAR_UPLOAD_FAILED` and `AVATAR_DELETE_FAILED` error codes (target: < 2%)
- [ ] **Upload success rate** — Track via AuditLog query: `action: 'user.avatar.upload'` count vs error count
- [ ] **Cloudinary usage** — Monitor bandwidth and transformation credits in Cloudinary dashboard
- [ ] **Orphaned assets** — Periodically check for Cloudinary assets without matching DB entries
- [ ] **User feedback** — Collect any bug reports or UX issues within first 7 days

**Owner:** On-call engineer
**Acceptance:** Error rates within target, no critical issues reported

---

## 9. Rollback Plan

If critical issues are discovered post-deployment:

1. **Revert backend code** — Remove avatar routes from profile router. CloudinaryService and imageUpload middleware become dead code (safe to leave)
2. **Revert frontend code** — Remove AvatarUpload component from Settings page. Revert ProfilePage to pre-avatar state
3. **Data safety:**
   - `avatarUrl` field remains in User schema (null for all users who haven't uploaded)
   - Users who uploaded during the brief window retain their `avatarUrl` value in DB but it won't be displayed
   - Cloudinary assets remain in Cloudinary (no data loss)
   - Assets can be cleaned up manually or re-enabled when the feature is re-launched
4. **No migration rollback needed** — no schema changes were made

**Rollback time:** < 15 minutes (deploy previous version)
**Data loss:** None
