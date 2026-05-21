# Upload Profile Image — Edge Cases

## EC-1: Concurrent Uploads

**Scenario:** User clicks upload, selects an image, and before the upload completes, selects another image.

**Expected Behavior:** Only the last-selected image should be uploaded. No duplicate Cloudinary assets.

**Implementation:**
- **Frontend:** Use an `AbortController` per upload. When a new file is selected, abort the previous XHR. Debounce the file-select handler (300ms).
  ```javascript
  const abortControllerRef = useRef(null);
  
  const handleFileSelect = async (file) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    await uploadAvatar(file, { signal: abortControllerRef.current.signal });
  };
  ```
- **Backend:** The Cloudinary upload uses `overwrite: true` with a fixed `public_id`, so concurrent uploads naturally resolve to the last one. No server-side mutex needed.

**Testing:** Playwright test with two rapid file selections. Assert only one Cloudinary asset exists and `avatarUrl` matches the second image.

---

## EC-2: Cloudinary Upload Succeeds, DB Save Fails

**Scenario:** Image successfully uploaded to Cloudinary, but `User.findByIdAndUpdate` throws (e.g., MongoDB connection lost).

**Expected Behavior:** Orphaned Cloudinary asset is cleaned up. User sees error.

**Implementation:**
```javascript
try {
  const result = await cloudinaryService.uploadAvatar(buffer, userId);
  try {
    await User.findByIdAndUpdate(userId, { avatarUrl: result.url });
  } catch (dbError) {
    // Rollback: delete the just-uploaded asset
    try {
      await cloudinaryService.deleteAvatar(result.publicId);
    } catch (cleanupError) {
      console.error('ORPHANED ASSET:', result.publicId, cleanupError);
      // Log for manual cleanup — do not throw
    }
    throw new ProfileViewModelError(500, 'AVATAR_UPLOAD_FAILED', 'Database update failed');
  }
} catch (uploadError) { /* ... */ }
```

**Testing:** Mock `User.findByIdAndUpdate` to throw. Assert Cloudinary delete is called. Assert error response.

---

## EC-3: DB Update Succeeds, Old Cloudinary Delete Fails

**Scenario:** User replaces avatar. New image uploaded and DB updated, but deleting the old Cloudinary asset fails (e.g., Cloudinary API timeout).

**Expected Behavior:** User request succeeds (new avatar is live). Old asset becomes orphaned. Warning logged.

**Implementation:**
```javascript
// Delete old avatar — best-effort, non-blocking
if (user.avatarUrl) {
  const oldPublicId = cloudinaryService.extractPublicId(user.avatarUrl);
  cloudinaryService.deleteAvatar(oldPublicId).catch(err => {
    console.warn(`Orphaned Cloudinary asset: ${oldPublicId}`, err.message);
  });
}
```

**Testing:** Mock Cloudinary delete to throw. Assert upload still succeeds. Assert warning logged.

---

## EC-4: Rapid Upload Then Delete

**Scenario:** User uploads an avatar, then immediately clicks delete before the upload response arrives.

**Expected Behavior:** The upload completes, then the delete processes. Final state: no avatar.

**Implementation:**
- **Frontend:** Disable the delete button during upload. Only enable after upload completes.
- **Backend:** Delete operation checks current `avatarUrl` value. If it was just set by the upload, the delete proceeds normally.
- **Race condition guard:** The delete handler reads `user.avatarUrl` from the DB (fresh read), ensuring it operates on the latest value.

**Testing:** Sequential API calls: POST then immediate DELETE. Assert final `avatarUrl` is null.

---

## EC-5: File Exactly at 5MB Boundary

**Scenario:** User uploads a file that is exactly 5,242,880 bytes.

**Expected Behavior:** Upload succeeds. multer's `fileSize` limit is inclusive (≤ 5MB passes).

**Implementation:** multer `limits.fileSize: 5 * 1024 * 1024` — files at or below this size are accepted.

**Testing:** Create a test image of exactly 5,242,880 bytes. Assert upload succeeds. Create one at 5,242,881 bytes. Assert 400 error.

---

## EC-6: Corrupted Image with Valid MIME Header

**Scenario:** File has `Content-Type: image/jpeg` but the binary content is random garbage.

**Expected Behavior:** Rejected at magic bytes validation (step before Cloudinary upload).

**Implementation:** The `validateImageBuffer(buffer, mimetype)` function checks the first bytes. Random data won't match the JPEG signature `[0xFF, 0xD8, 0xFF]`.

**Testing:** Create a file with `.jpg` extension and JPEG MIME but random byte content. Assert 400 `AVATAR_INVALID_TYPE`.

---

## EC-7: SVG Upload Attempt

**Scenario:** User attempts to upload an SVG file (which could contain embedded JavaScript).

**Expected Behavior:** Rejected at multer `fileFilter`. `image/svg+xml` is not in the MIME whitelist.

**Implementation:** Already handled by the whitelist: `['image/jpeg', 'image/png', 'image/webp', 'image/gif']`.

**Testing:** Upload an SVG file. Assert 400 `AVATAR_INVALID_TYPE`.

---

## EC-8: Animated GIF Behavior

**Scenario:** User uploads an animated GIF as their avatar.

**Expected Behavior:** Cloudinary's `f_auto` transformation may convert the GIF to a static WebP frame (first frame). The avatar will not animate.

**Implementation:** Document this as known behavior. If animated avatar support is desired in the future, use `f_gif` instead of `f_auto` for GIF inputs.

**Testing:** Upload an animated GIF. Verify the resulting Cloudinary URL serves a static image. Verify no errors.

