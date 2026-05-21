# Better Auth Migration Rollout Checklist

## 1. Pre-migration checklist

- [ ] Confirm current production login, refresh, logout, and protected-route behavior.
- [ ] Confirm current production overdue email delivery is healthy before any auth rollout begins.
- [ ] Confirm current production cron jobs start and complete without auth-related errors.
- [ ] Confirm the Better Auth branch includes no unrelated refactors to task, email, or scheduler code.
- [ ] Confirm the team agrees that Better Auth cookie sessions will be canonical while compatibility JWT remains temporary.
- [ ] Confirm the team understands that implicit Google linking is intentionally disabled.

## 2. Database backup checklist

- [ ] Snapshot `users`.
- [ ] Snapshot `tasks`.
- [ ] Snapshot `refresh_sessions`.
- [ ] Snapshot `notification_logs`.
- [ ] Snapshot `audit_logs`.
- [ ] Record collection counts before rollout.
- [ ] Record a sample of existing local users with `passwordHash` populated.
- [ ] Record a sample of users with overdue tasks and active notification preferences.

## 3. Environment and secret checklist

- [ ] `BETTER_AUTH_SECRET` is set for the target environment.
- [ ] `BETTER_AUTH_URL` points to the correct API host.
- [ ] `BETTER_AUTH_TRUSTED_ORIGINS` includes the deployed SPA origin.
- [ ] `APP_URL` matches the expected frontend origin.
- [ ] `CORS_ORIGIN` includes the same browser origin that will send credentials.
- [ ] `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured.
- [ ] Google OAuth callback URLs are registered correctly in the provider console.
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` remain present for compatibility mode.
- [ ] `RESEND_API_KEY` and `EMAIL_FROM` remain unchanged and valid.
- [ ] Optional `@better-auth/infra` variables are either fully configured or intentionally absent.

## 4. Staging validation checklist

- [ ] Register a new local user.
- [ ] Login as the new local user.
- [ ] Refresh a compatibility JWT from a valid Better Auth cookie.
- [ ] Logout and verify the cookie session is removed.
- [ ] Login as an existing legacy local user that predates Better Auth.
- [ ] Verify lazy credential migration succeeds for that user.
- [ ] Run `npm run auth:backfill` in staging and record the migrated count.
- [ ] Complete Google OAuth sign-up for a brand-new user.
- [ ] Complete Google OAuth sign-in for an already-linked Google user.
- [ ] Verify a local-only user with the same email receives a safe non-linking error.
- [ ] Open a fresh tab after OAuth and verify cookie bootstrap restores the app session.
- [ ] Refresh a protected page and verify no login loop occurs.

## 5. Resend verification checklist

- [ ] Send a single overdue email in staging.
- [ ] Send a daily digest email in staging.
- [ ] Verify the sender address and branding remain unchanged.
- [ ] Verify the recipient email matches the owning `users.email`.
- [ ] Verify `preferredLanguage` and timezone formatting still work.
- [ ] Verify unsubscribe links still function correctly.
- [ ] Verify Resend failures still transition logs to `failed` and then retry normally.

## 6. Overdue-email verification checklist

- [ ] Mark a task overdue and confirm `Task.isOverdue` is set.
- [ ] Confirm `NotificationLog` is created in `pending`.
- [ ] Confirm duplicate prevention still works within the 24-hour window.
- [ ] Confirm an inactive or missing user is skipped or abandoned rather than crashing the scheduler.
- [ ] Confirm a completed or deleted task does not continue to send overdue mail.

## 7. Scheduler verification checklist

- [ ] Verify the overdue evaluator cron starts successfully.
- [ ] Verify the overdue email sender cron starts successfully.
- [ ] Verify the daily digest scheduler starts successfully.
- [ ] Verify the retry queue scheduler starts successfully.
- [ ] Verify cron jobs operate with no active browser sessions.
- [ ] Verify Better Auth startup did not delay or block cron initialization.

## 8. Profile and session-management checklist

- [ ] Open settings and confirm session count still loads.
- [ ] Confirm Better Auth-backed sessions appear in `/profile/sessions`.
- [ ] Confirm legacy sessions still appear when fallback is needed.
- [ ] Revoke a Better Auth session from the settings flow.
- [ ] Revoke a legacy fallback session from the settings flow.
- [ ] Verify the revoked device can no longer refresh successfully.

