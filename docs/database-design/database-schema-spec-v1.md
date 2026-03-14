# Database Schema Spec (MongoDB + Mongoose)

Scope: `users`, `tasks`, `refresh_sessions`, `audit_logs`.

## 1) Collection: users

### JSON document example
```json
{
  "_id": { "$oid": "67d2b1111111111111111111" },
  "email": "linh.nguyen@example.com",
  "displayName": "Linh Nguyen",
  "avatarUrl": "https://cdn.example.com/avatars/linh.png",
  "preferredLanguage": "vi",
  "themePreference": "dark",
  "status": "active",
  "role": "user",
  "passwordHash": "$argon2id$v=19$m=65536,t=3,p=4$...",
  "providers": [
    {
      "provider": "local",
      "providerUserId": "linh.nguyen@example.com",
      "linkedAt": { "$date": "2026-03-14T10:00:00.000Z" },
      "emailVerified": true
    },
    {
      "provider": "google",
      "providerUserId": "google-oauth2|116984900000001234567",
      "linkedAt": { "$date": "2026-03-14T10:05:00.000Z" },
      "emailVerified": true
    }
  ],
  "customStatuses": ["blocked", "review", "waiting"],
  "deletedAt": null,
  "deletedBy": null,
  "deleteReason": null,
  "restoreUntil": null,
  "createdAt": { "$date": "2026-03-14T10:00:00.000Z" },
  "updatedAt": { "$date": "2026-03-14T10:05:00.000Z" }
}
```

### Field rules
- `email`: required, lowercase-normalized, globally unique.
- `role`: enum `user|admin`.
- `status`: enum `active|disabled`.
- `providers`: embedded provider links (`local|google|github`).
- `customStatuses`: max 8 entries per user.
- Soft delete fields are nullable until delete action.

---

## 2) Collection: tasks

### JSON document example
```json
{
  "_id": { "$oid": "67d2b2222222222222222222" },
  "ownerId": { "$oid": "67d2b1111111111111111111" },
  "title": "Chuẩn bị báo cáo sprint",
  "description": "Tổng hợp tiến độ backend + frontend",
  "status": "doing",
  "priority": "high",
  "tags": ["work", "backend"],
  "dueDate": { "$date": "2026-03-18T15:00:00.000Z" },
  "orderIndex": 1200,
  "explicitOverdue": false,
  "deletedAt": null,
  "deletedBy": null,
  "deleteReason": null,
  "restoreUntil": null,
  "createdAt": { "$date": "2026-03-14T11:00:00.000Z" },
  "updatedAt": { "$date": "2026-03-14T11:10:00.000Z" }
}
```

### Status and overdue rules
- Base statuses: `todo|doing|done`.
- Overdue default is computed: `dueDate < now && status !== done`.
- User may manually force overdue by setting `status = overdue` and `explicitOverdue = true`.
- `orderIndex` is scoped per owner + status column (board behavior).

### Restore rules
- If user deleted own task: user can restore.
- If admin deleted task: admin can restore.

---

## 3) Collection: refresh_sessions

### JSON document example
```json
{
  "_id": { "$oid": "67d2b3333333333333333333" },
  "userId": { "$oid": "67d2b1111111111111111111" },
  "tokenHash": "$argon2id$v=19$m=65536,t=3,p=4$...",
  "deviceInfo": "Chrome 134 / Windows 11",
  "ip": "203.113.10.20",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
  "expiresAt": { "$date": "2026-04-13T11:00:00.000Z" },
  "revokedAt": null,
  "createdAt": { "$date": "2026-03-14T11:00:00.000Z" },
  "updatedAt": { "$date": "2026-03-14T11:00:00.000Z" }
}
```

### Security rules
- Never store raw refresh token.
- Rotate refresh token on sensitive auth events.
- Revoke all active sessions on password reset.

---

## 4) Collection: audit_logs

### JSON document example
```json
{
  "_id": { "$oid": "67d2b4444444444444444444" },
  "actorId": { "$oid": "67d2b5555555555555555555" },
  "actorRole": "admin",
  "action": "task.soft_delete",
  "targetType": "task",
  "targetId": { "$oid": "67d2b2222222222222222222" },
  "summaryBefore": {
    "status": "doing",
    "title": "Chuẩn bị báo cáo sprint"
  },
  "summaryAfter": {
    "deletedAt": "2026-03-14T12:00:00.000Z",
    "restoreUntil": "2026-03-21T12:00:00.000Z"
  },
  "meta": {
    "reason": "Nội dung trùng lặp",
    "ip": "203.113.10.20"
  },
  "createdAt": { "$date": "2026-03-14T12:00:00.000Z" }
}
```

