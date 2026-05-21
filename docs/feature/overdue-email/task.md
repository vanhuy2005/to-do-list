# Overdue Task Email Notification — Implementation Tasks

## Backend Tasks

---

### B1: Create Email Service with Resend

**Objective:** Create `src/services/emailService.js` — singleton service encapsulating all Resend API interactions and email template rendering.

**Implementation Details:**
1. Import `Resend` from `resend` and `config` from `../config/env.js`
2. Constructor: initialize `new Resend(config.resend.apiKey)`
3. `sendOverdueNotification(user, task)`:
   - Determine language from `user.preferredLanguage` (default 'vi')
   - Generate unsubscribe token: `HMAC-SHA256(userId + ':unsubscribe', JWT_SECRET)`
   - Build unsubscribe URL: `{APP_URL}/unsubscribe?userId={id}&token={token}`
   - Build task URL: `{APP_URL}/tasks/{taskId}`
   - Render HTML email using `renderOverdueEmail()` template function
   - Call `this.resend.emails.send()` with:
     - `from: 'TaskDo <notifications@resend.dev>'`
     - `to: [user.email]`
     - `subject`: bilingual, truncated to 50 chars
     - `html`: rendered template
     - `headers`: `List-Unsubscribe` and `List-Unsubscribe-Post` (RFC 8058)
   - Return `{ messageId: data.id }`
4. `sendOverdueDigest(user, tasks)`: same pattern but with digest template
5. `generateUnsubscribeToken(userId)`: `crypto.createHmac('sha256', JWT_SECRET).update(userId + ':unsubscribe').digest('hex')`
6. `verifyUnsubscribeToken(userId, token)`: recompute HMAC, compare with `crypto.timingSafeEqual`
7. Export singleton

**Dependencies:** `resend` npm (installed), `config/env.js`, `crypto` (Node built-in)

**Acceptance Criteria:**
- [x] Can send individual overdue email via Resend API
- [x] Can send digest email with multiple tasks
- [x] Bilingual support (vi/en) based on user preference
- [x] Unsubscribe token generation/verification works
- [x] `List-Unsubscribe` header included in all emails
- [x] HTML escapes user-generated content (task titles)
- [x] Errors are thrown with descriptive messages (not swallowed)

**Potential Risks:**
- Resend free plan: 100 emails/day limit. Monitor and plan for upgrade.
- `onboarding@resend.dev` as from address may have deliverability issues. Verified custom domain recommended for production.

---

### B2: Create Email Templates

**Objective:** Create `src/services/emailTemplates/` with template functions for overdue emails.

**Implementation Details:**
1. `overdueNotification.js` — `renderOverdueEmail({ user, task, taskUrl, unsubscribeUrl, lang })` → HTML string
   - Pop Art header banner (yellow bg, 3px border, TaskDo logo text)
   - Greeting: "Chào {displayName}," / "Hi {displayName},"
   - Task card: title, priority badge (🔴/🟡/🟢 + color), dueDate, days overdue
   - CTA button: "Xem công việc" / "View Task" → taskUrl
   - Footer: unsubscribe link, copyright
   - All inline CSS, table-based layout for Outlook
   - Dark mode `<style>` block for supported clients
   - Preheader text
2. `overdueDigest.js` — `renderOverdueDigest({ user, tasks, appUrl, unsubscribeUrl, lang })` → HTML string
   - Same header/footer as single email
   - Summary table: task title, priority, due date, days overdue
   - CTA: "Xem tất cả" → appUrl
3. `components/header.js` — reusable Pop Art banner function
4. `components/footer.js` — reusable footer with unsubscribe link
5. `components/escapeHtml.js` — HTML entity escaping utility

**Dependencies:** B1 (consumed by EmailService)

**Acceptance Criteria:**
- [x] Renders valid HTML that displays correctly in Gmail, Outlook, Apple Mail
- [x] All user content HTML-escaped
- [x] Bilingual strings (vi/en)
- [x] CTA buttons are 44px height, clickable on mobile
- [x] Pop Art styling consistent with app design
- [x] Dark mode media query included

