# Better Auth Migration Implementation Tasks

## Backend

### Backend B1: Finalize Better Auth bootstrap service

- Objective: make Better Auth initialization stable, lazy, and environment-aware.
- Implementation details: keep initialization in `src/services/betterAuthService.js`; ensure bootstrap happens only after Mongo is connected; preserve `users` collection mapping; keep Better Auth account/session/verification collections separate from legacy stores.
- Dependencies: Mongo connection, Better Auth packages, environment variables.
- Acceptance criteria: server can mount `/api/v1/auth/core` successfully in development and staging.
- Rollback considerations: route can be disabled while leaving the service code unused.
- Risks: bad `BETTER_AUTH_URL`, missing secret, or invalid trusted origins can break all provider callbacks.
- Estimated complexity: Medium.

### Backend B2: Audit Better Auth field mapping against the existing `users` schema

- Objective: guarantee Better Auth reads and writes the same user document shape expected by the business domain.
- Implementation details: verify mappings for `displayName`, `avatarUrl`, `_id`, `role`, `status`, `preferredLanguage`, `themePreference`, `customStatuses`, and `providers`; confirm no unwanted field overwrites occur during sign-up and sign-in.
- Dependencies: Backend B1.
- Acceptance criteria: newly created Better Auth users retain all required application defaults.
- Rollback considerations: mapping changes are code-only and reversible.
- Risks: a wrong field map can silently break profile pages, admin analytics, or notifications.
- Estimated complexity: Medium.

### Backend B3: Keep compatibility auth routes as the public contract

- Objective: avoid a frontend-breaking auth cutover.
- Implementation details: preserve `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/session`, and `/auth/google`; ensure each route returns the existing app envelope with `success`, `data`, and `message` or `error`.
- Dependencies: Backend B1.
- Acceptance criteria: current frontend auth calls require no endpoint path changes.
- Rollback considerations: each route can point back to legacy logic if needed.
- Risks: one contract mismatch can break the auth UI even when Better Auth is functioning.
- Estimated complexity: Medium.

### Backend B4: Harden cookie header forwarding from Better Auth to Express responses

- Objective: guarantee Better Auth cookies actually reach the browser in all auth flows.
- Implementation details: keep `applyBetterAuthHeaders` behavior explicit for `Set-Cookie`; verify header forwarding for register, login, logout, and Google OAuth start.
- Dependencies: Backend B3.
- Acceptance criteria: cookies appear consistently in browser devtools during happy-path auth flows.
- Rollback considerations: safe to revert to prior manual auth flow.
- Risks: missing header forwarding creates invisible login failures.
- Estimated complexity: Medium.

### Backend B5: Preserve lazy credential migration for existing local users

- Objective: let legacy local users continue signing in without a one-time forced migration window.
- Implementation details: keep `signInEmail` as the first attempt; if Better Auth lacks a credential account, verify the legacy `passwordHash`; on success, link a Better Auth credential account and retry sign-in.
- Dependencies: Backend B1, Database D1.
- Acceptance criteria: a pre-migration local user can log in successfully without manual admin intervention.
- Rollback considerations: local password hashes remain intact for rollback.
- Risks: migration bugs can strand existing users even though their credentials are valid.
- Estimated complexity: High.

### Backend B6: Keep refresh dual-mode until session age-out

- Objective: prevent mass logout on deployment day.
- Implementation details: keep `/auth/refresh` checking Better Auth cookies first and `refresh_sessions` second; instrument fallback usage so the team knows when it is safe to retire.
- Dependencies: Backend B3, production monitoring and analytics instrumentation.
- Acceptance criteria: existing active users remain logged in through at least one legacy refresh lifetime.
- Rollback considerations: the fallback path is itself the short-term rollback bridge.
- Risks: long-running dual-mode support increases maintenance complexity.
- Estimated complexity: Medium.

### Backend B7: Maintain `disabled` user enforcement after Better Auth session success

- Objective: ensure identity success does not bypass business access controls.
- Implementation details: keep `getActiveUserOrThrow` checks in compatibility flows; confirm protected APIs continue blocking `status === "disabled"` users.
- Dependencies: Backend B3.
- Acceptance criteria: disabled users cannot use protected APIs even if they still hold a valid Better Auth session.
- Rollback considerations: no destructive behavior to unwind.
- Risks: an auth success path that skips the status check becomes a security issue.
- Estimated complexity: Low.

### Backend B8: Keep Google OAuth start route deterministic and environment-safe

