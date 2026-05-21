# Overdue Task Email Notification — Edge Cases

## EC-1: Task Completed After Email Sent

**Scenario:** User receives an overdue email for "Báo cáo GK". User then opens the app and marks the task as `done`.

**Expected Behavior:** No follow-up email. The overdue email already sent remains in NotificationLog as historical record. The task is no longer included in future cron cycles because `status === 'done'`.

**Implementation:** The cron query includes `status: { $ne: 'done' }`. Completed tasks are automatically excluded. No special cancellation logic needed.

**Testing:** Create overdue task → wait for email → complete task → verify no more emails after 15 min cron cycle.

---

## EC-2: Task Deleted After Email Sent

**Scenario:** User receives overdue email, then soft-deletes the task.

**Expected Behavior:** Same as EC-1. Soft-deleted tasks have `deletedAt !== null` and are excluded from the cron query. NotificationLog entry remains.

**Implementation:** Cron query includes `deletedAt: null`. Soft-deleted tasks are excluded.

**Testing:** Create overdue task → wait for email → delete task → verify no more emails.

---

## EC-3: Task Due Date Changed to Future After Overdue

**Scenario:** User has an overdue task. Admin or user edits the `dueDate` to a future date.

**Expected Behavior:** The existing overdue evaluator cron should clear `isOverdue` when `dueDate >= now`. Once cleared, the email cron won't send new notifications.

**Implementation:** Verify the existing overdue evaluator handles this case. In `taskViewModel.updateTask`, when `dueDate` is updated to a future date:

```javascript
if (updates.dueDate && new Date(updates.dueDate) > new Date()) {
  updates.isOverdue = false;
  updates.overdueAt = null;
}
```

**Risk:** If the overdue evaluator cron doesn't reset `isOverdue` on dueDate change, the task may continue generating notifications. **Verify this behavior and add the reset logic to `updateTask` if missing.**

**Testing:** Create overdue task → change dueDate to tomorrow → verify `isOverdue` is false → verify no email sent.

---

## EC-4: Multiple Tasks Become Overdue Simultaneously

**Scenario:** A user has 10 tasks that all become overdue within the same 15-minute cron window.

**Expected Behavior:** If ≤ 3 tasks: send individual emails. If > 3 tasks: send a single digest instead of 10 separate emails. This prevents inbox flooding.

**Implementation:**

```javascript
// Group overdue tasks by user
const tasksByUser = new Map();
for (const task of eligibleTasks) {
  const userId = task.ownerId._id.toString();
  if (!tasksByUser.has(userId)) tasksByUser.set(userId, []);
  tasksByUser.get(userId).push(task);
}

// For each user, decide: individual vs digest
for (const [userId, tasks] of tasksByUser) {
  const user = tasks[0].ownerId;
  const unnotifiedTasks = await filterAlreadyNotified(userId, tasks);

  if (unnotifiedTasks.length === 0) continue;

  if (unnotifiedTasks.length <= 3) {
    // Send individual emails
    for (const task of unnotifiedTasks) {
      await sendAndLog(user, task, 'overdue_single');
    }
  } else {
    // Send digest instead
    await sendDigestAndLog(user, unnotifiedTasks, 'overdue_single');
  }
}
```

**Testing:** Create 10 tasks with dueDate in 1 minute → wait for overdue + email cron → verify single digest sent (not 10 emails).

---

## EC-5: User Has Notifications Disabled

**Scenario:** User has set `emailOverdue: false` in notification preferences.

**Expected Behavior:** Cron skips this user entirely. No NotificationLog entry created. No email sent.

**Implementation:**

```javascript
if (!user.notificationPreferences?.emailOverdue) continue;
```

**Testing:** Disable notifications → create overdue task → verify no email, no NotificationLog entry.

---

## EC-6: User Account Disabled

**Scenario:** Admin disables a user account (`status: 'disabled'`). User still has overdue tasks.

**Expected Behavior:** No notifications sent. Disabled users are filtered out in the cron job.

**Implementation:**

```javascript
if (user.status !== 'active') continue;
```

**Testing:** Disable user → create overdue task → verify no email sent.

---

## EC-7: Resend API Rate Limit Hit

**Scenario:** During a cron cycle, Resend returns `429 Too Many Requests`.

