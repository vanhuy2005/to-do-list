# Upload Profile Image — Implementation Tasks

## Backend Tasks

---

### B1: Create Cloudinary Service

**Objective:** Create `src/services/cloudinaryService.js` — a singleton service encapsulating all Cloudinary API interactions.

**Implementation Details:**
1. Import `cloudinary` v2 SDK and `config` from `../config/env.js`
2. Constructor: call `cloudinary.config()` with cloud_name, api_key, api_secret from config
3. `uploadAvatar(buffer, userId)`:
   - Create a `Readable` stream from the buffer
   - Pipe to `cloudinary.uploader.upload_stream()` with options:
     - `folder: 'todoapp/avatars/${userId}'`
     - `public_id: 'avatar'`
     - `overwrite: true`, `invalidate: true`
     - `resource_type: 'image'`
     - `transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }, { quality: 'auto', fetch_format: 'auto' }]`
     - `eager: [{ w: 80, h: 80, c: 'fill', g: 'face', q: 'auto', f: 'auto' }, { w: 200, h: 200, c: 'fill', g: 'face', q: 'auto', f: 'auto' }]`
     - `eager_async: false`
   - Return `{ url: result.secure_url, publicId: result.public_id, thumbnails: { small: eager[0].secure_url, medium: eager[1].secure_url } }`
4. `deleteAvatar(publicId)`:
   - Call `cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true })`
   - Return boolean indicating success
5. `extractPublicId(url)`:
   - Regex: `/\/upload\/v\d+\/(.+)\.\w+$/`
   - Return match[1] or null
6. Export as singleton instance

**Dependencies:** `cloudinary` npm (installed), `config/env.js` (cloudinary section exists)

**Acceptance Criteria:**
- [x] Can upload a buffer and receive `secure_url` + `public_id`
- [x] Can delete by `public_id` and receive confirmation
- [x] Can extract `public_id` from a Cloudinary URL
- [x] Eager transformations generate 80×80 and 200×200 thumbnails
- [x] Handles Cloudinary API errors gracefully (throws typed errors)

**Potential Risks:**
- Cloudinary credentials misconfigured → test with a simple upload during development
- Stream piping edge cases → test with various image sizes (1KB to 5MB)

---

### B2: Create Image Upload Middleware

**Objective:** Create `src/middleware/imageUpload.js` — multer configuration for avatar file uploads and magic bytes validation.

**Implementation Details:**
1. Configure multer:
   - `storage: multer.memoryStorage()`
   - `limits: { fileSize: 5 * 1024 * 1024, files: 1 }`
   - `fileFilter`: check `file.mimetype` against whitelist `['image/jpeg', 'image/png', 'image/webp', 'image/gif']`
2. Export `avatarUpload = multer(config).single('avatar')`
3. Create `validateImageBuffer(buffer, mimetype)` function:
   - JPEG: first 3 bytes = `[0xFF, 0xD8, 0xFF]`
   - PNG: first 4 bytes = `[0x89, 0x50, 0x4E, 0x47]`
   - GIF: first 3 bytes = `[0x47, 0x49, 0x46]`
   - WebP: bytes 0-3 = 'RIFF' AND bytes 8-11 = 'WEBP'
   - Return boolean
4. Create `handleMulterError` middleware to convert multer errors to structured responses:
   - `LIMIT_FILE_SIZE` → 400 `AVATAR_FILE_TOO_LARGE`
   - `LIMIT_UNEXPECTED_FILE` → 400 `AVATAR_FILE_REQUIRED`

**Dependencies:** `multer` npm (installed)

**Acceptance Criteria:**
- [x] Accepts valid JPEG, PNG, WebP, GIF files ≤ 5MB
- [x] Rejects files with non-whitelisted MIME types
- [x] Rejects files exceeding 5MB with clear error
- [x] `validateImageBuffer` catches files with spoofed MIME headers
- [x] Error responses match existing format `{ success: false, error: { code, message } }`

