# Overdue Task Email Notification — Rollout Checklist

## 1. Pre-Development

- [ ] **Verify Resend account** — Login to Resend dashboard, confirm API key `re_KJ4ac7cn_...` is active
- [ ] **Check Resend plan limits** — Free: 100 emails/day, 3K/month. Pro ($20/mo): 50K/month. Determine if free plan suffices for launch.
- [ ] **Send test email** — Use Resend API directly to send a test email, verify inbox delivery (not spam)
- [ ] **Verify sender address** — `onboarding@resend.dev` works for development. Plan custom domain for production.
- [ ] **Review existing overdue cron** — Confirm `isOverdue` flagging works correctly in `cronJobs.js`
- [ ] **Review existing Task indexes** — Confirm `{ isOverdue: 1, dueDate: 1, status: 1, deletedAt: 1 }` exists
- [ ] **Design review** — Approve email templates (Pop Art branding, bilingual content) with product/design team
- [ ] **Privacy review** — Confirm task titles in emails are acceptable from a data privacy perspective

**Owner:** Backend engineer + Product owner
**Acceptance:** All items checked, Resend API key verified, plan limits understood

---

## 2. Backend Development

### Models
- [ ] **Create `src/models/NotificationLog.js`** — Schema with all indexes (TTL 90d, dedup, retry, history)
- [ ] **Extend User model** — Add `notificationPreferences` subdocument with defaults
- [ ] **Create migration script** — `src/scripts/migrateNotificationPreferences.js`
- [ ] **Run migration** — Execute on development database, verify all users updated

### Services
- [ ] **Create `src/services/emailService.js`** — Resend SDK integration, send methods, unsubscribe token
- [ ] **Create `src/services/emailTemplates/`** — Overdue notification template, digest template, shared components
- [ ] **Test email rendering** — Verify HTML output in email preview tool

### Cron
- [ ] **Add email sender cron** — `*/15 * * * *` with dedup, batching, rate limiting
- [ ] **Add daily digest cron** — `0 * * * *` with timezone-aware matching
- [ ] **Add retry cron** — `*/30 * * * *` with exponential backoff, max 3 retries
- [ ] **Add concurrent execution lock** — Prevent overlapping cron runs

### API
- [ ] **Add GET /profile/notifications/preferences** — Return user preferences
- [ ] **Add PUT /profile/notifications/preferences** — Update with validation
- [ ] **Add POST /profile/notifications/unsubscribe** — HMAC token-based, no JWT
- [ ] **Add GET /profile/notifications/history** — Paginated notification list
- [ ] **Add rate limiting** — IP-based for unsubscribe, user-based for others

### Cleanup
- [ ] **Add NotificationLog cleanup to user deletion** — `deleteMany({ userId })`

### Code Review
- [ ] **Peer review** — All backend changes reviewed for correctness, security, performance

**Owner:** Backend engineer
**Acceptance:** All cron jobs running, emails delivered via Resend, dedup verified, API endpoints functional

---

## 3. Frontend Development

- [ ] **Create `NotificationSection.jsx`** — Toggles, time picker, timezone selector, save button
- [ ] **Update `SettingsPage`** — Add NotificationSection between Language and Account
- [ ] **Create `UnsubscribePage.jsx`** — Public page for email unsubscribe link
- [ ] **Add unsubscribe route** — `/unsubscribe` in router (public, no auth)
- [ ] **Add notification service methods** — getPreferences, updatePreferences, unsubscribe, getHistory
- [ ] **Code review** — All frontend changes reviewed

**Owner:** Frontend engineer
**Acceptance:** Preferences UI works, unsubscribe page works, matches Pop Art design system

---

## 4. Testing

### Automated Tests
- [ ] **EmailService unit tests** — Mock Resend, test send methods, token generation, bilingual content
- [ ] **Cron job unit tests** — Mock all dependencies, test dedup, batching, retry logic, timezone matching
- [ ] **Preference API unit tests** — Test CRUD, validation, unsubscribe, history pagination
- [ ] **Frontend component tests** — NotificationSection renders, toggles, save; UnsubscribePage states
- [ ] **E2E test** — Playwright: Settings → toggle preferences → save → verify persisted

### Manual Tests
- [ ] **Individual overdue email** — Create overdue task → verify email received within 15 minutes
- [ ] **Email content (Vietnamese)** — Verify subject, body, task details, CTA link, unsubscribe link
- [ ] **Email content (English)** — Set language to 'en' → verify English content
- [ ] **Daily digest email** — Verify multiple overdue tasks aggregated in one email
- [ ] **Deduplication** — Wait >15 minutes → verify same task doesn't get a second email within 24h
- [ ] **Unsubscribe from email** — Click unsubscribe link → verify notifications disabled
- [ ] **Re-subscribe from Settings** — Toggle back on → verify future emails work
- [ ] **Disabled user** — Disable user → verify no emails sent
- [ ] **Notifications disabled** — Toggle off → verify no emails
- [ ] **Deep link in email** — Click "Xem công việc" → verify opens correct task
- [ ] **Email client compatibility** — Test in Gmail (web), Gmail (mobile), Outlook, Apple Mail
- [ ] **Dark mode email** — Verify dark mode renders in supporting clients
- [ ] **Long task title** — 200-char title → verify subject truncation, body full display
- [ ] **HTML in task title** — Title with `<script>` tags → verify escaped in email