## 9. Smoke-test checklist

- [ ] Anonymous user visiting a protected page is redirected only after cookie bootstrap fails.
- [ ] Authenticated user visiting `/login` is redirected away automatically.
- [ ] Local login allows task CRUD without permission regressions.
- [ ] Google login allows task CRUD without permission regressions.
- [ ] Admin login still lands on `/dashboard`.
- [ ] Standard user login still lands on `/`.
- [ ] Profile, notifications, and settings pages still load normally.
- [ ] Voice-task and other protected APIs still accept the compatibility JWT.

## 10. Security verification checklist

- [ ] Google cannot silently take over a local-only legacy account with the same email.
- [ ] Disabled users remain blocked from protected APIs.
- [ ] Better Auth cookies are `Secure` in production.
- [ ] Raw auth tokens are not printed in logs.
- [ ] `/auth/refresh` prefers Better Auth sessions over stale legacy cookies.
- [ ] Revoked Better Auth sessions stop minting new compatibility JWTs.

## 11. Production canary checklist

- [ ] Deploy to a controlled production slice or low-risk window first.
- [ ] Monitor `/auth/login` error rate in real time.
- [ ] Monitor `/auth/register` error rate in real time.
- [ ] Monitor `/auth/refresh` error rate and fallback usage.
- [ ] Monitor `/auth/session` bootstrap failure rate.
- [ ] Monitor `/auth/google` start-to-success conversion.
- [ ] Monitor Better Auth callback failures and redirect loops.
- [ ] Monitor support channels for local-user collision confusion.

## 12. Production monitoring checklist

- [ ] Track Better Auth session creation volume.
- [ ] Track legacy refresh fallback usage volume.
- [ ] Track Google OAuth start count.
- [ ] Track Google OAuth completion count.
- [ ] Track local login success rate before and after release.
- [ ] Track `USER_DISABLED`, `SESSION_NOT_FOUND`, and OAuth-specific error codes.
- [ ] Track scheduler errors during and after rollout.
- [ ] Track Resend send failures and retry growth.

## 13. Auth analytics checklist

- [ ] Compare local login conversion before and after migration.
- [ ] Measure Google sign-in adoption.
- [ ] Measure how many local users hit lazy credential migration.
- [ ] Measure how many users hit collision or not-linked Google errors.
- [ ] Record when legacy refresh usage falls low enough to plan cleanup.

## 14. Rollback readiness checklist

- [ ] Keep the legacy refresh fallback enabled until the rollback window is explicitly closed.
- [ ] Preserve `users.passwordHash` for all credential users.
- [ ] Do not delete Better Auth side collections during emergency rollback.
- [ ] Have a documented method to hide the Google CTA quickly if the provider flow is the fault domain.
- [ ] Be ready to re-point auth compatibility routes to legacy handlers if needed.
- [ ] Decide in advance how Google-only users will be handled if a temporary rollback disables Better Auth flows.

## 15. Rollback execution checklist

- [ ] Stop the production rollout and freeze new auth-related changes.
- [ ] Disable or hide Google OAuth entry points if the provider flow is unstable.
- [ ] Revert compatibility auth routes to the last known good legacy behavior if required.
- [ ] Keep cron jobs and Resend systems running unless they are proven to be the fault domain.
- [ ] Preserve all Better Auth data for later forensic analysis.
- [ ] Announce rollback status and user impact internally.
- [ ] Re-verify local login, refresh, overdue email sending, and protected task APIs after rollback.

## 16. Post-rollout stabilization checklist

- [ ] Review auth logs for unknown Better Auth error codes.
- [ ] Review support tickets for OAuth confusion or redirect loops.
- [ ] Review overdue email health after 24 hours and again after 72 hours.
- [ ] Review session revocation success rates.
- [ ] Review the proportion of traffic still using legacy refresh fallback.
- [ ] Decide whether the environment is ready for fallback-retirement planning.

## 17. Exit criteria for legacy fallback retirement

- [ ] Legacy refresh usage is consistently low and understood.
- [ ] No unresolved Google OAuth callback issues remain.
- [ ] Local-user lazy migration path is stable in production.
- [ ] Session bootstrap through `/auth/session` is reliable.
- [ ] Notification and scheduler systems remain healthy after rollout.
- [ ] A separate cleanup release plan exists before removing `refresh_sessions` dependency.