**Potential Risks:**
- Memory pressure under high concurrency — mitigated by rate limiting (B4)
- multer error event handling can be tricky — test with various error scenarios

---

### B3: Extend profileViewModel with Avatar Methods

**Objective:** Add `uploadAvatar(req, res)` and `deleteAvatar(req, res)` methods to the existing `src/viewmodels/profileViewModel.js`.

**Implementation Details:**

**`uploadAvatar(req, res)`:**
1. Validate `req.file` exists
2. Call `validateImageBuffer(req.file.buffer, req.file.mimetype)` — throw `AVATAR_INVALID_TYPE` if false
3. Fetch user from DB: `const user = await User.findById(req.userId)`
4. If `user.avatarUrl` exists:
   - Extract publicId: `cloudinaryService.extractPublicId(user.avatarUrl)`
   - Delete old: `await cloudinaryService.deleteAvatar(publicId)` (catch errors, log, continue)
5. Upload new: `const result = await cloudinaryService.uploadAvatar(req.file.buffer, req.userId)`
6. Update DB: `await User.findByIdAndUpdate(req.userId, { avatarUrl: result.url })`
7. Create AuditLog: `{ actorId: req.userId, action: 'user.avatar.upload', entityType: 'user', entityId: req.userId, summaryBefore: { avatarUrl: user.avatarUrl }, summaryAfter: { avatarUrl: result.url } }`
8. Respond: `{ success: true, data: { avatarUrl: result.url, thumbnails: result.thumbnails }, message: 'Avatar uploaded successfully' }`

**`deleteAvatar(req, res)`:**
1. Fetch user: `const user = await User.findById(req.userId)`
2. If `!user.avatarUrl` → throw `ProfileViewModelError(400, 'AVATAR_NOT_FOUND', 'No avatar to delete')`
3. Extract publicId → `cloudinaryService.deleteAvatar(publicId)`
4. Update DB: `User.findByIdAndUpdate(req.userId, { avatarUrl: null })`
5. Create AuditLog with `action: 'user.avatar.delete'`
6. Respond: `{ success: true, message: 'Avatar removed successfully' }`

**Dependencies:** B1 (cloudinaryService), B2 (validateImageBuffer), User model, AuditLog model

**Acceptance Criteria:**
- [x] Upload saves Cloudinary URL to User.avatarUrl
- [x] Replace deletes old Cloudinary asset before uploading new
- [x] Delete sets avatarUrl to null and removes Cloudinary asset
- [x] AuditLog entries created for both operations with before/after snapshots
- [x] Errors use ProfileViewModelError with proper status codes and error codes
- [x] DB failure after Cloudinary upload triggers rollback (delete newly uploaded asset)

**Potential Risks:**
- Race condition between DB read and update → use `findByIdAndUpdate` (atomic)
- Cloudinary cleanup failure on replace → logged but non-blocking

---

### B4: Add Avatar Routes

**Objective:** Register `POST /profile/avatar` and `DELETE /profile/avatar` in the profile router.

**Implementation Details:**
1. In the profile routes file (e.g., `src/routes/profileRoutes.js`):
   ```javascript
   import { avatarUpload, handleMulterError } from '../middleware/imageUpload.js';
   
   router.post('/avatar', authMiddleware, requireRole('user'), avatarUpload, handleMulterError, errorHandler(vm.uploadAvatar));
   router.delete('/avatar', authMiddleware, requireRole('user'), errorHandler(vm.deleteAvatar));
   ```
2. Optionally add avatar-specific rate limiter (10 req/hour/user)

**Dependencies:** B2 (imageUpload middleware), B3 (viewmodel methods), existing auth middleware

**Acceptance Criteria:**
- [x] POST /api/v1/profile/avatar accepts multipart upload with auth
- [x] DELETE /api/v1/profile/avatar works with auth
- [x] Unauthenticated requests return 401
- [x] Non-user roles return 403