---

## EC-9: Network Timeout During Cloudinary Upload

**Scenario:** multer successfully receives the file into memory, but the Cloudinary API upload times out.

**Expected Behavior:** 500 error returned to client. No orphaned asset (upload never completed). Memory buffer is freed.

**Implementation:**
```javascript
// Add timeout to Cloudinary upload
const uploadPromise = cloudinaryService.uploadAvatar(buffer, userId);
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Cloudinary upload timeout')), 30000)
);
const result = await Promise.race([uploadPromise, timeoutPromise]);
```

**Testing:** Mock Cloudinary to never respond. Assert timeout error after 30 seconds.

---

## EC-10: User Account Deleted with Avatar

**Scenario:** Admin deletes a user who has an avatar uploaded to Cloudinary.

**Expected Behavior:** Cloudinary assets are cleaned up. No orphaned images.

**Implementation:** In `adminViewModel.deleteUserOffline`, before deleting the user document:
```javascript
if (user.avatarUrl) {
  await cloudinaryService.deleteAvatar(extractPublicId(user.avatarUrl));
  await cloudinary.api.delete_folder(`todoapp/avatars/${user._id}`);
}
```

**Testing:** Create user with avatar → admin delete user → verify Cloudinary folder is empty.

---

## EC-11: Cloudinary Quota Exceeded

**Scenario:** Cloudinary free plan bandwidth/storage limit is reached.

**Expected Behavior:** Cloudinary returns 420 or similar error. User sees a friendly error message.

**Implementation:** Catch Cloudinary error in `cloudinaryService.uploadAvatar`, check for rate-limit/quota error codes, throw `ProfileViewModelError(503, 'SERVICE_UNAVAILABLE', 'Image service temporarily unavailable')`.

**Testing:** Difficult to test in automated suite. Manual test or mock Cloudinary to return 420.

---

## EC-12: Browser Back Button During Upload

**Scenario:** User triggers upload, then navigates away (back button or link click) before upload completes.

**Expected Behavior:** Upload continues on the server (it's already been sent). Frontend component unmounts. No crash.

**Implementation:**
```javascript
useEffect(() => {
  return () => {
    // Cleanup on unmount
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };
}, []);
```

**Testing:** Start upload → navigate away → return → verify avatar state is consistent (either uploaded or unchanged).

---

## EC-13: OAuth User Without Password

**Scenario:** User logged in via Google/GitHub (no local password) uploads an avatar.

**Expected Behavior:** Works identically to local users. Avatar is independent of auth provider.

**Implementation:** No special handling. `authMiddleware` verifies JWT regardless of provider.

**Testing:** Login via OAuth → upload avatar → verify success.

---

## EC-14: Disabled User Attempts Upload

**Scenario:** Admin disables a user while the user is on the Settings page.

**Expected Behavior:** Next API call (upload) receives 403 from `authMiddleware`.

**Implementation:** Existing `authMiddleware` checks `user.status === 'active'`.

**Testing:** Create user → disable via admin → attempt upload → assert 403.

---

## EC-15: Multiple Tabs Same User

**Scenario:** User has Settings open in two tabs. Uploads avatar in Tab A. Tab B shows old avatar.

**Expected Behavior:** Tab B continues showing old avatar until navigated/refreshed.

**Implementation:** After upload, update `localStorage`. Tab B picks up the change on:
- Next page navigation (reads from localStorage on mount)
- `window.addEventListener('storage', callback)` for cross-tab sync (optional enhancement)

**Testing:** Manual test with two browser tabs.

---

## EC-16: EXIF Orientation

**Scenario:** User uploads a photo taken in portrait mode. EXIF says "rotate 90°". Without handling, image appears sideways.

**Expected Behavior:** Cloudinary automatically reads EXIF orientation and rotates the image correctly.

**Implementation:** No code changes. Cloudinary's transformation pipeline respects EXIF orientation by default.

**Testing:** Upload a portrait-mode photo with EXIF rotation tag. Verify the resulting Cloudinary image is correctly oriented.

---

## EC-17: Zero-Byte File

**Scenario:** User somehow submits an empty file (0 bytes).

**Expected Behavior:** Rejected with 400 error.

**Implementation:**
```javascript
if (!req.file.buffer || req.file.buffer.length === 0) {
  throw new ProfileViewModelError(400, 'AVATAR_FILE_REQUIRED', 'File is empty');
}
```

**Testing:** Send multipart request with empty file content. Assert 400.

---

## EC-18: Renamed Non-Image File

**Scenario:** User renames `malware.exe` to `photo.jpg` and uploads it.

**Expected Behavior:** Rejected at magic bytes validation. The file starts with `MZ` (PE executable header), not `FF D8 FF` (JPEG).

**Implementation:** Two-layer defense:
1. multer `fileFilter` checks `Content-Type` header (may be spoofed by renaming)
2. `validateImageBuffer()` checks actual file bytes (catches the spoof)

**Testing:** Rename a non-image file to `.jpg`. Assert rejection.

---

## EC-19: CDN Cache After Avatar Replace

**Scenario:** User replaces avatar. Old image is cached at Cloudinary CDN edge servers. Visitors see the old image.

**Expected Behavior:** New image is served immediately after replace.

**Implementation:** Using `overwrite: true` + `invalidate: true` in Cloudinary upload options forces CDN cache invalidation. Additionally, the version number in the URL changes, creating a cache-busting effect.

**Testing:** Upload → note URL → replace → verify new URL has different version stamp → fetch new URL → verify new image content.
