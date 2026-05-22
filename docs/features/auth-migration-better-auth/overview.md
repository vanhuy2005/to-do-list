# Better Auth Migration Overview

## Executive summary

This migration modernizes authentication for the existing Task.Do SaaS by making Better Auth the canonical identity and session platform while preserving the current application contract.

The production-safe target is:

- Better Auth owns session cookies, Google OAuth, and future provider expansion.
- The existing SPA keeps working through a compatibility JWT layer during phase 1.
- Existing Mongo `users` documents remain the canonical business identity referenced by tasks, notifications, audit logs, and admin tooling.
- Resend-based overdue notifications and cron schedulers continue to operate without being rewritten.

This is an additive migration, not a platform rewrite.

## Migration goals

- Introduce Better Auth without breaking the current login, refresh, logout, and route-guard experience.
- Add Google OAuth for new sign-in and sign-up journeys.
- Preserve existing local email/password users and their task ownership.
- Maintain compatibility with the current RBAC and `req.user` / `req.userId` business API model.
- Keep Resend delivery, overdue scheduling, unsubscribe flows, and notification history intact.
- Create a path for future account linking, invite onboarding, and collaborative workspace permissions.

## Business reasoning

- Google OAuth reduces sign-up friction and improves conversion.
- Better Auth reduces long-term maintenance burden compared with a fully custom auth stack.
- Secure cookie sessions are a stronger base for future SaaS features than the current localStorage-first token flow alone.
- A compatibility migration avoids forcing a risky frontend and backend cutover in one release.

## Current code reality

The current runtime differs from parts of the legacy documentation:

- Older docs mention Passport-style OAuth, including GitHub.
- The implemented backend is actually custom JWT auth plus `refresh_sessions`.
- The current Better Auth work-in-progress already introduces:
  - `to-do-list/backend/src/services/betterAuthService.js`
  - `/api/v1/auth/core`
  - compatibility auth wrappers in `authViewModel.js`
  - Google OAuth bootstrap via `/api/v1/auth/google`
  - cookie bootstrap through `GET /api/v1/auth/session`

The migration documentation in this folder follows the running code, not the stale diagrams.

## Backward compatibility goals

- Keep all existing user records in `users`.
- Keep all task ownership references in `tasks.ownerId`.
- Keep all notification ownership references in `notification_logs.userId`.
- Keep the SPA contract of `data.accessToken` and `data.user` during phase 1.
- Keep existing `authMiddleware` as the enforcement layer for tasks, profile, audit logs, and admin APIs.
- Keep legacy refresh sessions alive long enough to avoid mass logout on rollout day.
- Keep `users.passwordHash` available for rollback and lazy credential migration.

## Scope

In scope:

- Better Auth bootstrap and route mounting
- email/password compatibility flow
- Google OAuth
- session bootstrap and refresh compatibility
- profile session management compatibility
- migration documentation
- rollout and rollback planning

Out of scope for phase 1:

- removing legacy JWT transport
- deleting `refresh_sessions`
- automatic linking of local and Google accounts
- invite onboarding
- organization/workspace authorization
- email verification driven account linking

## Non-negotiable invariants

These invariants must remain true before, during, and after rollout:

- `users._id` remains the only user identifier used by business data.
- `Task.ownerId` must never be remapped.
- `notificationPreferences`, `preferredLanguage`, and `email` remain readable on `users`.
- cron jobs must start successfully even if no user is actively logged in.
- auth rollout must not change how overdue recipients are resolved.
- disabled users must remain blocked from protected APIs even if they have a valid Better Auth session.

## Primary risks

### Security risks

- Legacy local accounts were created without a verified-email linking policy.
- Implicit Google linking by matching email would create an account takeover path.
- Dual-session coexistence during rollout increases support and observability complexity.

### Operational risks

- Misconfigured callback URLs or trusted origins can break OAuth immediately.
- A regression in cookie header forwarding can silently break session establishment.
- Dependency upgrades around Better Auth and Zod can cause unrelated route regressions.

### Data and business risks

- If Better Auth created a second user-id namespace, task and notification ownership would break.
- If `users.passwordHash` were removed too early, rollback would be unsafe.
- If profile session management only handled Better Auth sessions, legacy devices could become invisible to users during rollout.

## Rollout philosophy

- Prefer additive changes over destructive schema rewrites.
- Keep business APIs stable even if internals change.
- Migrate legacy users lazily on successful login and optionally with an idempotent backfill script.
- Treat Google OAuth as a new provider, not as permission to auto-link to existing local identities.
- Retire the legacy refresh layer only after usage drops near zero and monitoring proves stability.

## Expected UX improvements

- One-click Google sign-in for new users and already-linked accounts.
- Silent session recovery after OAuth redirect or fresh tab open.
- Better multi-device session management through Better Auth session APIs.
- Fewer authentication edge-case failures caused by stale local storage alone.

## Definition of success

The migration is successful when all of the following are true:

- email/password login remains functional for existing users
- Google OAuth works for new users and linked users
- route guards recover from Better Auth cookies without user confusion
- overdue notifications still send to the correct recipients
- profile session listing and revocation remain usable
- no task ownership or permission regressions are introduced
- rollback remains possible without data loss