**Potential Risks:**
- Middleware ordering matters: multer must run before viewmodel but after auth
- Multer error must be caught before reaching viewmodel

---

### B5: Add Avatar Cleanup to User Deletion

**Objective:** When admin deletes a user (`adminViewModel.deleteUserOffline`), clean up their Cloudinary avatar assets.

**Implementation Details:**
1. Before deleting the user document, check `user.avatarUrl`
2. If exists: extract publicId → `cloudinaryService.deleteAvatar()` → delete folder `todoapp/avatars/{userId}/`
3. Wrap in try-catch: failure should not block user deletion (log and continue)

**Dependencies:** B1 (cloudinaryService), existing adminViewModel

**Acceptance Criteria:**
- [x] User deletion cleans up Cloudinary assets
- [x] Cleanup failure does not prevent user deletion
- [x] Cleanup failure is logged for manual review

**Potential Risks:**
- Cloudinary folder deletion API might not exist or behave differently → test manually

---

## Frontend Tasks

---

### F1: Create AvatarUpload Component

**Objective:** Create `src/components/settings/AvatarUpload.jsx` — reusable avatar display + upload + delete component.

**Implementation Details:**
1. Props: `avatarUrl`, `displayName`, `onUploadSuccess(data)`, `onDeleteSuccess()`, `disabled`
2. State: `previewUrl`, `isUploading`, `isDeleting`, `showDeleteDialog`
3. Refs: `fileInputRef`, `abortControllerRef`
4. Hidden `<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" capture="user">`
5. File selection handler:
   - Validate type and size client-side
   - Create preview URL: `URL.createObjectURL(file)`
   - Call upload API via FormData
6. Upload success: call `onUploadSuccess({ avatarUrl, thumbnails })`, revoke preview URL
7. Delete: show shadcn `Dialog` confirmation → call delete API → `onDeleteSuccess()`
8. Initials fallback: extract first letters from displayName, background color from hash
9. Styling: Pop Art design — 3px border, comic-shadow, camera icon overlay on hover
10. Cleanup: `useEffect` cleanup revokes preview URL and aborts pending uploads

**Dependencies:** shadcn `Avatar`, `Button`, `Dialog`; lucide-react `Camera`, `Trash2`, `Loader2`; sonner for toasts

**Acceptance Criteria:**
- [x] Displays current avatar or initials fallback
- [x] Click opens file picker with camera option on mobile
- [x] Shows optimistic preview during upload
- [x] Shows spinner overlay during upload
- [x] Toasts for success and all error cases
- [x] Delete triggers confirmation dialog
- [x] Matches Pop Art design system (borders, shadows, colors)
- [x] 44px minimum touch targets
- [x] Accessible: aria-labels, keyboard navigation, focus management

**Potential Risks:**
- `capture="user"` behavior varies by mobile browser
- Preview URL memory leak if not revoked

---

### F2: Create Avatar Service Methods

**Objective:** Add `uploadAvatar(file)` and `deleteAvatar()` functions.

**Implementation Details:**
1. In `src/services/authService.js` or a new `src/services/profileService.js`:
   ```javascript
   export async function uploadAvatar(file) {
     const formData = new FormData();
     formData.append('avatar', file);
     const response = await api.post('/profile/avatar', formData, {
       headers: { 'Content-Type': 'multipart/form-data' },
     });
     // Update localStorage user object
     const user = getUser();
     user.avatarUrl = response.data.avatarUrl;
     setUser(user);
     return response;
   }
   
   export async function deleteAvatar() {
     const response = await api.delete('/profile/avatar');
     const user = getUser();
     user.avatarUrl = null;
     setUser(user);
     return response;
   }
   ```
2. The axios instance in `src/lib/axios.js` already handles auth headers and token refresh

**Dependencies:** `src/lib/axios.js`, `authService` localStorage helpers