**Potential Risks:**
- Email client compatibility is notoriously fragile. Test with Litmus or Email on Acid if available.

---

### B3: Create NotificationLog Model

**Objective:** Create `src/models/NotificationLog.js` with schema, indexes, and collection config.

**Implementation Details:**
1. Define schema with fields: userId, taskId, type, status, resendMessageId, error, retryCount, nextRetryAt, taskSnapshot
2. Add indexes:
   - TTL on `createdAt` (90 days)
   - Compound: `{ userId: 1, taskId: 1, type: 1, createdAt: -1 }` (dedup)
   - `{ status: 1, retryCount: 1, nextRetryAt: 1 }` (retry query)
   - `{ userId: 1, createdAt: -1 }` (user history)
3. Export model

**Dependencies:** Mongoose

**Acceptance Criteria:**
- [x] Model creates collection `notification_logs`
- [x] TTL index auto-deletes entries after 90 days
- [x] Compound index supports dedup query efficiently
- [x] All enum values enforced at schema level

**Potential Risks:** None — straightforward Mongoose model

---

### B4: Extend User Model with Notification Preferences

**Objective:** Add `notificationPreferences` subdocument to User schema.

**Implementation Details:**
1. Add to User schema:
   ```javascript
   notificationPreferences: {
     emailOverdue: { type: Boolean, default: true },
     emailDigest: { type: Boolean, default: true },
     digestHour: { type: Number, default: 8, min: 0, max: 23 },
     timezone: { type: String, default: 'Asia/Ho_Chi_Minh' },
     unsubscribedAt: { type: Date, default: null },
   }
   ```
2. Add timezone validator using `Intl.DateTimeFormat`

**Dependencies:** Existing User model

**Acceptance Criteria:**
- [x] New users get default preferences (all enabled, 8am, Asia/Ho_Chi_Minh)
- [x] Timezone validation rejects invalid IANA timezone strings
- [x] digestHour validation enforces 0-23 integer

**Potential Risks:** Need migration for existing users (B5)

---

### B5: Create Migration Script

**Objective:** Create `src/scripts/migrateNotificationPreferences.js` to backfill existing users.

**Implementation Details:**
1. Connect to DB
2. `updateMany({ notificationPreferences: { $exists: false } }, { $set: { notificationPreferences: defaults } })`
3. Log count of updated documents
4. Exit

**Dependencies:** B4, database connection

**Acceptance Criteria:**
- [x] All existing users receive default notification preferences
- [x] Script is idempotent (safe to re-run)
- [x] Script logs migration count

**Potential Risks:** If user collection is large (>100K), may take a few seconds. Not a concern for current scale.

---

### B6: Extend Cron Jobs with Email Sender

**Objective:** Add three new cron jobs to `src/cron/cronJobs.js`: email sender (15 min), daily digest (hourly), retry (30 min).

**Implementation Details:**

**Email Sender (*/15 * * * *):**
1. Query overdue tasks (isOverdue=true, status≠done, deletedAt=null)
2. Populate ownerId → user with email, displayName, preferredLanguage, status, notificationPreferences
3. Filter: active users with emailOverdue=true
4. Group by user
5. For each (user, task): atomic dedup check via `findOneAndUpdate` with upsert
6. If new entry: send via emailService → update status to 'sent' or 'failed'
7. Batch processing: 50 per cycle, 100ms delay between sends
8. In-process lock to prevent concurrent execution

**Daily Digest (0 * * * *):**
1. For each active user with emailDigest=true
2. Check if current UTC hour matches user's local digestHour (timezone-aware)
3. Check if digest already sent today
4. If not: aggregate all overdue tasks → send digest → log

**Retry (*/30 * * * *):**
1. Query NotificationLog: status='failed', retryCount<3, nextRetryAt<=now
2. Populate userId for email info
3. Re-send via emailService
4. On success: update status='sent'
5. On failure: increment retryCount, calculate nextRetryAt (exponential backoff: 5m, 20m, 80m)
6. If retryCount>=3: mark as 'abandoned'
7. Also pick up stuck 'pending' entries older than 5 minutes

