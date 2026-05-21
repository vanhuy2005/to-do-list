# Upload Profile Image — Database Design

## 1. Current Schema Analysis

The `User` model at `src/models/User.js` **already includes** the `avatarUrl` field:

```javascript
avatarUrl: { type: String, default: null }
```

**No schema migration is required.** The field exists with the correct type and a sensible default (`null` indicates no avatar, which triggers the initials fallback on the frontend).

---

## 2. avatarUrl Field Specification

| Property | Value |
|---|---|
| **Field name** | `avatarUrl` |
| **Type** | `String` |
| **Default** | `null` |
| **Required** | No |
| **Example value** | `https://res.cloudinary.com/ddnauyhho/image/upload/v1716300000/todoapp/avatars/665a1b2c3d4e5f6a7b8c9d0e/avatar.jpg` |
| **Max length** | ~200 characters (Cloudinary URLs are deterministic in length) |
| **Indexing** | None — `avatarUrl` is not used in any query `WHERE` clause |

### URL Structure Breakdown

```
https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{folder}/{public_id}.{format}
                            ▲                         ▲        ▲         ▲           ▲
                            │                         │        │         │           │
                         ddnauyhho              auto-generated │      avatar      auto
                                                            todoapp/
                                                            avatars/
                                                            {userId}
```

---

## 3. Public ID Extraction Pattern

When deleting or replacing an avatar, the backend must extract the Cloudinary `public_id` from the stored URL. Pattern:

```javascript
/**
 * Extract Cloudinary public_id from a secure_url.
 *
 * Input:  https://res.cloudinary.com/ddnauyhho/image/upload/v1716300000/todoapp/avatars/665a1b2c/avatar.jpg
 * Output: todoapp/avatars/665a1b2c/avatar
 */
function extractPublicId(url) {
  // Match everything after /upload/v{digits}/ and before the file extension
  const match = url.match(/\/upload\/v\d+\/(.+)\.\w+$/);
  return match ? match[1] : null;
}
```

**Note:** Because we use a fixed `public_id: 'avatar'` with `overwrite: true`, the public_id will always be `todoapp/avatars/{userId}/avatar`. However, the extraction function is generic for robustness.

---

## 4. Data Lifecycle

```
State 1: New user (no avatar)
  User.avatarUrl = null
  Frontend renders: initials fallback (first letters of displayName)

State 2: User uploads avatar
  User.avatarUrl = "https://res.cloudinary.com/.../todoapp/avatars/{userId}/avatar.jpg"
  Frontend renders: <img src={avatarUrl}>

State 3: User replaces avatar
  Old Cloudinary asset deleted (or overwritten via public_id)
  User.avatarUrl = "https://res.cloudinary.com/.../todoapp/avatars/{userId}/avatar.webp"
  (URL changes because version stamp changes, and f_auto may select different format)
  Frontend renders: new <img src={avatarUrl}>

State 4: User deletes avatar
  Cloudinary asset destroyed
  User.avatarUrl = null
  Frontend renders: initials fallback (same as State 1)
```

---

## 5. Audit Logging

Avatar changes are recorded in the existing `AuditLog` model:

### Upload Avatar

```javascript
await AuditLog.create({
  actorId: userId,
  targetId: null,
  action: 'user.avatar.upload',
  entityType: 'user',
  entityId: userId,
  summaryBefore: { avatarUrl: oldAvatarUrl },  // null for first upload
  summaryAfter:  { avatarUrl: newAvatarUrl },
});
```

### Delete Avatar

```javascript
await AuditLog.create({
  actorId: userId,
  targetId: null,
  action: 'user.avatar.delete',
  entityType: 'user',
  entityId: userId,
  summaryBefore: { avatarUrl: oldAvatarUrl },
  summaryAfter:  { avatarUrl: null },
});
```

### Replace Avatar

Same as upload — `summaryBefore` captures the old URL, `summaryAfter` captures the new URL.

**Retention:** AuditLog entries auto-expire after 30 days via the existing TTL index on `createdAt`.

---

## 6. Indexes

**No new indexes required.** The `avatarUrl` field is:
- Never queried directly (no `find({ avatarUrl: ... })`)
- Only read via `User.findById()` (uses the default `_id` index)
- Only updated via `User.findByIdAndUpdate()` (uses the default `_id` index)

