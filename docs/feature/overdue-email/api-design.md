# Overdue Task Email Notification — API Design

## Base URL

```
http://localhost:5001/api/v1
```

All endpoints require authentication via `Authorization: Bearer <access_token>` unless otherwise noted.

---

## Endpoints

### GET `/profile/notifications/preferences` — Get Notification Preferences

**Authentication:** Required (JWT Bearer)
**Authorization:** `requireRole('user')`

#### Success Response — `200 OK`

```json
{
  "success": true,
  "data": {
    "emailOverdue": true,
    "emailDigest": true,
    "digestHour": 8,
    "timezone": "Asia/Ho_Chi_Minh"
  }
}
```

#### curl Example

```bash
curl -X GET http://localhost:5001/api/v1/profile/notifications/preferences \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### PUT `/profile/notifications/preferences` — Update Notification Preferences

**Authentication:** Required (JWT Bearer)
**Authorization:** `requireRole('user')`

#### Request Body

All fields are optional — only provided fields are updated (partial update).

```json
{
  "emailOverdue": false,
  "emailDigest": true,
  "digestHour": 9,
  "timezone": "Asia/Bangkok"
}
```

| Field | Type | Constraints |
|---|---|---|
| `emailOverdue` | Boolean | — |
| `emailDigest` | Boolean | — |
| `digestHour` | Number | Integer, 0–23 |
| `timezone` | String | Valid IANA timezone (validated via `Intl.DateTimeFormat`) |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "data": {
    "emailOverdue": false,
    "emailDigest": true,
    "digestHour": 9,
    "timezone": "Asia/Bangkok"
  },
  "message": "Notification preferences updated"
}
```

#### Error Responses

| Status | Error Code | Condition |
|---|---|---|
| `400` | `INVALID_DIGEST_HOUR` | `digestHour` not an integer or not in 0–23 |
| `400` | `INVALID_TIMEZONE` | `timezone` not a valid IANA timezone string |
| `400` | `INVALID_PREFERENCES` | Request body is empty or contains unknown fields |
| `401` | `UNAUTHORIZED` | Missing or invalid token |

```json
{
  "success": false,
  "error": {
    "code": "INVALID_DIGEST_HOUR",
    "message": "Digest hour must be an integer between 0 and 23"
  }
}
```

#### curl Example

```bash
curl -X PUT http://localhost:5001/api/v1/profile/notifications/preferences \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"emailOverdue": true, "digestHour": 9}'
```

#### Behavior

- Partial update: only provided fields are modified; others remain unchanged.
- Creates an `AuditLog` entry: `action: 'user.notifications.preferences.update'`
- If `emailOverdue` changes from `true` to `false`, sets `unsubscribedAt` to current time.
- If `emailOverdue` changes from `false` to `true`, clears `unsubscribedAt`.

---

### POST `/profile/notifications/unsubscribe` — Unsubscribe from Emails

**Authentication:** Token-based (HMAC unsubscribe token, NOT JWT). This endpoint is accessed from email links without requiring login.

#### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `userId` | String | ✅ | MongoDB ObjectId of the user |
| `token` | String | ✅ | HMAC-SHA256 unsubscribe token |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Unsubscribed successfully"
}
```

#### Error Responses

| Status | Error Code | Condition |
|---|---|---|
| `400` | `INVALID_UNSUBSCRIBE_TOKEN` | Token is missing, malformed, or doesn't match |
| `400` | `INVALID_USER_ID` | userId is missing or not a valid ObjectId |
| `404` | `USER_NOT_FOUND` | No user with this ID exists |

#### Behavior

- Verifies the HMAC token: `HMAC-SHA256(userId + ':unsubscribe', JWT_SECRET)`
- Sets `notificationPreferences.emailOverdue = false`, `notificationPreferences.emailDigest = false`
- Sets `notificationPreferences.unsubscribedAt = new Date()`
- Creates `AuditLog` entry: `action: 'user.notifications.unsubscribe'`
- Does NOT require the user to be logged in

#### HMAC Token Generation

```javascript
import crypto from 'crypto';

