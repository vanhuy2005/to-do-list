# Upload Profile Image — API Design

## Base URL

```
http://localhost:5001/api/v1
```

All endpoints require authentication via `Authorization: Bearer <access_token>` header unless otherwise noted.

---

## Endpoints

### POST `/profile/avatar` — Upload or Replace Avatar

Upload a new avatar image or replace the existing one.

**Authentication:** Required (JWT Bearer token)
**Authorization:** `requireRole('user')`
**Content-Type:** `multipart/form-data`

#### Request

| Field | Type | Required | Constraints |
|---|---|---|---|
| `avatar` | File | ✅ | Max 5 MB. Allowed MIME: `image/jpeg`, `image/png`, `image/webp`, `image/gif` |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "data": {
    "avatarUrl": "https://res.cloudinary.com/ddnauyhho/image/upload/v1716300000/todoapp/avatars/665a1b2c3d4e5f6a7b8c9d0e/avatar.jpg",
    "thumbnails": {
      "small": "https://res.cloudinary.com/ddnauyhho/image/upload/c_fill,f_auto,g_face,h_80,q_auto,w_80/v1716300000/todoapp/avatars/665a1b2c3d4e5f6a7b8c9d0e/avatar.jpg",
      "medium": "https://res.cloudinary.com/ddnauyhho/image/upload/c_fill,f_auto,g_face,h_200,q_auto,w_200/v1716300000/todoapp/avatars/665a1b2c3d4e5f6a7b8c9d0e/avatar.jpg"
    }
  },
  "message": "Avatar uploaded successfully"
}
```

#### Error Responses

| Status | Error Code | Condition | Message |
|---|---|---|---|
| `400` | `AVATAR_FILE_REQUIRED` | No file in request | `No image file provided` |
| `400` | `AVATAR_INVALID_TYPE` | Invalid MIME type or magic bytes mismatch | `Invalid image format. Allowed: JPEG, PNG, WebP, GIF` |
| `400` | `AVATAR_FILE_TOO_LARGE` | File exceeds 5 MB | `Image must not exceed 5MB` |
| `401` | `UNAUTHORIZED` | Missing or invalid token | `Authentication required` |
| `403` | `FORBIDDEN` | User is disabled | `Account is disabled` |
| `500` | `AVATAR_UPLOAD_FAILED` | Cloudinary or DB error | `Failed to upload avatar. Please try again` |

```json
{
  "success": false,
  "error": {
    "code": "AVATAR_INVALID_TYPE",
    "message": "Invalid image format. Allowed: JPEG, PNG, WebP, GIF"
  }
}
```

#### Behavior

- If the user already has an `avatarUrl`, the old Cloudinary asset is deleted before uploading the new one.
- Cloudinary applies face-aware cropping to 400×400 with eager thumbnails at 80×80 and 200×200.
- An `AuditLog` entry is created with `action: 'user.avatar.upload'`.

#### curl Example

```bash
curl -X POST http://localhost:5001/api/v1/profile/avatar \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -F "avatar=@/path/to/photo.jpg"
```

---

### DELETE `/profile/avatar` — Remove Avatar

Remove the user's current avatar image.

**Authentication:** Required (JWT Bearer token)
**Authorization:** `requireRole('user')`
**Content-Type:** Not required (no body)

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Avatar removed successfully"
}
```

#### Error Responses

| Status | Error Code | Condition | Message |
|---|---|---|---|
| `400` | `AVATAR_NOT_FOUND` | User has no avatar (`avatarUrl` is null) | `No avatar to delete` |
| `401` | `UNAUTHORIZED` | Missing or invalid token | `Authentication required` |
| `403` | `FORBIDDEN` | User is disabled | `Account is disabled` |
| `500` | `AVATAR_DELETE_FAILED` | Cloudinary or DB error | `Failed to delete avatar. Please try again` |

#### Behavior

- Extracts the Cloudinary `public_id` from the stored `avatarUrl`.
- Deletes the asset from Cloudinary (including eager-generated thumbnails).
- Sets `User.avatarUrl = null` in MongoDB.
- Creates an `AuditLog` entry with `action: 'user.avatar.delete'`.

#### curl Example

```bash
curl -X DELETE http://localhost:5001/api/v1/profile/avatar \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## Integration with Existing Endpoints

### GET `/profile` — No Changes Required

The existing `getProfile` endpoint already returns the full user object which includes `avatarUrl`. After an avatar upload, subsequent calls to `GET /profile` will include the new URL:

```json
{
  "success": true,
  "data": {
    "_id": "665a1b2c3d4e5f6a7b8c9d0e",
    "email": "user@example.com",
    "displayName": "Nguyễn Văn Huy",
    "avatarUrl": "https://res.cloudinary.com/ddnauyhho/image/upload/...",
    "role": "user",
    "preferredLanguage": "vi",
    "themePreference": "light",
    "createdAt": "2026-05-01T00:00:00.000Z"
  }
}
```

---

## Rate Limiting

Avatar upload is a write-heavy operation with external API calls (Cloudinary). Apply dedicated rate limiting:

| Endpoint | Limit | Window | Rationale |
|---|---|---|---|
| `POST /profile/avatar` | 10 requests | 1 hour | Prevents abuse; normal usage is 1-2 uploads per session |
| `DELETE /profile/avatar` | 10 requests | 1 hour | Same limit as upload |

Implementation: Use `express-rate-limit` (already installed) with a per-user key extractor:

```javascript
import rateLimit from 'express-rate-limit';

export const avatarRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  keyGenerator: (req) => req.userId,
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many avatar uploads. Try again later.' } },
});
```

---

## Idempotency

- **Upload:** Not idempotent — each call generates a new Cloudinary version. However, using a fixed `public_id` with `overwrite: true` means the outcome is consistent (only one avatar exists per user).
- **Delete:** Idempotent — deleting when no avatar exists returns `400 AVATAR_NOT_FOUND` (not a server error). Calling delete twice after an upload: first succeeds, second returns 400.

---

## Multipart Form Data Handling

The `multipart/form-data` content type is required for file uploads. Key considerations:

1. **Axios default behavior:** The frontend `axios` instance sets `Content-Type: application/json` via interceptor. For file uploads, the frontend must explicitly create a `FormData` object — axios auto-sets `Content-Type: multipart/form-data` with the correct boundary when given `FormData`.

2. **Express body parser:** `express.json()` and `express.urlencoded()` do not conflict with `multer` — multer handles multipart parsing before body parsers.

3. **Body size limit:** `express.json({ limit: '10mb' })` in `server.js` does not apply to multipart uploads. multer's own `limits.fileSize` governs file size.

---

## CORS

The existing CORS configuration in `server.js` already allows requests from the frontend origins. No changes needed:

```javascript
cors({
  origin: process.env.CORS_ORIGIN?.split(','), // includes http://localhost:5173
  credentials: true,
})
```

Multipart uploads use standard `POST` with `Content-Type: multipart/form-data` — no preflight CORS issue beyond what's already handled.

---

## API Versioning

Both new endpoints live under `/api/v1/profile/`, consistent with the existing versioning scheme. No versioning changes required.
