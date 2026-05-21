# Overdue Task Email Notification — Database Design

## 1. New Model: NotificationLog

**File:** `src/models/NotificationLog.js`

### Full Schema

```javascript
import mongoose from 'mongoose';

const notificationLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null, // null for digest-type notifications
    },
    type: {
      type: String,
      enum: ['overdue_single', 'overdue_digest'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'bounced', 'abandoned'],
      default: 'pending',
    },
    resendMessageId: {
      type: String,
      default: null,
    },
    error: {
      type: String,
      default: null,
      maxlength: 500,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    nextRetryAt: {
      type: Date,
      default: null,
    },
    taskSnapshot: {
      title: { type: String },
      priority: { type: String },
      dueDate: { type: Date },
    },
  },
  {
    timestamps: true,
    collection: 'notification_logs',
  }
);
```

### Indexes

```javascript
// 1. TTL — auto-delete after 90 days
notificationLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 } // 7,776,000 seconds
);

// 2. Deduplication — fast lookup for "has this (user, task) been notified recently?"
notificationLogSchema.index(
  { userId: 1, taskId: 1, type: 1, createdAt: -1 }
);

// 3. Retry job — find failed notifications ready for retry
notificationLogSchema.index(
  { status: 1, retryCount: 1, nextRetryAt: 1 }
);

// 4. User history — paginated notification list per user
notificationLogSchema.index(
  { userId: 1, createdAt: -1 }
);
```

### Index Rationale

| Index | Used By | Query Pattern |
|---|---|---|
| `{ createdAt: 1 }` TTL | MongoDB TTL thread | Auto-deletes docs where `createdAt` > 90 days ago |
| `{ userId, taskId, type, createdAt }` | Email sender cron | `findOne({ userId, taskId, type: 'overdue_single', createdAt: { $gte: 24h_ago } })` |
| `{ status, retryCount, nextRetryAt }` | Retry cron | `find({ status: 'failed', retryCount: { $lt: 3 }, nextRetryAt: { $lte: now } })` |
| `{ userId, createdAt }` | Notification history API | `find({ userId }).sort({ createdAt: -1 }).skip().limit()` |

---

## 2. User Model Extension

**File:** `src/models/User.js` — add to existing schema

### New Subdocument: `notificationPreferences`

```javascript
// Add to the existing userSchema definition:
notificationPreferences: {
  emailOverdue: {
    type: Boolean,
    default: true,
  },
  emailDigest: {
    type: Boolean,
    default: true,
  },
  digestHour: {
    type: Number,
    default: 8,
    min: 0,
    max: 23,
    validate: {
      validator: Number.isInteger,
      message: 'digestHour must be an integer',
    },
  },
  timezone: {
    type: String,
    default: 'Asia/Ho_Chi_Minh',
    validate: {
      validator: function (v) {
        try {
          Intl.DateTimeFormat(undefined, { timeZone: v });
          return true;
        } catch (e) {
          return false;
        }
      },
      message: 'Invalid timezone',
    },
  },
  unsubscribedAt: {
    type: Date,
    default: null,
  },
},
```

### No New Indexes Needed

The `notificationPreferences` fields are not queried directly in `find()`. The cron job queries Tasks (which are populated with user data), then filters users in memory. No index on notification preferences is justified.

---

## 3. Migration Plan

### Script: `src/scripts/migrateNotificationPreferences.js`

```javascript
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';

dotenv.config();

async function migrate() {
  await connectDB();

  const result = await mongoose.connection.db.collection('users').updateMany(
    { notificationPreferences: { $exists: false } },
    {
      $set: {
        notificationPreferences: {
          emailOverdue: true,
          emailDigest: true,
          digestHour: 8,
          timezone: 'Asia/Ho_Chi_Minh',
          unsubscribedAt: null,
        },
      },
    }
  );

  console.log(`Migration complete: ${result.modifiedCount} users updated`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

**Execution:**
```bash
node src/scripts/migrateNotificationPreferences.js
```

**Idempotent:** The `$exists: false` filter ensures re-running is safe — already-migrated users are skipped.

**Note:** Mongoose applies defaults for new documents automatically. This script only backfills existing users.

---

## 4. Deduplication Query Pattern

### Check Before Sending (Single Overdue)

```javascript
const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

const existing = await NotificationLog.findOne({
  userId: user._id,
  taskId: task._id,
  type: 'overdue_single',
  status: { $in: ['sent', 'abandoned'] },
  createdAt: { $gte: twentyFourHoursAgo },
});

if (existing) {
  // Already notified for this task within 24 hours — skip
  return;
}
```

### Atomic Check-and-Create (Race-Condition Safe)

For concurrent cron execution protection:

```javascript
const result = await NotificationLog.findOneAndUpdate(
  {
    userId: user._id,
    taskId: task._id,
    type: 'overdue_single',
    createdAt: { $gte: twentyFourHoursAgo },
  },
  {
    $setOnInsert: {
      userId: user._id,
      taskId: task._id,
      type: 'overdue_single',
      status: 'pending',
      taskSnapshot: {
        title: task.title,
        priority: task.priority,
        dueDate: task.dueDate,
      },
    },
  },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);