### Retention
- Keep for 30 days.
- Daily purge job removes expired logs.

---

## Mongoose Migration Index DDL (up/down)

> Example migration file: `backend/src/migrations/20260314_add_core_indexes.js`

```js
module.exports.up = async function up({ mongoose }) {
  const db = mongoose.connection.db;

  await db.collection('users').createIndex(
    { email: 1 },
    { unique: true, name: 'ux_users_email' }
  );

  await db.collection('users').createIndex(
    { role: 1, status: 1, deletedAt: 1 },
    { name: 'ix_users_role_status_deletedAt' }
  );

  await db.collection('tasks').createIndex(
    { ownerId: 1, status: 1, dueDate: 1, updatedAt: -1 },
    { name: 'ix_tasks_owner_status_due_updated' }
  );

  await db.collection('tasks').createIndex(
    { ownerId: 1, deletedAt: 1 },
    { name: 'ix_tasks_owner_deletedAt' }
  );

  await db.collection('tasks').createIndex(
    { title: 'text', description: 'text' },
    { name: 'ix_tasks_text_title_description' }
  );

  await db.collection('refresh_sessions').createIndex(
    { userId: 1, expiresAt: 1 },
    { name: 'ix_sessions_user_expiresAt' }
  );

  await db.collection('refresh_sessions').createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: 'ttl_sessions_expiresAt' }
  );

  await db.collection('audit_logs').createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 2592000, name: 'ttl_audit_logs_30d' }
  );

  await db.collection('audit_logs').createIndex(
    { actorId: 1, createdAt: -1 },
    { name: 'ix_audit_actor_createdAt' }
  );

  await db.collection('audit_logs').createIndex(
    { targetType: 1, targetId: 1, createdAt: -1 },
    { name: 'ix_audit_target_createdAt' }
  );
};

module.exports.down = async function down({ mongoose }) {
  const db = mongoose.connection.db;

  await db.collection('users').dropIndex('ux_users_email');
  await db.collection('users').dropIndex('ix_users_role_status_deletedAt');

  await db.collection('tasks').dropIndex('ix_tasks_owner_status_due_updated');
  await db.collection('tasks').dropIndex('ix_tasks_owner_deletedAt');
  await db.collection('tasks').dropIndex('ix_tasks_text_title_description');

  await db.collection('refresh_sessions').dropIndex('ix_sessions_user_expiresAt');
  await db.collection('refresh_sessions').dropIndex('ttl_sessions_expiresAt');

  await db.collection('audit_logs').dropIndex('ttl_audit_logs_30d');
  await db.collection('audit_logs').dropIndex('ix_audit_actor_createdAt');
  await db.collection('audit_logs').dropIndex('ix_audit_target_createdAt');
};
```

---

## Suggested Mongoose schema-level indexes (optional)

```js
userSchema.index({ email: 1 }, { unique: true, name: 'ux_users_email' });
userSchema.index({ role: 1, status: 1, deletedAt: 1 }, { name: 'ix_users_role_status_deletedAt' });

taskSchema.index({ ownerId: 1, status: 1, dueDate: 1, updatedAt: -1 }, { name: 'ix_tasks_owner_status_due_updated' });
taskSchema.index({ ownerId: 1, deletedAt: 1 }, { name: 'ix_tasks_owner_deletedAt' });
taskSchema.index({ title: 'text', description: 'text' }, { name: 'ix_tasks_text_title_description' });

refreshSessionSchema.index({ userId: 1, expiresAt: 1 }, { name: 'ix_sessions_user_expiresAt' });
refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'ttl_sessions_expiresAt' });

auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000, name: 'ttl_audit_logs_30d' });
auditLogSchema.index({ actorId: 1, createdAt: -1 }, { name: 'ix_audit_actor_createdAt' });
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 }, { name: 'ix_audit_target_createdAt' });
```

---

## Notes for migration safety
- Deploy indexes in a migration release before high-traffic feature rollout.
- Validate duplicate emails before applying unique index.
- TTL indexes are not immediate; MongoDB cleanup thread runs periodically.
- Keep `deletedAt` nullable and filtered in queries to protect soft-delete behavior.