function generateUnsubscribeToken(userId) {
  return crypto
    .createHmac('sha256', process.env.JWT_SECRET)
    .update(`${userId}:unsubscribe`)
    .digest('hex');
}

function verifyUnsubscribeToken(userId, token) {
  const expected = generateUnsubscribeToken(userId);
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
```

**Security:** Uses `timingSafeEqual` to prevent timing attacks. The token is deterministic (same user always gets the same token), which means:
- No storage needed (stateless verification)
- Re-subscribing and clicking an old unsubscribe link works (token is still valid)
- Token rotates when `JWT_SECRET` rotates

#### curl Example

```bash
curl -X POST "http://localhost:5001/api/v1/profile/notifications/unsubscribe?userId=665a1b2c3d4e5f6a7b8c9d0e&token=a1b2c3d4e5f6..."
```

---

### GET `/profile/notifications/history` — Notification History

**Authentication:** Required (JWT Bearer)
**Authorization:** `requireRole('user')`

#### Query Parameters

| Param | Type | Default | Constraints |
|---|---|---|---|
| `page` | Number | 1 | ≥ 1 |
| `limit` | Number | 20 | 1–50 |
| `type` | String | — | Optional filter: `'overdue_single'` or `'overdue_digest'` |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "665b2c3d4e5f6a7b8c9d0e1f",
        "type": "overdue_single",
        "status": "sent",
        "taskSnapshot": {
          "title": "Hoàn thành báo cáo",
          "priority": "high",
          "dueDate": "2026-05-20T17:00:00.000Z"
        },
        "createdAt": "2026-05-21T00:15:00.000Z"
      },
      {
        "_id": "665b3d4e5f6a7b8c9d0e1f20",
        "type": "overdue_digest",
        "status": "sent",
        "taskSnapshot": null,
        "createdAt": "2026-05-21T01:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42,
      "totalPages": 3
    }
  }
}
```

#### curl Example

```bash
curl -X GET "http://localhost:5001/api/v1/profile/notifications/history?page=1&limit=10&type=overdue_single" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## Internal API (Not Exposed via HTTP)

These methods are called by the cron jobs, not by HTTP endpoints:

### `emailService.sendOverdueNotification(user, task)`

```javascript
/**
 * @param {Object} user - { _id, email, displayName, preferredLanguage }
 * @param {Object} task - { _id, title, priority, dueDate, description }
 * @returns {Promise<{ messageId: string }>}
 * @throws {Error} on Resend API failure
 */
```

### `emailService.sendOverdueDigest(user, tasks)`

```javascript
/**
 * @param {Object} user - { _id, email, displayName, preferredLanguage }
 * @param {Array<Object>} tasks - [{ _id, title, priority, dueDate }]
 * @returns {Promise<{ messageId: string }>}
 * @throws {Error} on Resend API failure
 */
```

---

## Future: Webhook Endpoint

### POST `/webhooks/resend` — Resend Event Webhook (Future)

**Purpose:** Receive delivery events (bounce, complaint, delivery) from Resend.

**Authentication:** Resend webhook signature verification (not JWT).

**When to implement:** After deploying to a public URL where Resend can reach the webhook endpoint. Not needed for localhost development.

```javascript
// Future implementation
router.post('/webhooks/resend', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['resend-signature'];
  // Verify signature → process event → update NotificationLog
});
```

---

## Rate Limiting

| Endpoint | Limit | Window | Key |
|---|---|---|---|
| `GET /profile/notifications/preferences` | 30 req | 1 minute | userId |
| `PUT /profile/notifications/preferences` | 10 req | 1 minute | userId |
| `POST /profile/notifications/unsubscribe` | 5 req | 1 minute | IP |
| `GET /profile/notifications/history` | 30 req | 1 minute | userId |

The unsubscribe endpoint uses IP-based rate limiting since it doesn't require authentication.

---

## Pagination Pattern

The notification history endpoint follows the same pagination pattern used by the existing task list API:

```javascript
const page = Math.max(1, parseInt(req.query.page) || 1);
const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
const skip = (page - 1) * limit;

const [notifications, total] = await Promise.all([
  NotificationLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  NotificationLog.countDocuments(filter),
]);

const totalPages = Math.ceil(total / limit);
```