**Expected Behavior:** The email is saved as `status: 'failed'` with the error message. The retry cron will attempt re-sending after a delay.

**Implementation:**

```javascript
try {
  const { messageId } = await emailService.sendOverdueNotification(user, task);
  await NotificationLog.findByIdAndUpdate(logId, { status: 'sent', resendMessageId: messageId });
} catch (error) {
  const isRateLimit = error.statusCode === 429;
  const retryDelay = isRateLimit ? 60 * 1000 : calculateNextRetry(0); // 1 min for rate limit

  await NotificationLog.findByIdAndUpdate(logId, {
    status: 'failed',
    error: error.message?.slice(0, 500),
    nextRetryAt: new Date(Date.now() + retryDelay),
  });

  if (isRateLimit) {
    console.warn('[CRON] Resend rate limit hit, pausing cycle');
    break; // Stop sending more in this cycle
  }
}
```

**Testing:** Mock Resend to return 429 → verify email saved as failed → verify retry cron picks it up.

---

## EC-8: Resend API Down (5xx Error)

**Scenario:** Resend returns 500/502/503 during the cron cycle.

**Expected Behavior:** Same as EC-7 — save as failed, retry later. After 3 retries, mark as `abandoned`.

**Implementation:** Same error handling as EC-7 but without the special rate-limit delay. Standard exponential backoff: 5min → 20min → 80min.

**Testing:** Mock Resend to return 500 → verify 3 retries → verify status becomes 'abandoned'.

---

## EC-9: Duplicate Cron Execution

**Scenario:** The server restarts during a cron cycle, causing two instances to run simultaneously (old process finishing + new process starting).

**Expected Behavior:** No duplicate emails. The atomic `findOneAndUpdate` with `upsert: true` prevents creating duplicate NotificationLog entries.

**Implementation:** The deduplication query checks for existing entries within 24 hours:

```javascript
const result = await NotificationLog.findOneAndUpdate(
  { userId, taskId, type: 'overdue_single', createdAt: { $gte: twentyFourHoursAgo } },
  { $setOnInsert: { ... } },
  { upsert: true, new: true }
);
// Only send if the document was freshly inserted (status === 'pending')
```

Additionally, the in-process lock (`isEmailCronRunning` flag) prevents overlapping execution within the same process.

**Testing:** Difficult to test concurrency directly. Verify dedup by manually inserting a NotificationLog entry, then running the cron → verify no duplicate email.

---

## EC-10: Timezone Edge Cases

**Scenario:** User in `Asia/Ho_Chi_Minh` (UTC+7). Task due at 23:59 UTC+7 on May 20. Overdue evaluator runs at 00:00 UTC (= 07:00 UTC+7). Task is NOT overdue yet at this UTC time. Evaluator runs again at 17:00 UTC (= 00:00 UTC+7 May 21). Now the task IS overdue.

**Expected Behavior:** The overdue evaluator correctly flags the task because it compares `dueDate < now` in UTC. The email cron sends the notification.

**Implementation:** The overdue evaluator compares `dueDate < new Date()` — both are in UTC. Timezone is irrelevant for the comparison.

**Timezone matters for the daily digest:** The digest should be sent at the user's local time. The hourly digest cron checks:

```javascript
// Current UTC hour → check which users have their digestHour at this moment
const nowUtc = new Date();
const users = await User.find({
  'notificationPreferences.emailDigest': true,
  status: 'active',
}).lean();

for (const user of users) {
  const tz = user.notificationPreferences.timezone || 'Asia/Ho_Chi_Minh';
  const userLocalHour = parseInt(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: tz }).format(nowUtc)
  );
  if (userLocalHour === user.notificationPreferences.digestHour) {
    // Time to send digest for this user
  }
}
```

**Testing:** Set timezone to `America/New_York`, digestHour to 8. Run cron at various UTC hours. Verify digest only sent when NYC local time is 08:xx.

---

## EC-11: User Changes Email Address

**Scenario:** User updates their email after receiving overdue notifications.

**Expected Behavior:** Future notifications go to the new email. No migration of NotificationLog entries needed (they reference userId, not email).

**Implementation:** The cron job populates `user.email` fresh each cycle. Email address changes are reflected automatically.

**Testing:** Change user email → wait for next overdue email → verify delivered to new address.

---

## EC-12: Email Bounce