**Acceptance Criteria:**
- [x] Upload sends multipart FormData correctly
- [x] Delete sends DELETE request
- [x] localStorage updated on success
- [x] Axios interceptor doesn't interfere with multipart Content-Type

**Potential Risks:**
- Axios may override `Content-Type` — verify FormData auto-detection works

---

### F3: Update SettingsPage Account Section

**Objective:** Integrate `AvatarUpload` into the existing Account section of SettingsPage.

**Implementation Details:**
1. Import `AvatarUpload` component
2. Replace any existing base64 avatar display with `AvatarUpload`
3. Pass: `avatarUrl={profile.avatarUrl}`, `displayName={profile.displayName}`, callbacks for upload/delete
4. On successful upload/delete, re-fetch profile or update local state

**Dependencies:** F1, F2, existing SettingsPage

**Acceptance Criteria:**
- [x] Avatar upload works from Settings page
- [x] Visual consistency with existing Pop Art design
- [x] No regression in existing Settings functionality

**Potential Risks:** Minimal — additive change to existing component

---

### F4: Update ProfilePage Avatar Display

**Objective:** ProfilePage uses the `avatarUrl` from the API response instead of base64.

**Implementation Details:**
1. In ProfilePage, read `avatarUrl` from the profile API response
2. Use shadcn `Avatar` + `AvatarImage` (src = avatarUrl) + `AvatarFallback` (initials)
3. For the hero section, use the medium-size Cloudinary URL (200×200 or 400×400)
4. Add "Chỉnh sửa" overlay on hover that links to Settings

**Dependencies:** F2 (consistent avatar data)

**Acceptance Criteria:**
- [x] Avatar displays correctly from Cloudinary URL
- [x] Initials fallback works when avatarUrl is null
- [x] Responsive sizing (80px mobile, 120px desktop)

**Potential Risks:** None significant

---

### F5: Update All Avatar Display Points

**Objective:** Ensure avatar is consistent across AppBar, BottomNav, SidebarNav, ProfilePage, SettingsPage.

**Implementation Details:**
1. Audit all components that render a user avatar or initials
2. Read `avatarUrl` from `authService.getUser()` (localStorage)
3. Use appropriate Cloudinary thumbnail size per context:
   - Nav elements (28-36px display): use `thumbnails.small` (80×80)
   - Cards/headers (80-120px display): use `avatarUrl` (400×400) or `thumbnails.medium` (200×200)
4. For cross-tab sync (optional): add `window.addEventListener('storage')` in layout components

**Dependencies:** F4

**Acceptance Criteria:**
- [x] Avatar appears in all surfaces after upload
- [x] Initials appear in all surfaces after delete
- [x] Appropriate image sizes loaded (no 400×400 for a 32px icon)

**Potential Risks:**
- Some components may not re-render after localStorage update → may need callback or event listener

---

## Database Tasks

---

### D1: Verify avatarUrl Field

**Objective:** Confirm User model has `avatarUrl` field properly configured.

**Implementation Details:**
1. Open `src/models/User.js`, verify `avatarUrl: { type: String, default: null }` exists
2. Optionally add URL format validator for Cloudinary URLs (defense-in-depth)
3. No migration script needed — field already exists

**Dependencies:** None

**Acceptance Criteria:**
- [x] Field exists in schema
- [x] Default is null for new and existing users
- [x] Optional: URL validator prevents non-Cloudinary URLs

**Potential Risks:** None

---

## Infrastructure Tasks

---

### I1: Verify Cloudinary Configuration

**Objective:** Validate Cloudinary account, credentials, and plan limits.

**Implementation Details:**
1. Login to Cloudinary dashboard (cloud name: `ddnauyhho`)
2. Verify API key `448919822573246` and secret match
3. Check plan: free tier allows 25 credits/month (~25 GB bandwidth or ~25K transformations)
4. Create a test upload programmatically to verify credentials
5. Check if `todoapp/avatars/` folder exists or will be auto-created