Existing indexes are sufficient:
- `{ email: 1 }` unique — for login/registration (unchanged)
- `_id` — for profile read/update (unchanged)

---

## 7. Schema-Level Validation

Add a URL format validator to the `avatarUrl` field (optional enhancement — Cloudinary always returns valid URLs, but defense-in-depth):

```javascript
avatarUrl: {
  type: String,
  default: null,
  validate: {
    validator: function(v) {
      if (v === null || v === undefined) return true;
      return /^https:\/\/res\.cloudinary\.com\/.+/.test(v);
    },
    message: 'avatarUrl must be a valid Cloudinary URL',
  },
},
```

**Rationale:** This prevents accidental or malicious writes of arbitrary URLs into the field. Only Cloudinary CDN URLs are accepted.

---

## 8. Backup and Recovery

| Concern | Approach |
|---|---|
| **MongoDB backup** | Regular `mongodump` includes the `avatarUrl` field. Restoring a backup restores the URL pointers. |
| **Cloudinary assets** | Cloudinary has its own backup/media library. Assets are not lost if MongoDB is restored to a prior state (URL still points to valid asset). |
| **Orphaned assets** | If MongoDB is restored to before an upload, the Cloudinary asset becomes orphaned. Implement a periodic cleanup job (future enhancement): query Cloudinary folder, compare against DB URLs, delete unmatched assets. |
| **Data loss** | If Cloudinary deletes an asset, the `avatarUrl` in MongoDB becomes a dead link → frontend shows broken image → initials fallback via `AvatarFallback` component handles this gracefully. |

---

## 9. Migration Plan

### No Migration Required

The `avatarUrl` field already exists in the User schema with `default: null`. All existing users already have `avatarUrl: null` (or the field is absent, which Mongoose treats as `null`).

**Verification query (run once to confirm):**

```javascript
// Should return count of all users
const count = await User.countDocuments({ avatarUrl: null });
console.log(`Users without avatar: ${count}`);
```

---

## 10. Storage Considerations

| Data | Storage Location | Size per User |
|---|---|---|
| `avatarUrl` (string) | MongoDB User document | ~150 bytes |
| Image binary (original) | Cloudinary | 100 KB – 5 MB |
| Image binary (400×400 primary) | Cloudinary CDN | ~20–80 KB (auto-quality) |
| Image binary (200×200 medium) | Cloudinary CDN | ~10–30 KB |
| Image binary (80×80 small) | Cloudinary CDN | ~3–10 KB |

**MongoDB impact:** Negligible — a single string field.

**Cloudinary impact:** With eager transformations, each user stores ~4 variants. At 1,000 users with avatars: ~200–400 MB total Cloudinary storage. Well within free/pro plan limits.

---

## 11. GDPR / Data Deletion

When a user account is deleted (via `adminViewModel.deleteUserOffline`), the following **must** occur:

1. **Extract `avatarUrl`** from the user document before deletion.
2. **Delete Cloudinary asset:** Call `cloudinaryService.deleteAvatar(publicId)`.
3. **Delete entire folder:** Call `cloudinary.api.delete_resources_by_prefix('todoapp/avatars/{userId}/')` to ensure all eager variants and any orphaned assets are cleaned up.
4. **Proceed with user deletion** in MongoDB.

```javascript
// In adminViewModel.deleteUserOffline:
if (user.avatarUrl) {
  try {
    const publicId = cloudinaryService.extractPublicId(user.avatarUrl);
    await cloudinaryService.deleteAvatar(publicId);
    // Also clean up the entire user folder
    await cloudinary.api.delete_resources_by_prefix(`todoapp/avatars/${user._id}/`);
    await cloudinary.api.delete_folder(`todoapp/avatars/${user._id}`);
  } catch (err) {
    console.error(`Failed to clean up Cloudinary assets for user ${user._id}:`, err);
    // Non-blocking: proceed with user deletion even if Cloudinary cleanup fails
  }
}
```

**Best-effort deletion:** If Cloudinary cleanup fails, log the error but do not block user deletion. Orphaned assets can be cleaned manually or via a scheduled job.