**Scenario:** Resend reports a hard bounce (e.g., email address doesn't exist).

**Expected Behavior (current):** Not automatically handled (no webhook integration). Email stays in NotificationLog as 'sent'. Resend dashboard shows the bounce.

**Expected Behavior (future with webhooks):** Auto-disable notifications after 3 consecutive bounces.

**Implementation (future):**

```javascript
// Webhook handler
if (event.type === 'email.bounced') {
  await NotificationLog.findOneAndUpdate(
    { resendMessageId: event.data.email_id },
    { status: 'bounced' }
  );

  const recentBounces = await NotificationLog.countDocuments({
    userId: event.data.userId,
    status: 'bounced',
    createdAt: { $gte: sevenDaysAgo },
  });

  if (recentBounces >= 3) {
    await User.findByIdAndUpdate(userId, {
      'notificationPreferences.emailOverdue': false,
      'notificationPreferences.unsubscribedAt': new Date(),
    });
  }
}
```

**Testing:** Mock webhook events → verify auto-disable after 3 bounces.

---

## EC-13: Very Long Task Title in Email

**Scenario:** User creates a task with a 200-character title (max allowed by schema).

**Expected Behavior:**
- Email subject: truncated to 50 characters with ellipsis: `[TaskDo] Công việc quá hạn: Rất dài dài dài...`
- Email body: full title displayed (200 chars fits in a card)

**Implementation:**

```javascript
const subjectTitle = task.title.length > 50
  ? task.title.slice(0, 47) + '...'
  : task.title;
```

**Testing:** Create task with 200-char title → verify email subject is truncated → verify body shows full title.

---

## EC-14: Task With No Due Date Marked as Overdue

**Scenario:** Hypothetically, a task has `dueDate: null` but `isOverdue: true` (shouldn't happen, but defensive coding).

**Expected Behavior:** Task is skipped. The email template requires a due date to show "Quá hạn X ngày".

**Implementation:**

```javascript
// Defensive filter in cron:
const eligibleTasks = overdueTasks.filter(task => {
  if (!task.dueDate) {
    console.warn(`[CRON] Task ${task._id} has isOverdue=true but no dueDate, skipping`);
    return false;
  }
  // ... other filters
});
```

**Testing:** Manually set isOverdue=true on a task with null dueDate → verify it's skipped with warning log.

---

## EC-15: Thousands of Users With Overdue Tasks

**Scenario:** 5,000 users each have overdue tasks. The cron tries to send 5,000+ emails in one cycle.

**Expected Behavior:** Cron processes in batches with delays to respect Resend rate limits. Cycle completes across multiple runs if needed.

**Implementation:**

```javascript
const BATCH_SIZE = 50;
const INTER_SEND_DELAY_MS = 100;

// Process in batches
for (let i = 0; i < eligibleTasks.length; i += BATCH_SIZE) {
  const batch = eligibleTasks.slice(i, i + BATCH_SIZE);
  for (const task of batch) {
    await sendAndLog(task.ownerId, task);
    await sleep(INTER_SEND_DELAY_MS);
  }
  console.log(`[CRON] Processed batch ${i / BATCH_SIZE + 1}, total: ${Math.min(i + BATCH_SIZE, eligibleTasks.length)}/${eligibleTasks.length}`);
}
```

At 100ms per send, 50 per batch: 5 seconds per batch. 5,000 tasks = 100 batches = ~500 seconds (~8 minutes). Within the 15-minute cron interval.

**Testing:** Load test with 100+ mock overdue tasks. Verify all emails sent. Verify no Resend rate limit errors.

---

## EC-16: Cron Job Takes Longer Than Interval

**Scenario:** The email sender cron (15-min interval) takes 20 minutes due to a large batch.

**Expected Behavior:** The next scheduled run is skipped (in-process lock prevents overlap).

**Implementation:**

```javascript
let isEmailCronRunning = false;

cron.schedule('*/15 * * * *', async () => {
  if (isEmailCronRunning) {
    console.warn('[CRON] Email sender still running from previous cycle, skipping');
    return;
  }
  isEmailCronRunning = true;
  try { await sendOverdueEmails(); }
  catch (e) { console.error('[CRON] Error:', e); }
  finally { isEmailCronRunning = false; }
});
```

**Testing:** Mock a slow email send (e.g., 200ms per email with 100 emails). Verify second invocation is skipped.

---

## EC-17: Server Restart During Email Sending

**Scenario:** Server process is killed while the cron is mid-cycle. Some emails were sent, some weren't.

**Expected Behavior:** On restart, the cron picks up where it left off. Emails already sent have NotificationLog entries (dedup prevents re-sending). Emails not yet sent have no entries (will be sent in the next cycle).

**Implementation:** The dedup mechanism naturally handles this:
- Tasks with existing NotificationLog entries → skipped
- Tasks without entries → re-processed and sent

**Risk:** If the NotificationLog was created with `status: 'pending'` but the email was never sent (process killed between create and send), the entry blocks future sends. **Mitigation:** The retry cron should also pick up `pending` entries older than 5 minutes:

```javascript
// In retry cron, also find stuck 'pending' entries:
const stuckPending = await NotificationLog.find({
  status: 'pending',
  createdAt: { $lte: new Date(Date.now() - 5 * 60 * 1000) }, // older than 5 min
});
```

**Testing:** Kill server process during cron → restart → verify missed emails are sent on next cycle.

---

## EC-18: User in English Language

**Scenario:** User has `preferredLanguage: 'en'`.

**Expected Behavior:** Email content rendered in English.

**Implementation:** Template rendering function accepts `lang` parameter:

```javascript
function renderOverdueEmail({ user, task, taskUrl, unsubscribeUrl, lang }) {
  const strings = lang === 'en' ? {
    greeting: `Hi ${user.displayName},`,
    overdueText: 'The following task is overdue:',
    priority: { high: 'High', medium: 'Medium', low: 'Low' },
    cta: 'View Task',
    footer: 'You received this email because overdue notifications are enabled.',
    unsubscribe: 'Unsubscribe',
  } : {
    greeting: `Chào ${user.displayName},`,
    overdueText: 'Công việc sau đã quá hạn:',
    priority: { high: 'Cao', medium: 'Trung bình', low: 'Thấp' },
    cta: 'Xem công việc',
    footer: 'Bạn nhận email này vì đã bật thông báo quá hạn.',
    unsubscribe: 'Hủy đăng ký thông báo',
  };
  // ... render HTML with strings
}
```

**Testing:** Set user language to 'en' → trigger overdue email → verify all content is English.

---

## EC-19: Task Title Contains HTML/Special Characters

**Scenario:** User creates a task with title: `<script>alert("XSS")</script> & "quotes"`.

**Expected Behavior:** Title is escaped in the email HTML. No script execution. Characters display correctly.

**Implementation:** All user-generated content is escaped via `escapeHtml()`:

```javascript
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

**Testing:** Create task with HTML tags in title → verify email body shows escaped text, not rendered HTML.

---

## EC-20: User Unsubscribes Then Re-subscribes

**Scenario:** User unsubscribes via email link. Later, re-enables notifications in Settings.

**Expected Behavior:** Future overdue tasks trigger notifications. **Past overdue tasks** (already flagged before re-subscribing) should NOT trigger retroactive emails.

**Implementation:** The dedup logic checks `createdAt >= twentyFourHoursAgo`. Tasks that became overdue while the user was unsubscribed may have NotificationLog entries from the skip (or no entries at all). To handle this correctly:

- When user re-subscribes, do NOT backfill notifications for existing overdue tasks
- Only newly overdue tasks (flagged after re-subscribe) should trigger emails
- Implementation: add a check in the cron: `task.overdueAt >= user.notificationPreferences.unsubscribedAt` would incorrectly gate, since `unsubscribedAt` is cleared on re-subscribe. Instead, track `resubscribedAt`:

```javascript
// On re-subscribe: set resubscribedAt = now, clear unsubscribedAt
// In cron: skip tasks where overdueAt < user.notificationPreferences.resubscribedAt
```

**Simpler alternative:** Accept that re-subscribing may trigger a batch of overdue emails for existing overdue tasks. This is actually useful behavior (reminds user of all current overdue tasks). Document this as intentional.

**Decision:** Go with the simpler approach. Re-subscribing triggers a catch-up notification for currently overdue tasks. The daily digest naturally handles this.

**Testing:** Unsubscribe → create overdue task → re-subscribe → verify overdue email sent for existing overdue tasks.
