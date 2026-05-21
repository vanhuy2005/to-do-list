# Overdue Task Email Notification — Security

## 1. Authentication & Authorization

### Notification Preferences Endpoints

| Endpoint | Auth | Authorization |
|---|---|---|
| `GET /profile/notifications/preferences` | JWT Bearer | `authMiddleware` + `requireRole('user')` |
| `PUT /profile/notifications/preferences` | JWT Bearer | `authMiddleware` + `requireRole('user')` |
| `GET /profile/notifications/history` | JWT Bearer | `authMiddleware` + `requireRole('user')` |

Users can only access and modify **their own** preferences. `req.userId` from the JWT is used directly — no user ID parameter in the URL.

### Unsubscribe Endpoint

| Endpoint | Auth | Verification |
|---|---|---|
| `POST /profile/notifications/unsubscribe` | HMAC Token (NOT JWT) | Stateless token verification |

**Why not JWT?** The unsubscribe link is clicked from an email client. Requiring a JWT would force the user to log in first, which is terrible UX and violates email best practices (RFC 8058 requires one-click unsubscribe).

### Cron Job

The cron job runs within the server process. It is not triggered via HTTP and has no authentication surface. It accesses the database directly with system-level permissions.

---

## 2. Email Security

### Sender Authentication

| Protocol | Status | Detail |
|---|---|---|
| **SPF** | Configured via Resend | Resend publishes SPF records for their sending domains |
| **DKIM** | Configured via Resend | Resend signs all emails with DKIM keys |
| **DMARC** | Configured via Resend | Resend supports DMARC alignment |

When using Resend's default domain (`onboarding@resend.dev`), these are pre-configured. When using a custom domain, SPF/DKIM/DMARC must be configured in DNS.

### No Sensitive Data in Emails

| Data Category | In Email? | Rationale |
|---|---|---|
| User password | ❌ Never | — |
| JWT tokens | ❌ Never | — |
| API keys | ❌ Never | — |
| Task title | ✅ Yes | Necessary for the notification to be useful. User acknowledges this by enabling notifications. |
| Task description | ❌ No | Only title included — minimizes exposure |
| User display name | ✅ Yes | Personalization ("Chào Huy,") |
| User email | ✅ In headers | Required for delivery (the `to` field) |
| Unsubscribe token | ✅ In URL | HMAC-based, can only be used to unsubscribe (not for auth or data access) |

### HTML Email Content Safety

Task titles are **text-escaped** before insertion into email HTML. No user-controlled content is inserted as raw HTML:

```javascript
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// In template:
const html = `<td>${escapeHtml(task.title)}</td>`;
// NOT: const html = `<td>${task.title}</td>`; // XSS vulnerability
```

---

## 3. Unsubscribe Token Security

### Token Generation

```javascript
import crypto from 'crypto';

function generateUnsubscribeToken(userId) {
  return crypto
    .createHmac('sha256', process.env.JWT_SECRET)
    .update(`${userId}:unsubscribe`)
    .digest('hex');
}
```

### Security Properties

| Property | Detail |
|---|---|
| **Algorithm** | HMAC-SHA256 — cryptographically secure |
| **Key** | `JWT_SECRET` from environment — never exposed |
| **Payload** | `{userId}:unsubscribe` — deterministic for each user |
| **Stateless** | No database storage needed. Verified by recomputing. |
| **Single-purpose** | Token can ONLY be used to unsubscribe. Cannot be used for authentication, data access, or any other action. |
| **Timing-safe comparison** | `crypto.timingSafeEqual()` prevents timing side-channel attacks |
| **Rotation** | Token automatically changes when `JWT_SECRET` is rotated. Old tokens become invalid. |
| **Non-guessable** | HMAC output is 64 hex characters (256 bits of entropy). Brute-force is infeasible. |

### One-Click Unsubscribe (RFC 8058)

Emails include the `List-Unsubscribe` and `List-Unsubscribe-Post` headers:

```
List-Unsubscribe: <https://app.example.com/api/v1/profile/notifications/unsubscribe?userId=X&token=Y>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

This allows email clients (Gmail, Apple Mail, etc.) to show a native "Unsubscribe" button in the email UI, improving user experience and reducing spam complaints.

---

## 4. Abuse Prevention

### Email Rate Limiting

| Control | Value | Rationale |
|---|---|---|
| **Max emails per user per 24h** | ~4 (1 individual + 1 digest + 2 retries max) | Natural limit from cron frequency and dedup |
| **Cron batch size** | 50 tasks per cycle | Prevents overwhelming Resend API |
| **Inter-email delay** | 100ms between sends in a cycle | Respects Resend rate limits |
| **Resend API rate limit** | 2 req/sec (free), 100 req/sec (pro) | Monitored in cron logs |

### Deduplication as Abuse Prevention

The `NotificationLog` with compound index prevents:
- Sending the same overdue email more than once per 24 hours per task
- Sending duplicate digests in the same day
- Concurrent cron executions sending duplicates (atomic upsert)

### Disabled Users

```javascript
// In cron job, filter out disabled users:
if (user.status !== 'active') continue;
```

Disabled users are blocked at two levels:
1. `authMiddleware` prevents them from accessing preference endpoints
2. Cron job skips them entirely

### Bounce Handling (Future)

When Resend webhook integration is implemented:

```javascript
// After 3 consecutive bounces for the same user:
if (consecutiveBounces >= 3) {
  await User.findByIdAndUpdate(userId, {
    'notificationPreferences.emailOverdue': false,
    'notificationPreferences.emailDigest': false,
    'notificationPreferences.unsubscribedAt': new Date(),
  });
  console.warn(`[EMAIL] Auto-disabled notifications for user ${userId} after ${consecutiveBounces} bounces`);
}
```

### Spam Complaint Handling (Future)

On receiving a spam complaint via Resend webhook → immediately unsubscribe the user and log the complaint. This protects the sender reputation.

---

## 5. Data Privacy

### Minimal Data in NotificationLog

| Field | Purpose | PII? |
|---|---|---|
| `userId` | Reference to user (ObjectId) | Pseudonymous |
| `taskId` | Reference to task (ObjectId) | No |
| `taskSnapshot.title` | Context for notification history UI | Potentially (task content is user-generated) |
| `taskSnapshot.priority` | Context | No |
| `taskSnapshot.dueDate` | Context | No |
| `resendMessageId` | Debugging/support | No |
| `error` | Debugging (truncated to 500 chars) | No |

### TTL Auto-Cleanup

NotificationLog entries auto-expire after 90 days via MongoDB TTL index. No manual cleanup needed.

### User Opt-Out

- Users can disable all notifications via Settings (toggle) or email (unsubscribe link)
- Opt-out is immediate and affects all future cron cycles
- Historical NotificationLog entries remain until TTL cleanup (they don't contain sensitive data beyond task titles)

### GDPR Compliance

| Requirement | Implementation |
|---|---|
| **Right to access** | `GET /profile/notifications/history` shows all sent notifications |
| **Right to opt-out** | Settings toggle + unsubscribe link |
| **Right to deletion** | Account deletion cascades to `NotificationLog.deleteMany({ userId })` |
| **Data minimization** | Only title, priority, dueDate stored in snapshot. No full task description. |
| **Consent** | Notifications enabled by default (legitimate interest for SaaS notifications). User can opt-out at any time. |

---

## 6. Infrastructure Security

### Resend API Key

| Concern | Implementation |
|---|---|
| **Storage** | `.env` file (server-only), exported via `config/env.js` |
| **Exposure** | Never in client-side code, never in git (`.gitignore` includes `.env`) |
| **Rotation** | Generate new key in Resend dashboard → update `.env` → restart server |
| **Scope** | Resend API key has send-only permissions. Cannot read/delete other account data. |

### Resend Plan Limits

| Plan | Rate Limit | Monthly Volume |
|---|---|---|
| Free | 2 emails/second, 100 emails/day | 3,000/month |
| Pro ($20/mo) | 100 emails/second | 50,000/month |

For initial launch with < 100 users, the free plan is sufficient. Monitor daily volume and upgrade proactively.

---

## 7. Cron Job Security

### No External Trigger

Cron jobs are initiated by `node-cron` within the server process. There is no HTTP endpoint to trigger them externally. An attacker cannot force email sending by calling an API.

### Concurrent Execution Prevention

```javascript
let isEmailCronRunning = false;

cron.schedule('*/15 * * * *', async () => {
  if (isEmailCronRunning) {
    console.warn('[CRON] Email sender already running, skipping');
    return;
  }
  isEmailCronRunning = true;
  try {
    await sendOverdueEmails();
  } catch (error) {
    console.error('[CRON] Email sender error:', error);
  } finally {
    isEmailCronRunning = false;
  }
});
```

### Crash Resilience

- Cron job wrapped in `try-catch` — individual failures don't crash the server
- `process.on('unhandledRejection')` handler exists (from existing code) as a safety net
- If the server restarts, `node-cron` re-initializes. The `NotificationLog` deduplication prevents re-sending emails that were already sent before the restart.

---

## 8. Deep Link Security

### Email Task Links

```
https://app.example.com/tasks/{taskId}
```

| Concern | Implementation |
|---|---|
| **Authentication required** | `ProtectedRoute` on frontend requires JWT to view task page |
| **No auth bypass** | Clicking the link without being logged in redirects to `/login` |
| **No task content in URL** | Only the ObjectId is in the URL — not guessable, not sequential |
| **Cross-user access** | Task routes check `ownerId === req.userId` — users can only view their own tasks |

### Unsubscribe Links

```
https://app.example.com/api/v1/profile/notifications/unsubscribe?userId={id}&token={hmac}
```

| Concern | Implementation |
|---|---|
| **Token validation** | HMAC verified server-side before processing |
| **Side effects** | Only disables notifications — cannot access, modify, or delete any data |
| **Idempotent** | Clicking multiple times has the same effect as clicking once |

---

## 9. Audit Trail

| Event | Action String | Logged In |
|---|---|---|
| Preferences updated | `user.notifications.preferences.update` | AuditLog |
| Email unsubscribe (from email link) | `user.notifications.unsubscribe` | AuditLog |
| Email re-subscribe (from settings) | `user.notifications.preferences.update` | AuditLog |
| Email sent (success) | — | NotificationLog (status='sent') |
| Email send failed | — | NotificationLog (status='failed', error) |
| Email retry abandoned | — | NotificationLog (status='abandoned') |

**AuditLog retention:** 30 days (existing TTL)
**NotificationLog retention:** 90 days (new TTL)
