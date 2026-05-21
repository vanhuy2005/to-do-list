# Upload Profile Image — Security

## 1. Authentication & Authorization

| Control | Implementation | Detail |
|---|---|---|
| **Authentication** | `authMiddleware` (existing) | Verifies JWT Bearer token, fetches full User from DB, checks `status !== 'disabled'`, attaches `req.user` and `req.userId` |
| **Authorization** | `requireRole('user')` (existing) | Only users with `role: 'user'` can manage avatars. Admins manage via admin panel (separate flow) |
| **Ownership** | Implicit via `req.userId` | Users can only upload/delete their own avatar — no `:userId` param in the route. The authenticated user's ID is used directly |

**No cross-user access is possible.** The `req.userId` comes from the verified JWT, not from user input.

---

## 2. File Upload Security

### 2a. MIME Type Validation (Two Layers)

**Layer 1 — multer `fileFilter` (Content-Type header):**
```javascript
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
// Rejects files with non-whitelisted Content-Type before buffering
```

**Layer 2 — Magic bytes validation (buffer content):**
```javascript
// After multer buffers the file, inspect the first bytes
JPEG: [0xFF, 0xD8, 0xFF]
PNG:  [0x89, 0x50, 0x4E, 0x47]  (‰PNG)
GIF:  [0x47, 0x49, 0x46]        (GIF)
WebP: RIFF....WEBP               (bytes 0-3 + 8-11)
```

**Why both?** An attacker can send a malicious file (e.g., PHP webshell, HTML with XSS) with a spoofed `Content-Type: image/jpeg` header. Magic bytes validation catches this because the actual file content won't match the JPEG signature.

### 2b. File Size Enforcement

| Layer | Limit | Behavior |
|---|---|---|
| multer `limits.fileSize` | 5 MB (5,242,880 bytes) | Aborts upload mid-stream, emits `LIMIT_FILE_SIZE` error |
| Cloudinary upload | Inherits from multer (buffer already capped) | Secondary defense; Cloudinary free plan allows up to 10 MB |
| Frontend validation | 5 MB check before XHR | Prevents wasted bandwidth on obviously oversized files |
| Reverse proxy (nginx) | `client_max_body_size 10m` | Should be ≥ 5 MB to allow the request through |

### 2c. Filename Safety

- **No user-controlled filenames on disk.** multer uses memory storage — the file never touches the filesystem.
- **No directory traversal risk.** The Cloudinary `public_id` is server-generated: `todoapp/avatars/{userId}/avatar`. The user has no control over the storage path.
- **Original filename ignored.** `req.file.originalname` is not used in any storage path or Cloudinary metadata.

### 2d. Image Re-encoding

Cloudinary automatically **re-encodes** uploaded images during transformation. This:
- Strips embedded scripts (e.g., JavaScript in SVG, polyglot files)
- Removes EXIF metadata (see §5 below)
- Eliminates steganographic payloads
- Normalizes the image to a standard format

### 2e. Buffer Validation

Before sending to Cloudinary, validate the buffer is non-empty:
```javascript
if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
  throw new ProfileViewModelError(400, 'AVATAR_FILE_REQUIRED', 'No image file provided');
}
```

---

## 3. Abuse Prevention

### 3a. Rate Limiting

```javascript
// Dedicated rate limiter for avatar endpoints
const avatarRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 10,                     // 10 uploads per hour per user
  keyGenerator: (req) => req.userId,
  standardHeaders: true,
  legacyHeaders: false,
});
```

**Why per-user?** IP-based rate limiting is ineffective for authenticated endpoints. A single user abusing the upload from different IPs should still be rate-limited.

### 3b. Upload Cooldown

Implement a minimum 5-second cooldown between uploads:

```javascript
// In profileViewModel.uploadAvatar:
const lastUploadLog = await AuditLog.findOne({
  actorId: userId,
  action: 'user.avatar.upload',
  createdAt: { $gte: new Date(Date.now() - 5000) },
});
if (lastUploadLog) {
  throw new ProfileViewModelError(429, 'AVATAR_COOLDOWN', 'Please wait before uploading again');
}
```

### 3c. Disabled User Blocking

The existing `authMiddleware` checks `user.status === 'active'`. Disabled users receive `403 FORBIDDEN` before reaching the avatar handler.

### 3d. File Size Abuse

Memory storage means each upload consumes server RAM. With the 5 MB limit and `max: 10` rate limit, the worst case is 50 MB per user per hour. For 100 concurrent abusers: 5 GB peak — manageable but worth monitoring.

---

## 4. Content Safety

### 4a. SVG Rejection

SVG files are **not in the MIME whitelist** (`image/svg+xml` is excluded). SVGs can contain:
- `<script>` tags (XSS)
- `<foreignObject>` with embedded HTML
- External resource references (`xlink:href`)