**Dependencies:** B1 (emailService), B3 (NotificationLog), B4 (user preferences), existing cron infrastructure

**Acceptance Criteria:**
- [x] Email sender cron sends individual overdue emails within 15 minutes of task becoming overdue
- [x] Deduplication prevents sending same email twice in 24 hours
- [x] Daily digest sent at user's preferred time
- [x] Failed emails retried up to 3 times
- [x] Abandoned emails logged for monitoring
- [x] Concurrent execution prevented by in-process lock
- [x] Batch processing with delays respects Resend rate limits
- [x] Cron errors don't crash the server

**Potential Risks:**
- Timezone calculation edge cases (DST transitions). Use `Intl.DateTimeFormat` for robust timezone handling.
- Large batch size may exceed cron interval. Monitor cycle duration.

---

### B7: Add Notification Preferences API

**Objective:** Add preference endpoints to profileViewModel and profile routes.

**Implementation Details:**

**profileViewModel additions:**
1. `getNotificationPreferences(req, res)`: return `user.notificationPreferences`
2. `updateNotificationPreferences(req, res)`:
   - Validate input (digestHour 0-23, timezone IANA valid)
   - Partial update via `$set`
   - If emailOverdue changed false→true: clear `unsubscribedAt`
   - If emailOverdue changed true→false: set `unsubscribedAt = now`
   - Create AuditLog entry
3. `unsubscribe(req, res)`:
   - Extract userId and token from query params
   - Verify HMAC token via emailService.verifyUnsubscribeToken
   - Set emailOverdue=false, emailDigest=false, unsubscribedAt=now
   - Create AuditLog entry
4. `getNotificationHistory(req, res)`:
   - Paginated query of NotificationLog for user
   - Return notifications + pagination metadata

**Route additions:**
```javascript
router.get('/notifications/preferences', authMiddleware, requireRole('user'), errorHandler(vm.getNotificationPreferences));
router.put('/notifications/preferences', authMiddleware, requireRole('user'), errorHandler(vm.updateNotificationPreferences));
router.post('/notifications/unsubscribe', errorHandler(vm.unsubscribe)); // No auth — token-based
router.get('/notifications/history', authMiddleware, requireRole('user'), errorHandler(vm.getNotificationHistory));
```

**Dependencies:** B1 (emailService for token verification), B3 (NotificationLog), B4 (user preferences)

**Acceptance Criteria:**
- [x] GET preferences returns current settings
- [x] PUT preferences validates and updates partial fields
- [x] Unsubscribe works without JWT (HMAC token only)
- [x] History returns paginated notification list
- [x] AuditLog entries created for preference changes
- [x] Error codes match existing pattern

**Potential Risks:** Unsubscribe endpoint is public (no auth) — must be rate-limited by IP.

---

### B8: Add NotificationLog Cleanup to User Deletion

**Objective:** When admin deletes a user, cascade delete their NotificationLog entries.

**Implementation Details:**

```javascript
// In adminViewModel.deleteUserOffline, before deleting user:
await NotificationLog.deleteMany({ userId: user._id });
```

**Dependencies:** B3, existing adminViewModel

**Acceptance Criteria:**
- [x] User deletion removes all NotificationLog entries
- [x] No orphaned documents after user deletion

**Potential Risks:** None — straightforward cleanup

---

## Frontend Tasks

---

### F1: Create NotificationSection Component

**Objective:** Create `src/components/settings/NotificationSection.jsx` — notification preferences UI.

**Implementation Details:**
1. Fetches preferences on mount: `GET /profile/notifications/preferences`
2. Local state: `emailOverdue`, `emailDigest`, `digestHour`, `timezone`, `isDirty`, `isSaving`
3. UI elements:
   - shadcn `Switch` for overdue toggle with description text
   - shadcn `Switch` for digest toggle (disabled when overdue=OFF)
   - shadcn `Select` for digest hour (00:00 – 23:00, disabled when digest=OFF)
   - shadcn `Select` for timezone (searchable, common IANA timezones)
   - Save button (disabled when not dirty, loading state during save)
