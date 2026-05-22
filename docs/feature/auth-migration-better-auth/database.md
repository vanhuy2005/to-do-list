# Better Auth Migration Database Design

## 1. Database design goals

- keep the existing Mongo collections stable wherever possible
- avoid destructive writes
- preserve rollback safety
- allow Better Auth to operate without creating a second business identity model
- preserve all notification and scheduler dependencies

## 2. Existing collections that must remain stable

These collections already carry business meaning and must remain backward compatible:

- `users`
- `tasks`
- `refresh_sessions`
- `notification_logs`
- `audit_logs`

Why they matter:

- `users` contains app profile, role, status, providers, language, theme, and notification settings
- `tasks` uses `ownerId` to model ownership
- `refresh_sessions` is still needed during the hybrid compatibility window
- `notification_logs` powers overdue queue and retry behavior
- `audit_logs` supports moderation and traceability

## 3. Better Auth data model

### Reused collection

- `users`

Better Auth is configured to reuse the application `users` collection rather than create a parallel user table. That is the most important compatibility decision in the migration.

### New additive collections

- `better_auth_accounts`
- `better_auth_sessions`
- `better_auth_verifications`

These collections isolate Better Auth internals from application business data.

## 4. User mapping strategy

### Existing application fields that remain authoritative

- `_id`
- `email`
- `displayName`
- `avatarUrl`
- `role`
- `status`
- `providers`
- `preferredLanguage`
- `themePreference`
- `customStatuses`
- `notificationPreferences`
- `lastOnlineAt`
- `disabledAt`
- `avatarPublicId`

### Better Auth field mapping

Better Auth user mapping should remain:

- Better Auth `name` -> `users.displayName`
- Better Auth `image` -> `users.avatarUrl`
- Better Auth `id` -> Mongo `_id`

This ensures business ownership remains tied to the same user document the rest of the system already uses.

## 5. Required schema changes

### Add `emailVerified`

Additive field:

- `emailVerified: Boolean`

Reason:

- Better Auth expects a verification-aware user model
- future safe linking and invite onboarding will need it
- keeping the field even before full verification flows ship is low-risk and forward-compatible

### Make `passwordHash` nullable

Change:

- `passwordHash` must be optional and default to `null`

Reason:

- new OAuth-only users may not have a local password
- rollback still requires this field for local users
- compatibility code already mirrors Better Auth credential hashes into `users.passwordHash`

## 6. Provider account mapping

### Provider vocabulary

- Better Auth `credential` maps to application provider `local`
- Better Auth `google` maps to application provider `google`

### Synchronization rule

`users.providers` should remain a denormalized summary field derived from Better Auth accounts so that:

- admin analytics remain stable
- UI badges remain stable
- the profile page can show linked providers without new joins

### Rollback safeguard

When the Better Auth credential account is created or updated, copy the current password hash into `users.passwordHash`. This keeps rollback and legacy flows viable.

## 7. Existing user compatibility strategy

### Legacy local users

Legacy local users already exist in `users` with:

- `email`
- `passwordHash`
- app metadata

They do not necessarily have:

- Better Auth account rows
- Better Auth sessions
- verified email state

### Migration behavior

Use two migration modes:

1. lazy migration on successful password login
2. batch backfill with `src/scripts/backfillBetterAuthCredentialAccounts.js`

Both modes must be idempotent.

## 8. Session storage strategy

### Why `refresh_sessions` cannot be reused

The legacy store contains:

- hashed refresh tokens
- minimal user-agent metadata

Better Auth sessions require their own session persistence semantics and should not be mixed with the legacy hash-only model.

### Resulting design

- `better_auth_sessions` becomes the canonical session store for new auth traffic
- `refresh_sessions` remains a compatibility bridge only

## 9. Foreign-key and ownership considerations

Mongo does not enforce relational foreign keys, so logical consistency matters.

### Invariants that must remain true

- `tasks.ownerId` must continue to point to `users._id`
- `notification_logs.userId` must continue to point to `users._id`
- `audit_logs.actorId` and `targetId` must continue to point to the same identity namespace

### What must never happen

- Better Auth must not create a new user id unrelated to Mongo `_id`
- task ownership must not be remapped to a provider account id
- notification recipients must not depend on Better Auth account rows

## 10. Notification dependency considerations

The notification system depends on persisted user data, not session state.

Required compatible fields:

- `users.email`
- `users.preferredLanguage`
- `users.notificationPreferences.emailOverdue`
- `users.notificationPreferences.emailDigest`
- `users.notificationPreferences.digestHour`
- `users.notificationPreferences.timezone`
- `users.status`

This means the migration can be production-safe only if the `users` document remains readable in the same shape after OAuth sign-in and account linking.

## 11. Session and activity considerations

The code updates `users.lastOnlineAt` from Better Auth session create hooks. This means:

- admin inactivity logic remains meaningful for new sessions
- moderation queries continue to read the same field

The migration should preserve this behavior and verify it in staging.

## 12. Backfill strategy

### Script behavior

`auth:backfill` should:

- connect to Mongo
- find users with non-null `passwordHash`
- attempt `syncLegacyCredentialAccount`
- log failures per user
- remain safe to rerun

### Operational use

- run first in staging
- record migrated count
- sample-check several user records manually
- only run in production after callback config and Better Auth secrets are stable

## 13. Rollback strategy

Rollback must be additive and reversible.

### What rollback keeps

- `users.emailVerified`
- `users.passwordHash`
- Better Auth side collections
- existing tasks, notification logs, and audit logs

### Why this is safe

- additive schema changes do not break the legacy app
- dormant Better Auth collections can remain unused
- legacy login can continue as long as `passwordHash` and `refresh_sessions` remain available

## 14. Non-destructive migration rules

- do not rewrite `_id`
- do not delete `refresh_sessions` during initial rollout
- do not drop `passwordHash`
- do not bulk rewrite `tasks.ownerId`
- do not mutate `notification_logs` to reference Better Auth tables
- do not remove `providers` analytics support from `users`

## 15. Data validation checklist

Before production rollout, validate:

- every local user still has a usable `passwordHash`
- new Google users can be created with `passwordHash = null`
- `providers` is synchronized correctly for local and Google accounts
- `lastOnlineAt` updates on Better Auth session creation
- `tasks.ownerId` continues to resolve to an existing `users._id`
- `notification_logs.userId` continues to resolve to the same user after login migration