- Objective: provide a single stable Google entrypoint for the current SPA.
- Implementation details: keep `/auth/google`; validate `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; always redirect to the configured success or error callbacks.
- Dependencies: Infrastructure I1.
- Acceptance criteria: clicking Google consistently reaches the provider consent screen in configured environments.
- Rollback considerations: hide the CTA if the route must be disabled.
- Risks: callback or origin drift breaks the flow immediately.
- Estimated complexity: Medium.

### Backend B9: Preserve profile session management during hybrid auth

- Objective: keep `/profile/sessions` and `/profile/sessions/:id` useful while both session systems may coexist.
- Implementation details: list Better Auth sessions first; fall back to `refresh_sessions`; revoke through Better Auth when session id matches a Better Auth session, otherwise delete the legacy record.
- Dependencies: Backend B1, Frontend F5.
- Acceptance criteria: the settings page can display and revoke sessions regardless of which store created them.
- Rollback considerations: legacy listing and revocation remain available.
- Risks: session-id mismatch or missing token access can make revocation appear successful when it is not.
- Estimated complexity: Medium.

### Backend B10: Keep auth release isolated from notification logic

- Objective: ensure the auth migration does not implicitly rewrite or destabilize overdue email flows.
- Implementation details: do not change `emailViewModel`, `emailService`, or task ownership semantics except where verification requires targeted assertions.
- Dependencies: Notification N1-N3.
- Acceptance criteria: auth code changes do not modify recipient resolution contracts.
- Rollback considerations: none beyond normal code rollback.
- Risks: unrelated refactors hidden in the auth branch can widen blast radius.
- Estimated complexity: Low.

## Frontend

### Frontend F1: Preserve existing auth service contract

- Objective: keep frontend auth state management stable while the backend moves underneath it.
- Implementation details: continue using `authService.setSession`, `getToken`, `getUser`, `clearAuth`, and `getDefaultRouteByRole`; keep compatibility JWT handling centralized.
- Dependencies: Backend B3.
- Acceptance criteria: existing pages continue to consume auth state without codebase-wide rewrites.
- Rollback considerations: frontend can still talk to a legacy backend contract if needed.
- Risks: fragmented token persistence logic creates subtle regressions.
- Estimated complexity: Low.

### Frontend F2: Keep silent cookie bootstrap in `ProtectedRoute`

- Objective: let Better Auth cookie sessions restore access transparently.
- Implementation details: preserve the route guard pattern that attempts `/auth/session` when local auth is missing before redirecting to `/login`.
- Dependencies: Backend B3.
- Acceptance criteria: a user returning from OAuth or opening a fresh tab with a valid cookie can access protected routes without manual login.
- Rollback considerations: route guard can fall back to localStorage-only checks if necessary.
- Risks: redirect flicker and loading-state regressions on slow networks.
- Estimated complexity: Medium.

### Frontend F3: Keep silent cookie bootstrap in `AuthRoute`

- Objective: avoid showing login or register screens to users who already have a valid Better Auth session.
- Implementation details: keep `/auth/session` bootstrap on auth pages; redirect authenticated users to the proper role-based default route.
- Dependencies: Backend B3.
- Acceptance criteria: `/login` and `/register` immediately redirect authenticated users after successful bootstrap.
- Rollback considerations: revert to simple local token checks if hybrid auth is rolled back.
- Risks: looping between login and protected routes if bootstrap errors are mishandled.
- Estimated complexity: Medium.

### Frontend F4: Keep Google CTA behavior consistent on login and register

- Objective: provide a predictable OAuth entry experience.
- Implementation details: both auth pages should redirect to the same `authService.getGoogleAuthUrl()`; loading states should prevent double clicks; success and failure query params should be handled consistently.
- Dependencies: Backend B8.
- Acceptance criteria: both pages start the same provider flow and surface errors predictably.
- Rollback considerations: CTA can be hidden without affecting local auth.
- Risks: duplicated page-specific logic drifts over time.
- Estimated complexity: Low.

### Frontend F5: Keep session-management UI compatible with hybrid sessions

- Objective: prevent the settings page from becoming misleading during the migration window.
- Implementation details: continue consuming `/profile/sessions`; ensure session count and revoke actions do not assume a single backing store.
- Dependencies: Backend B9.
- Acceptance criteria: session count and revocation flows remain usable after Better Auth rollout.
- Rollback considerations: unchanged route contract keeps rollback simple.
- Risks: UI says revoke succeeded while a Better Auth session remains active on another device.
- Estimated complexity: Medium.

### Frontend F6: Preserve error-copy quality for OAuth collision scenarios

- Objective: turn a security-mandated block into an understandable user experience.
- Implementation details: map `oauth=error` and known error codes into user-safe toasts; explain that a password login is required first when the account is not linked.
- Dependencies: Backend B8.
- Acceptance criteria: local-only users who try Google understand the next safe step.
- Rollback considerations: error parsing can be simplified if OAuth is removed.
- Risks: vague copy generates support tickets and failed sign-in churn.
- Estimated complexity: Low.

## Database

### Database D1: Keep `users` as the single business identity collection

- Objective: prevent ownership fragmentation.
- Implementation details: verify Better Auth continues to reuse `users` rather than create a separate user collection; confirm `_id` remains the same identifier used by tasks, notifications, and audit logs.
- Dependencies: Backend B1.
- Acceptance criteria: new Google users and migrated local users are both represented in `users`.
- Rollback considerations: this is the core compatibility guarantee and should not be reverted lightly.
- Risks: a second identity namespace would break ownership logic everywhere.
- Estimated complexity: High.

### Database D2: Maintain additive schema evolution only

- Objective: keep migrations rollback-safe.
- Implementation details: preserve additive changes like `emailVerified`; allow `passwordHash` to be nullable; avoid removing or renaming existing business fields.
- Dependencies: none.
- Acceptance criteria: old code paths still understand the evolved `users` documents.
- Rollback considerations: additive fields can remain even if auth logic rolls back.
- Risks: destructive schema changes make emergency rollback much harder.
- Estimated complexity: Low.

### Database D3: Keep Better Auth side collections isolated

- Objective: avoid mixing session and provider internals into legacy stores.
- Implementation details: keep `better_auth_accounts`, `better_auth_sessions`, and `better_auth_verifications` separate; do not write Better Auth session state into `refresh_sessions`.
- Dependencies: Backend B1.
- Acceptance criteria: Better Auth sign-ins create records only in the intended side collections.
- Rollback considerations: dormant side collections can remain after rollback.
- Risks: store mixing complicates debugging, auditing, and cleanup.
- Estimated complexity: Low.

### Database D4: Validate provider synchronization into `users.providers`

- Objective: preserve admin analytics and profile display behavior.
- Implementation details: verify Better Auth account create, update, and delete hooks correctly sync the denormalized provider list; ensure `credential` becomes `local`.
- Dependencies: Backend B2.
- Acceptance criteria: provider analytics and UI badges remain accurate for local and Google users.
- Rollback considerations: provider sync can be disabled without touching core identity rows.
- Risks: inaccurate provider state breaks admin reporting and support diagnostics.
- Estimated complexity: Medium.

### Database D5: Prepare and validate credential backfill script

- Objective: reduce lazy-migration load during rollout.
- Implementation details: keep `auth:backfill` idempotent; validate logging and sample output; confirm it does not modify Google-only users or users without `passwordHash`.
- Dependencies: Backend B5.
- Acceptance criteria: staging backfill completes safely and can be rerun without duplicate account links.
- Rollback considerations: no destructive data deletion is required.
- Risks: partial failures can leave migration coverage inconsistent unless logged clearly.
- Estimated complexity: Medium.

## Infrastructure

### Infrastructure I1: Standardize environment variables for all tiers

- Objective: make auth behavior deterministic across development, staging, and production.
- Implementation details: define and document `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_URL`, `CORS_ORIGIN`, `JWT_SECRET`, and `JWT_REFRESH_SECRET`.
- Dependencies: none.
- Acceptance criteria: each environment can boot without missing-config auth failures.
- Rollback considerations: extra env vars are safe to leave in place.
- Risks: one incorrect URL or origin can break OAuth or cookie bootstrap.
- Estimated complexity: Low.

### Infrastructure I2: Gate `@better-auth/infra` behind optional env presence

- Objective: adopt Better Auth best practice without making external infra a hard dependency.
- Implementation details: enable `dash` and `sentinel` only when API key and related infra vars are present; document this as optional hardening.
- Dependencies: Infrastructure I1.
- Acceptance criteria: the app authenticates correctly whether infra credentials are configured or not.
- Rollback considerations: remove env vars to disable infra integration.
- Risks: accidental hard dependency turns an observability outage into a login outage.
- Estimated complexity: Low.

### Infrastructure I3: Verify OAuth callback registration per environment

- Objective: prevent environment-specific callback failures.
- Implementation details: register exact Better Auth callback URLs in the Google console for development, staging, and production; verify the SPA success/error redirect URLs align with `APP_URL`.
- Dependencies: Infrastructure I1.
- Acceptance criteria: OAuth completes successfully in every supported environment.
- Rollback considerations: local auth remains usable while provider callbacks are repaired.
- Risks: mismatched callback registrations are one of the most common production auth failures.
- Estimated complexity: Medium.

## Security

### Security S1: Keep implicit social linking disabled

- Objective: prevent local-account takeover during phase 1.
- Implementation details: preserve Better Auth account-linking config with `disableImplicitLinking: true`; verify no custom fallback code links by email automatically.
- Dependencies: Backend B1.
- Acceptance criteria: Google cannot silently attach to a legacy local account with the same email.
- Rollback considerations: config-only and easy to revert later after a dedicated linking design exists.
- Risks: enabling implicit linking prematurely is a severe security regression.
- Estimated complexity: Low.

### Security S2: Preserve short-lived compatibility JWTs

- Objective: minimize the risk window while localStorage transport still exists.
- Implementation details: keep JWT minting short-lived; mint only from a valid Better Auth session or a temporary allowed legacy refresh session.
- Dependencies: Backend B6.
- Acceptance criteria: a revoked Better Auth session cannot be used to mint fresh JWTs indefinitely.
- Rollback considerations: legacy JWT settings already exist.
- Risks: overly long JWT lifetimes weaken the migration’s security posture.
- Estimated complexity: Low.

### Security S3: Verify cookie security in staging and production

- Objective: ensure Better Auth sessions are carried safely by the browser.
- Implementation details: validate `HttpOnly`, `Secure` in production, correct same-site behavior, and trusted-origin compatibility for the deployed topology.
- Dependencies: Infrastructure I1.
- Acceptance criteria: browser receives and returns the expected cookies without cross-origin breakage.
- Rollback considerations: cookie config is reversible.
- Risks: incorrect cookie config produces silent auth breakage or weakens session security.
- Estimated complexity: Medium.

### Security S4: Protect auth and OAuth logs from sensitive data leakage

- Objective: make debugging possible without exposing secrets or tokens.
- Implementation details: log provider, route, and error code only; never log raw cookies, session tokens, JWTs, or provider secrets.
- Dependencies: Monitoring rollout tasks.
- Acceptance criteria: auth failure logs are useful but sanitized.
- Rollback considerations: logging verbosity can be reduced quickly if needed.
- Risks: token leakage in logs becomes a security incident.
- Estimated complexity: Medium.

## Notification System Validation

### Notification N1: Validate overdue recipient resolution before and after migration

- Objective: prove auth changes do not alter who receives overdue notifications.
- Implementation details: seed or inspect tasks with known `ownerId`; compare recipient resolution through `User._id`, `User.email`, and notification preferences before and after Better Auth login activity.
- Dependencies: Database D1.
- Acceptance criteria: the same overdue tasks resolve to the same users and emails before and after migration.
- Rollback considerations: none required.
- Risks: hidden user-shape regressions can break email delivery silently.
- Estimated complexity: Medium.

### Notification N2: Validate unsubscribe behavior after Better Auth adoption

- Objective: ensure auth changes do not break public unsubscribe links.
- Implementation details: verify the HMAC token flow still works through `/profile/notifications/unsubscribe`; confirm preference flags persist on the same user row.
- Dependencies: Security S4.
- Acceptance criteria: users can still unsubscribe from overdue and digest emails from a link in the email.
- Rollback considerations: independent of auth rollback path.
- Risks: secret rotation or user-shape regression can invalidate unsubscribe handling.
- Estimated complexity: Medium.

### Notification N3: Validate scheduler independence from session state

- Objective: prove cron behavior is session-agnostic.
- Implementation details: run overdue evaluator, queue processor, digest sender, and retry queue with no active browser sessions; confirm they continue to operate using persisted task and user data only.
- Dependencies: Backend B10.
- Acceptance criteria: cron jobs run successfully regardless of interactive auth activity.
- Rollback considerations: none required.
- Risks: accidental coupling to request-time auth context would be a serious architectural regression.
- Estimated complexity: Medium.

## Testing

### Testing T1: Add auth compatibility regression coverage

- Objective: lock down the hybrid auth contract.
- Implementation details: cover register, login, refresh, logout, cookie bootstrap, and Google start route behavior with route-level or integration tests; mock Better Auth where appropriate.
- Dependencies: Backend B3-B8.
- Acceptance criteria: automated tests exist for happy paths and expected failures.
- Rollback considerations: tests remain useful even if rollout pauses.
- Risks: insufficient test coverage increases rollout risk substantially.
- Estimated complexity: High.

### Testing T2: Re-run overdue notification tests after auth dependency changes

- Objective: detect collateral regressions caused by Better Auth package upgrades.
- Implementation details: execute existing overdue email test suites and confirm recipient resolution, retry behavior, and unsubscribe cryptography still work.
- Dependencies: Notification N1-N3.
- Acceptance criteria: existing overdue-notification coverage remains green or known failures are documented.
- Rollback considerations: none.
- Risks: auth dependency upgrades may surface unrelated module or runtime incompatibilities.
- Estimated complexity: Medium.

### Testing T3: Re-run profile and settings session-management tests

- Objective: verify the session-management UX still matches backend behavior.
- Implementation details: test settings page loading, session count rendering, and session revocation under Better Auth and legacy fallback conditions.
- Dependencies: Backend B9, Frontend F5.
- Acceptance criteria: session-management UI remains functional during the hybrid window.
- Rollback considerations: unchanged route contracts help preserve test value.
- Risks: a misleading settings UI can create production support issues even if login itself works.
- Estimated complexity: Medium.

### Testing T4: Run targeted manual browser tests for OAuth redirect and bootstrap flows

- Objective: catch issues that mocks often miss.
- Implementation details: manually verify Google sign-in, `/login?oauth=success`, `/login?oauth=error`, fresh-tab resume, expired-session redirect, and protected-route bootstrap.
- Dependencies: Infrastructure I3, Frontend F2-F4.
- Acceptance criteria: the real browser flow behaves as documented in staging.
- Rollback considerations: manual test notes remain useful for incident response.
- Risks: cookie, redirect, and callback problems frequently evade unit tests alone.
- Estimated complexity: Medium.

## Documentation

### Documentation DOC1: Align migration docs with runtime truth, not stale OAuth docs

- Objective: stop the team from following old Passport-era assumptions.
- Implementation details: explicitly document that pre-migration runtime auth was JWT plus `refresh_sessions`; note that older docs mentioning Passport or GitHub OAuth are historical, not authoritative for current rollout work.
- Dependencies: architecture analysis complete.
- Acceptance criteria: engineers can read this folder and understand the actual runtime starting point.
- Rollback considerations: docs remain historically accurate either way.
- Risks: stale documentation causes wrong implementation and bad incident triage.
- Estimated complexity: Low.

### Documentation DOC2: Document the notification dependency map inside auth migration docs

- Objective: make it obvious that auth changes can still break email systems indirectly through user-shape changes.
- Implementation details: document dependency on `Task.ownerId`, `User._id`, `User.email`, `preferredLanguage`, `notificationPreferences`, and `NotificationLog`.
- Dependencies: Notification N1-N3.
- Acceptance criteria: migration readers understand exactly why `users` shape stability matters.
- Rollback considerations: none.
- Risks: teams underestimate blast radius if this coupling is not explicit.
- Estimated complexity: Low.

## Migration

### Migration M1: Run Better Auth credential backfill in staging

- Objective: reduce first-login migration load and reveal data-shape issues before production.
- Implementation details: execute `npm run auth:backfill`; capture total migrated count; inspect sample user/account records.
- Dependencies: Database D5, Infrastructure I1.
- Acceptance criteria: staging backfill completes successfully and is safe to rerun.
- Rollback considerations: additive writes only.
- Risks: staging data may not expose all production edge cases.
- Estimated complexity: Medium.

### Migration M2: Release hybrid auth with fallback enabled for one full legacy session horizon

- Objective: protect active production sessions from forced logout.
- Implementation details: leave legacy refresh fallback in place for at least the configured legacy refresh lifetime; monitor usage decay.
- Dependencies: Backend B6.
- Acceptance criteria: production users already logged in before release do not all need to reauthenticate immediately.
- Rollback considerations: fallback remains the emergency bridge.
- Risks: supporting two systems too long increases operational complexity.
- Estimated complexity: Low.

### Migration M3: Define exit criteria for retiring legacy refresh sessions

- Objective: avoid permanent auth duality.
- Implementation details: define a metric threshold for low legacy fallback usage; document a separate cleanup release for removing `refresh_sessions` dependency after the threshold is met.
- Dependencies: observability and analytics in production.
- Acceptance criteria: the team has a concrete, measurable retirement plan rather than an indefinite hybrid state.
- Rollback considerations: do not remove fallback until evidence is strong.
- Risks: premature retirement strands low-frequency but still-valid users.
- Estimated complexity: Medium.

### Migration M4: Define explicit policy for future authenticated account linking

- Objective: prepare the next phase without weakening phase 1 security.
- Implementation details: require an authenticated session, recent reauthentication, and a verified trust model before allowing a local account to link Google.
- Dependencies: Security S1.
- Acceptance criteria: future linking work has a documented secure starting point.
- Rollback considerations: documentation-only for phase 1.
- Risks: pressure to ship convenient linking can bypass security reasoning if policy is not written down.
- Estimated complexity: Medium.