**Decision:** SVG is blocked entirely. This is the safest approach.

### 4b. Cloudinary Moderation (Future Enhancement)

Cloudinary offers add-on moderation services:
- **AWS Rekognition** — nudity/violence detection
- **Google Vision Safe Search** — broader content moderation

Implementation (when needed):
```javascript
const uploadOptions = {
  // ... existing options
  moderation: 'aws_rek',  // or 'google_video_moderation'
};
```

Flagged images would be rejected with a `AVATAR_CONTENT_REJECTED` error code.

---

## 5. Data Privacy

### 5a. EXIF Stripping

Cloudinary automatically strips EXIF metadata during image transformation. This prevents exposure of:
- GPS coordinates (location data)
- Camera serial number
- Date/time stamps
- Device identifiers

No additional configuration needed — Cloudinary's transformation pipeline handles this.

### 5b. URL Unguessability

Cloudinary URLs include:
- Cloud name (public, but needed to construct URLs)
- Folder path with user's MongoDB `_id` (not sequential, 24-character hex ObjectId)
- Version number (timestamp-based)

While technically public, the URLs are **not enumerable** — an attacker would need to know the exact user ID and version to construct a valid URL.

### 5c. GDPR Compliance

| Requirement | Implementation |
|---|---|
| **Right to access** | `GET /profile` returns `avatarUrl` — user can see their own avatar |
| **Right to deletion** | `DELETE /profile/avatar` removes the image. Account deletion triggers full Cloudinary cleanup (see database.md §11) |
| **Data minimization** | Only the URL is stored in MongoDB. No additional metadata (original filename, upload IP, etc.) is persisted |
| **Consent** | User explicitly uploads the image (opt-in action). No automatic avatar harvesting |

### 5d. No PII in Cloudinary Metadata

The Cloudinary upload does not include:
- User email
- Display name
- IP address
- Any form of PII in tags, context, or metadata fields

Only the `userId` appears in the folder path (as an opaque ObjectId).

---

## 6. Infrastructure Security

### 6a. Server-Side Only

All Cloudinary uploads are **server-side** (signed). The API key and secret never reach the client:

```
Frontend → POST /api/v1/profile/avatar (multipart) → Express → Cloudinary API
                                                        ▲
                                                   API key/secret
                                                   from process.env
```

**No unsigned uploads.** The Cloudinary SDK authenticates every upload with the API secret.

### 6b. Credential Storage

| Credential | Location | Access |
|---|---|---|
| `CLOUDINARY_API_KEY` | `.env` file (server only) | `config/env.js` exports |
| `CLOUDINARY_API_SECRET` | `.env` file (server only) | `config/env.js` exports |
| `CLOUD_NAME` | `.env` file (server only) | `config/env.js` exports |

`.env` is in `.gitignore` — credentials are never committed to version control.

### 6c. API Key Rotation

If a Cloudinary API key is compromised:
1. Generate new key in Cloudinary dashboard
2. Update `.env` on server
3. Restart server
4. Existing assets remain accessible (assets are public once uploaded)
5. Old key can be revoked in Cloudinary dashboard

---

## 7. Audit Trail

All avatar operations are logged in the existing `AuditLog` collection:

| Action | Logged Data | Retention |
|---|---|---|
| `user.avatar.upload` | `summaryBefore: { avatarUrl: oldUrl }`, `summaryAfter: { avatarUrl: newUrl }` | 30 days (TTL) |
| `user.avatar.delete` | `summaryBefore: { avatarUrl: oldUrl }`, `summaryAfter: { avatarUrl: null }` | 30 days (TTL) |

This provides:
- **Forensic trail** — who uploaded what and when
- **Abuse detection** — rapid upload/delete cycles visible in audit logs
- **Compliance** — evidence of user-initiated data changes

---

## 8. XSS Prevention

### 8a. Image Rendering

The `avatarUrl` is always a Cloudinary CDN URL (`https://res.cloudinary.com/...`). The frontend renders it via:

```jsx
<AvatarImage src={avatarUrl} alt={`${displayName} avatar`} />
```

This is a standard `<img>` tag — no `dangerouslySetInnerHTML`, no script execution context.

### 8b. Content-Security-Policy (CSP)

If CSP headers are implemented (via `helmet` — installed but not yet used), add Cloudinary to the `img-src` directive:

```
Content-Security-Policy: img-src 'self' https://res.cloudinary.com;
```

### 8c. URL Validation

Before rendering an avatar, the frontend can validate the URL prefix:

```javascript
const isValidAvatarUrl = (url) => {
  if (!url) return false;
  return url.startsWith('https://res.cloudinary.com/');
};
```

This prevents rendering arbitrary URLs if the database were somehow compromised.