4. Save handler: `PUT /profile/notifications/preferences` with changed fields only
5. Success toast: "Đã cập nhật cài đặt thông báo"
6. Error handling: toast for all error states
7. Pop Art styling: 3px borders, comic shadows, bright toggle colors

**Dependencies:** shadcn `Switch`, `Select`, `Button`; sonner for toasts; lucide-react icons

**Acceptance Criteria:**
- [x] Preferences load and display correctly
- [x] Toggles switch smoothly with Pop Art styling
- [x] Time picker and timezone disabled when parent toggle is OFF
- [x] Save only sends changed fields
- [x] Success/error toasts display
- [x] Loading states during fetch and save
- [x] Keyboard accessible (Tab, Enter, Space)

**Potential Risks:** Timezone select might have too many options — filter to common timezones.

---

### F2: Update SettingsPage

**Objective:** Integrate `NotificationSection` into existing SettingsPage.

**Implementation Details:**
1. Import `NotificationSection`
2. Add between existing sections (after Language/Theme, before Account)
3. Section header: 🔔 icon + "Thông báo"

**Dependencies:** F1

**Acceptance Criteria:**
- [x] NotificationSection renders in correct position
- [x] No visual regression in existing sections

**Potential Risks:** None

---

### F3: Create Unsubscribe Page

**Objective:** Create `src/pages/UnsubscribePage.jsx` at route `/unsubscribe`.

**Implementation Details:**
1. On mount: extract `userId` and `token` from URL query params
2. Call `POST /api/v1/profile/notifications/unsubscribe?userId={id}&token={token}`
3. States:
   - Loading: spinner with "Đang xử lý..."
   - Success: "Đã hủy đăng ký thông báo" + link to Settings to re-enable
   - Error: "Liên kết không hợp lệ" + link to home
4. No authentication required (public page)
5. Pop Art styled confirmation card

**Dependencies:** Existing router, unsubscribe endpoint

**Acceptance Criteria:**
- [x] Unsubscribe link from email works without login
- [x] Success/error states display correctly
- [x] Link to Settings page for re-subscription
- [x] Page is accessible and mobile-responsive

**Potential Risks:** None

---

### F4: Add Notification Service Methods

**Objective:** Add API methods for notification preferences.

**Implementation Details:**
1. In `src/services/authService.js` or new `src/services/notificationService.js`:
   - `getNotificationPreferences()` → `GET /profile/notifications/preferences`
   - `updateNotificationPreferences(data)` → `PUT /profile/notifications/preferences`
   - `unsubscribe(userId, token)` → `POST /profile/notifications/unsubscribe?userId={id}&token={token}`
   - `getNotificationHistory(params)` → `GET /profile/notifications/history`

**Dependencies:** axios instance

**Acceptance Criteria:**
- [x] All API methods work correctly
- [x] Error responses properly propagated

**Potential Risks:** None

---

### F5: Add Unsubscribe Route

**Objective:** Register `/unsubscribe` route in the frontend router.

**Implementation Details:**
1. In `src/routes/index.jsx`:
   ```javascript
   { path: '/unsubscribe', element: <UnsubscribePage /> }
   ```
2. Public route (no `ProtectedRoute` wrapper)

**Dependencies:** F3

**Acceptance Criteria:**
- [x] Route accessible without authentication
- [x] Query params (userId, token) passed to page component

**Potential Risks:** None

---

## Database Tasks

---

### D1: Create NotificationLog Collection

**Objective:** First deployment creates the collection and indexes via Mongoose.

**Dependencies:** B3

**Acceptance Criteria:**
- [x] Collection `notification_logs` exists after deployment
- [x] All 4 indexes created (TTL, dedup, retry, user history)
- [x] TTL index confirmed via `db.notification_logs.getIndexes()`

---

### D2: Run Migration Script

**Objective:** Execute migration to add default notification preferences to existing users.

**Dependencies:** B5, D1