// Only proceed if this is a fresh insert (status will be 'pending')
if (result.status === 'pending') {
  try {
    const { messageId } = await emailService.sendOverdueNotification(user, task);
    await NotificationLog.findByIdAndUpdate(result._id, {
      status: 'sent',
      resendMessageId: messageId,
    });
  } catch (error) {
    await NotificationLog.findByIdAndUpdate(result._id, {
      status: 'failed',
      error: error.message?.slice(0, 500),
      nextRetryAt: calculateNextRetry(0),
    });
  }
}
```

### Check Before Sending (Daily Digest)

```javascript
const todayStart = new Date();
todayStart.setHours(0, 0, 0, 0);

const digestSentToday = await NotificationLog.findOne({
  userId: user._id,
  taskId: null,
  type: 'overdue_digest',
  status: 'sent',
  createdAt: { $gte: todayStart },
});

if (digestSentToday) return; // Already sent today
```

---

## 5. Data Lifecycle

```
┌─────────────┐
│  Created     │  Cron creates with status='pending'
└──────┬──────┘
       │ email sent
┌──────▼──────┐
│  Sent        │  Normal lifecycle — TTL cleanup after 90 days
└──────────────┘

       │ email failed
┌──────▼──────┐
│  Failed      │  Retry cron picks up (retryCount < 3, nextRetryAt <= now)
└──────┬──────┘
       │ retry succeeds → status='sent'
       │ retryCount >= 3 → status='abandoned'
       │
┌──────▼──────┐
│  Abandoned   │  Max retries exhausted — logged for monitoring
└──────────────┘

All states: auto-deleted after 90 days by TTL index
```

### Task Lifecycle Interactions

| Task Event | NotificationLog Impact |
|---|---|
| Task becomes overdue (isOverdue=true) | Triggers email sending in next cron cycle |
| Task completed (status='done') | No new notifications (cron filters by status ≠ 'done'). Existing logs remain as history |
| Task soft-deleted (deletedAt set) | No new notifications (cron filters by deletedAt=null). Existing logs remain |
| Task hard-deleted (purge cron) | NotificationLog entries remain (reference dead taskId — acceptable for history/audit) |
| Task dueDate changed to future | Existing cron should clear isOverdue. No new overdue email until re-flagged |
| User deleted | Cascade delete all NotificationLogs for that userId |

---

## 6. Query Patterns for Cron Job

### Email Sender Cron — Find Tasks Needing Notification

```javascript
const overdueTasks = await Task.find({
  isOverdue: true,
  status: { $ne: 'done' },
  deletedAt: null,
})
  .populate('ownerId', 'email displayName preferredLanguage status notificationPreferences')
  .select('title priority dueDate overdueAt ownerId')
  .lean();

// Filter in memory (faster than complex query joins)
const eligibleTasks = overdueTasks.filter((task) => {
  const user = task.ownerId;
  if (!user) return false;
  if (user.status !== 'active') return false;
  if (!user.notificationPreferences?.emailOverdue) return false;
  if (user.notificationPreferences?.unsubscribedAt) return false;
  return true;
});
```

**Why filter in memory?** The populate + memory filter is simpler and more readable than a complex aggregation pipeline. With the existing index `{ isOverdue: 1, dueDate: 1, status: 1, deletedAt: 1 }`, the Task query is already efficient.

### Retry Cron — Find Failed Notifications

```javascript
const failedNotifications = await NotificationLog.find({
  status: 'failed',
  retryCount: { $lt: 3 },
  nextRetryAt: { $lte: new Date() },
})
  .populate('userId', 'email displayName preferredLanguage')
  .limit(50)
  .lean();
```

---

## 7. Storage Estimation

| Metric | Value |
|---|---|
| Average document size | ~500 bytes |
| Per user per week (5 overdue tasks) | ~2,500 bytes |
| Per user per year | ~130 KB |
| 1,000 active users per year | ~130 MB |
| 10,000 active users per year | ~1.3 GB |
| TTL cleanup (90-day retention) | Keeps collection at ~25% of annual volume |
| Effective steady-state (1,000 users) | ~33 MB |

**Conclusion:** Storage impact is minimal. The 90-day TTL ensures the collection self-manages.

---

## 8. Backup and Recovery

| Data | Criticality | Backup Strategy |
|---|---|---|
| `NotificationLog` | **Low** — transient/operational data | Included in regular `mongodump` but acceptable to lose. Re-sending a few duplicate emails on restore is harmless. |
| `User.notificationPreferences` | **Medium** — user preference data | Included in regular `mongodump`. Loss means users revert to defaults (notifications ON), which is a safe fallback. |

**Recovery scenario:** If MongoDB is restored from backup, some NotificationLog entries may be missing. The cron will re-detect overdue tasks without matching logs and may re-send notifications for tasks that were already notified. This is acceptable (minor duplicate emails vs. missed notifications).

---

## 9. Cascade Deletion

When a user account is deleted (via `adminViewModel.deleteUserOffline`), clean up:

```javascript
// In admin deletion flow:
await NotificationLog.deleteMany({ userId: user._id });
```

This prevents orphaned NotificationLog entries referencing a deleted user.