### Load Tests
- [ ] **Batch sending** — Create 100+ overdue tasks → verify cron processes all within interval
- [ ] **Resend rate limits** — Verify cron respects inter-send delays

**Owner:** QA engineer
**Acceptance:** All manual tests pass, automated tests achieve ≥80% coverage for new code

---

## 5. Security Review

- [ ] **Unsubscribe token** — Verify HMAC generation and `timingSafeEqual` comparison
- [ ] **Unsubscribe endpoint** — Verify no data exposure beyond disabling notifications
- [ ] **Email content** — Verify HTML escaping of user-generated content
- [ ] **No sensitive data in emails** — Confirm no passwords, tokens (beyond unsubscribe), or API keys
- [ ] **Rate limiting** — Verify unsubscribe endpoint rate-limited by IP
- [ ] **Preference endpoints** — Verify auth required, users can only access own preferences
- [ ] **Cron job isolation** — Verify not triggerable via HTTP
- [ ] **List-Unsubscribe header** — Verify RFC 8058 compliance

**Owner:** Security reviewer
**Acceptance:** No security vulnerabilities identified

---

## 6. Performance Review

- [ ] **Cron cycle duration** — Measure time to process N overdue tasks. Target: < 10 minutes for 1000 tasks
- [ ] **Database query performance** — Verify overdue task query uses the compound index (explain plan)
- [ ] **Dedup query performance** — Verify compound index on NotificationLog is effective
- [ ] **Memory usage** — Verify no memory leaks during long cron cycles
- [ ] **Resend API latency** — Measure P95 send time. Expected: < 1 second per email

**Owner:** Backend engineer
**Acceptance:** Performance targets met

---

## 7. Deployment

### Pre-Deployment
- [ ] **Verify env vars** — `RESEND_API_KEY` set in production `.env`
- [ ] **Run migration** — Execute `migrateNotificationPreferences.js` on production database
- [ ] **Verify NotificationLog collection** — Indexes created correctly

### Deploy
- [ ] **Deploy backend** — New models, services, cron extensions, API routes
- [ ] **Deploy frontend** — NotificationSection, UnsubscribePage, routes
- [ ] **Verify cron jobs started** — Check server logs for "Scheduled tasks initialized" + new jobs

### Post-Deploy Smoke Test
- [ ] **Create overdue task in production** — Verify email received
- [ ] **Check notification preferences API** — GET/PUT from production frontend
- [ ] **Test unsubscribe link** — Click from production email → verify works

**Owner:** DevOps / Backend engineer
**Acceptance:** Feature works end-to-end in production

---

## 8. Post-Deployment Monitoring

### First 24 Hours
- [ ] **Email send success rate** — Target: ≥ 98%. Monitor via console logs and NotificationLog queries
- [ ] **Cron cycle stats** — Review logs for "Email sender cycle" entries: tasks processed, emails sent, dupes skipped
- [ ] **Error rate** — Monitor `status: 'failed'` entries in NotificationLog
- [ ] **Abandoned count** — Should be 0 in first 24h if Resend is healthy
- [ ] **Resend dashboard** — Check delivery rate, open rate, bounce rate

### First Week
- [ ] **Unsubscribe rate** — Target: < 5%
- [ ] **Spam complaint rate** — Target: < 0.1%
- [ ] **NotificationLog collection size** — Verify reasonable growth
- [ ] **User feedback** — Collect any bug reports or UX issues
- [ ] **Daily digest accuracy** — Spot-check digest content matches actual overdue tasks

### Ongoing
- [ ] **Monthly Resend usage** — Monitor against plan limits
- [ ] **TTL cleanup** — Verify 90-day-old entries auto-deleted
- [ ] **Bounce rate trend** — Rising bounce rate may indicate sender reputation issues

**Owner:** On-call engineer
**Acceptance:** All metrics within targets for 7 consecutive days

---

## 9. Rollback Plan

If critical issues are discovered post-deployment:

### Quick Disable (< 5 minutes)
1. **Stop cron jobs only:** Comment out the three new cron schedules in `cronJobs.js`. Redeploy backend. This immediately stops all email sending while keeping the API and UI functional.
2. **Users retain their preferences** — no data loss.
3. **No emails sent** — users stop receiving overdue notifications.

### Full Revert (< 15 minutes)
1. **Revert backend code** — Remove email service, cron extensions, notification routes.
2. **Revert frontend code** — Remove NotificationSection, UnsubscribePage.
3. **Keep database changes** — `notificationPreferences` field remains in User schema (ignored by old code). `notification_logs` collection remains (TTL will clean it up in 90 days).
4. **No migration rollback needed** — the fields are additive and don't break existing functionality.

### Data Safety
- `NotificationLog` collection: remains, auto-cleaned by TTL.
- `User.notificationPreferences`: remains as inert subdocument, doesn't affect existing features.
- Resend: no cleanup needed on the Resend side.
- **Zero data loss** in all rollback scenarios.

**Rollback time:** < 15 minutes
**Data loss:** None
