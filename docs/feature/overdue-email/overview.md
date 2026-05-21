# Overdue Task Email Notification — Feature Overview

## 1. Feature Summary

Send automated email notifications when tasks become overdue, using **Resend** as the email delivery provider. Includes individual overdue alerts (triggered within 15 minutes of a task becoming overdue) and an optional daily digest aggregating all overdue tasks for each user.

---

## 2. Business Goal

| Dimension | Detail |
|---|---|
| **Engagement recovery** | Users who miss deadlines often disengage from the app entirely. Email notifications re-engage them at the critical moment — when a task just went overdue — pulling them back into the product. |
| **Productivity impact** | Studies show that external reminders reduce task overdue rates by 20-35%. For a task management SaaS, this directly correlates with perceived product value. |
| **Retention lever** | Notification-enabled users have higher 30-day retention. The email acts as a re-acquisition channel for users who stop actively checking the app. |
| **Platform readiness** | Establishes email infrastructure (Resend integration, template system, notification preferences, deduplication) that will be reused for future email features: weekly reports, team invitations, password reset (currently no email system exists). |

## 3. User Pain Point Solved

**Users miss deadlines because they don't check the app regularly.**

Current behavior:
- Tasks become overdue → the cron job sets `isOverdue: true` → UI shows a red overdue badge **only when the user opens the app**
- If the user doesn't open the app, they have **zero awareness** that a task is overdue
- There is **no email system at all** — not even for password resets or account verification

This feature closes the feedback loop: **deadline passes → user gets an email → user opens the app → user addresses the task**.

## 4. Scope

### In Scope

| Item | Detail |
|---|---|
| Individual overdue email | Sent within 15 minutes of a task being flagged as overdue by the existing cron |
| Daily overdue digest | Aggregates all overdue tasks for a user, sent once daily at user's preferred time |
| Notification preferences | User can enable/disable overdue emails and digest, choose digest time, set timezone |
| Deduplication | Each (user, task) pair receives at most one overdue email per 24 hours |
| Retry handling | Failed emails are retried up to 3 times with exponential backoff |
| Bilingual templates | Vietnamese (default) and English based on `user.preferredLanguage` |
| Unsubscribe mechanism | One-click unsubscribe from email + settings page toggle |
| Notification history | User can view sent notification history in settings |

### Out of Scope

| Item | Rationale |
|---|---|
| Push notifications (browser/mobile) | Separate feature requiring service workers and push subscription. Future roadmap. |
| SMS notifications | Cost and complexity. Not justified for current user base. |
| In-app real-time notification center | Requires Socket.IO (planned but not implemented). Future feature. |
| Reminder emails BEFORE deadline | Different trigger logic (countdown-based). Future enhancement. |
| Webhook-based bounce handling | Requires public URL for Resend webhooks. Defer to post-deployment. |

## 5. Success Metrics (KPIs)

| Metric | Target | Measurement |
|---|---|---|
| **Overdue task resolution rate** | ≥ 40% of overdue tasks resolved within 24h of email | `count(tasks completed within 24h of overdueAt) / count(overdue tasks with email sent)` |
| **Email delivery rate** | ≥ 98% | Resend dashboard metrics |
| **Email open rate** | ≥ 30% | Resend tracking (if enabled) |
| **Unsubscribe rate** | < 5% | `count(users who unsubscribed) / count(users who received email)` |
| **Notification preference adoption** | ≥ 70% of active users keep defaults (email enabled) | `count(users with emailOverdue=true) / count(active users)` |

## 6. Key Stakeholders

| Role | Responsibility |
|---|---|
| Product owner | Approve email content, notification frequency, and preference UX |
| Backend engineer | Resend service, cron extension, NotificationLog model, deduplication |
| Frontend engineer | Notification preferences UI in Settings page |
| Email designer | HTML email templates matching Pop Art brand |
| QA engineer | Email delivery testing, timezone edge cases, deduplication verification |

## 7. Dependencies on Existing System

| Dependency | Status | Notes |
|---|---|---|
| `resend` npm package (v4.5.1) | ✅ Installed | Not yet used anywhere in code |
| `RESEND_API_KEY` env var | ✅ Configured | `re_KJ4ac7cn_G2n6sE8K1fv5TLCZZCSw91zD` |
| `config/env.js` resend section | ✅ Exists | `config.resend.apiKey` exported |
| `node-cron` | ✅ Installed & active | `cronJobs.js` runs overdue evaluator every 1 minute |
| Task `isOverdue` / `overdueAt` fields | ✅ Exist | Set by existing cron when `dueDate < now && status !== 'done'` |
| Task index `{ isOverdue: 1, dueDate: 1, status: 1, deletedAt: 1 }` | ✅ Exists | Optimized for overdue queries |
| User `email` field | ✅ Exists | Required for sending |
| User `preferredLanguage` field | ✅ Exists | `'vi'` or `'en'` — used for bilingual templates |
| User `status` field | ✅ Exists | `'disabled'` users are excluded |
| AuditLog model | ✅ Exists | For tracking preference changes |
| No existing email service | ❌ Gap | Must create from scratch — no nodemailer, no templates, no email infrastructure |

## 8. High-Level Approach

```
┌──────────────────────────────────────────────────────────────────┐
│                    EXISTING CRON (every 1 min)                   │
│    Evaluates tasks → sets isOverdue=true, overdueAt=now          │
└────────────────────────────┬─────────────────────────────────────┘
                             │ tasks now flagged
┌────────────────────────────▼─────────────────────────────────────┐
│                NEW CRON: Email Sender (every 15 min)             │
│                                                                  │
│  1. Query: tasks WHERE isOverdue=true, deletedAt=null            │
│  2. Populate: ownerId → { email, displayName, preferences }     │
│  3. Filter: user.status='active', emailOverdue=true              │
│  4. Dedup: check NotificationLog for (userId, taskId) in 24h    │
│  5. Group: by user (single vs digest threshold)                  │
│  6. Send: via Resend API                                         │
│  7. Log: create NotificationLog entry                            │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                     Resend API                                    │
│  → Delivers email to user's inbox                                │
│  → Tracks delivery status, opens (future: webhooks)              │
└──────────────────────────────────────────────────────────────────┘
```

**Separation from existing overdue cron:** The existing every-1-minute cron only flags tasks. The new every-15-minute cron handles email delivery. This keeps concerns separated and avoids slowing the fast-cadence overdue evaluator.

## 9. Timeline Estimate

| Phase | Duration | Notes |
|---|---|---|
| Backend (emailService + NotificationLog + cron + preferences API) | 3–4 days | Most effort in email templates, deduplication logic, retry mechanism |
| Frontend (notification preferences UI) | 1–2 days | Settings section with toggles, time picker, timezone selector |
| Email template design | 1 day | HTML email templates with Pop Art branding, bilingual support |
| Integration testing + QA | 1–2 days | Deduplication verification, timezone edge cases, retry testing |
| Code review + security review | 1 day | Unsubscribe token security, email content safety |
| **Total** | **7–10 days** | One engineer, sequential execution |