**Acceptance Criteria:**
- [x] All existing users have `notificationPreferences` subdocument
- [x] Defaults: emailOverdue=true, emailDigest=true, digestHour=8, timezone=Asia/Ho_Chi_Minh

---

## Infrastructure Tasks

---

### I1: Verify Resend Configuration

**Objective:** Validate Resend API key and plan limits.

**Implementation Details:**
1. Test API key by sending a test email: `resend.emails.send({ to: developer_email })`
2. Check plan limits: free=100 emails/day, pro=50K/month
3. Verify sender address: `onboarding@resend.dev` works for development
4. Plan for custom domain verification for production

**Dependencies:** Resend account

**Acceptance Criteria:**
- [x] API key is valid and can send emails
- [x] Plan limits understood and documented
- [x] Test email delivered successfully

---

## Testing Tasks

---

### T1: Backend Unit Tests — EmailService

**Objective:** Test email service with mocked Resend SDK.

**Implementation Details:**
- Mock `Resend.emails.send` → verify called with correct params
- Test bilingual subject/content selection
- Test unsubscribe token generation and verification
- Test HTML escaping of task titles with special characters
- Test error handling when Resend throws

**Dependencies:** B1, B2, Jest

**Acceptance Criteria:** ≥ 80% line coverage for emailService

---

### T2: Backend Unit Tests — Cron Jobs

**Objective:** Test email sender, digest, and retry cron logic.

**Implementation Details:**
- Mock EmailService, NotificationLog, Task, User models
- Test deduplication: existing log → skip
- Test batch processing: correct grouping and batching
- Test retry: increment retryCount, calculate backoff, abandon after 3
- Test timezone-aware digest hour matching
- Test concurrent execution lock

**Dependencies:** B6, Jest

**Acceptance Criteria:** ≥ 80% line coverage for cron email logic

---

### T3: Backend Unit Tests — Notification Preferences API

**Objective:** Test preference CRUD and unsubscribe handlers.

**Implementation Details:**
- Test get preferences: returns user subdocument
- Test update: partial update, validation errors
- Test unsubscribe: valid token succeeds, invalid token fails
- Test history: pagination, type filtering

**Dependencies:** B7, Jest

**Acceptance Criteria:** All endpoints tested for success and error cases

---

### T4: Frontend Component Tests

**Objective:** Test NotificationSection and UnsubscribePage components.

**Implementation Details:**
- Vitest + Testing Library
- NotificationSection: render with mock data, toggle interactions, save trigger
- UnsubscribePage: loading/success/error states

**Dependencies:** F1, F3, Vitest

---

### T5: E2E Tests

**Objective:** Full notification preferences flow in Playwright.

**Implementation Details:**
- Navigate to Settings → verify notification section visible
- Toggle overdue email off → save → verify preference persisted
- Toggle back on → save → verify updated
- Test digest toggle disabled when overdue is off
- Test timezone/hour selection

**Dependencies:** All frontend + backend tasks

---

### T6: Email Delivery Integration Test

**Objective:** Verify actual email delivery through Resend.

**Implementation Details:**
- Create a test overdue task for a test user
- Trigger the cron job manually (or wait 15 min)
- Verify email received at test email address
- Verify email content, links, unsubscribe header
- Click unsubscribe link → verify it works

**Dependencies:** All backend tasks, Resend API key

**Acceptance Criteria:**
- [x] Email delivered to inbox (not spam)
- [x] Content matches template specification
- [x] Deep link opens the correct task
- [x] Unsubscribe link works

---

## Documentation Tasks

---

### DOC1: Update API Reference

**Objective:** Add notification preference endpoints to `docs/app/03-thiet-ke-api.md`.

**Dependencies:** B7

---

### DOC2: Update Database Schema Docs

**Objective:** Document NotificationLog model and User.notificationPreferences in `docs/app/02-thiet-ke-csdl.md`.

**Dependencies:** B3, B4

---

### DOC3: Update Env Configuration Docs

**Objective:** Document Resend-related environment variables in `docs/env-configuration.md`.

**Dependencies:** I1