**Dependencies:** Cloudinary account

**Acceptance Criteria:**
- [x] API credentials are valid
- [x] Test upload/delete cycle works
- [x] Plan limits are sufficient for expected usage

**Potential Risks:**
- Free plan may have insufficient bandwidth for production → monitor and upgrade as needed

---

## Testing Tasks

---

### T1: Backend Unit Tests

**Objective:** Test `cloudinaryService` and `profileViewModel` avatar methods with mocked Cloudinary SDK.

**Implementation Details:**
- `cloudinaryService.test.js`: Mock `cloudinary.uploader.upload_stream` and `cloudinary.uploader.destroy`. Test upload returns correct structure. Test delete returns true. Test extractPublicId with various URLs.
- `profileViewModel.avatar.test.js`: Mock cloudinaryService and User model. Test uploadAvatar success, replace (old delete + new upload), delete success, delete when no avatar (400 error), DB failure rollback.

**Dependencies:** B1, B3, Jest

**Acceptance Criteria:**
- [x] ≥ 80% line coverage for avatar-related code
- [x] All error paths tested
- [x] Cloudinary SDK is mocked (no real API calls in tests)

**Potential Risks:** Mocking stream-based upload API can be complex

---

### T2: API Integration Tests

**Objective:** Test avatar endpoints with supertest.

**Implementation Details:**
- Test suite with authenticated requests (mock JWT)
- Test upload: send multipart with a real small image → assert 200, avatarUrl returned
- Test upload validation: wrong MIME → 400, oversized → 400, no file → 400
- Test delete: assert 200, avatarUrl cleared
- Test delete with no avatar: assert 400
- Test unauthorized: no token → 401

**Dependencies:** B4, supertest, test JWT

**Acceptance Criteria:**
- [x] All endpoints return correct status codes and response format
- [x] Tests are deterministic (mock external services or use test Cloudinary account)

**Potential Risks:** Need either a test Cloudinary account or comprehensive mocking

---

### T3: Frontend Component Tests

**Objective:** Test AvatarUpload component rendering and interactions.

**Implementation Details:**
- Vitest + @testing-library/react
- Test initial render: shows initials when no avatarUrl
- Test initial render: shows image when avatarUrl provided
- Test file selection: triggers file input, validates file
- Test upload state: shows spinner overlay
- Test delete flow: shows confirmation dialog, confirm triggers delete
- Test error states: file too large, invalid type

**Dependencies:** F1, Vitest

**Acceptance Criteria:**
- [x] Component renders correctly in all states
- [x] User interactions trigger correct callbacks
- [x] Error toasts displayed for invalid inputs

**Potential Risks:** Mocking file input and FormData in jsdom environment

---

### T4: E2E Tests

**Objective:** Full avatar upload/delete flow in Playwright.

**Implementation Details:**
- Navigate to Settings → Account section
- Use `page.setInputFiles()` to upload a test image
- Wait for upload completion (toast appears)
- Assert avatar image is visible with Cloudinary URL src
- Navigate to Profile → verify same avatar
- Navigate back to Settings → click delete → confirm → verify initials

**Dependencies:** All frontend + backend tasks, Playwright

**Acceptance Criteria:**
- [x] Complete upload → verify → delete → verify flow passes
- [x] Tests run in CI with test Cloudinary account

**Potential Risks:** Playwright `setInputFiles` may need specific file path handling on Windows

---

## Documentation Tasks

---

### DOC1: Update API Reference

**Objective:** Add `POST /api/v1/profile/avatar` and `DELETE /api/v1/profile/avatar` to `docs/app/03-thiet-ke-api.md`.

**Dependencies:** B4

---

### DOC2: Update Database Schema Docs

**Objective:** Document avatarUrl field behavior and Cloudinary URL format in `docs/app/02-thiet-ke-csdl.md`.

**Dependencies:** D1
