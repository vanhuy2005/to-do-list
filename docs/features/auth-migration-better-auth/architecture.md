# Better Auth Migration Architecture

## 1. Current implemented architecture

### Backend auth reality

The current backend still exposes the original application contract under `/api/v1/auth`, but the internals are already partially migrated:

- `to-do-list/backend/src/routes/authRouters.js`
- `to-do-list/backend/src/viewmodels/authViewModel.js`
- `to-do-list/backend/src/services/betterAuthService.js`
- `to-do-list/backend/src/middleware/authMiddleware.js`
- `to-do-list/backend/src/server.js`

The business API authorization layer is still the legacy pattern:

1. frontend stores an access JWT in localStorage
2. frontend sends `Authorization: Bearer <token>`
3. `authMiddleware` verifies the JWT
4. middleware reloads `User` and attaches `req.user` plus `req.userId`
5. tasks, profile, admin, and audit routes consume those fields

### Frontend auth reality

The frontend is still contract-driven rather than Better Auth client-driven:

- `frontend/src/services/authService.js` stores `token` and `auth_user` in localStorage
- `frontend/src/lib/axios.js` injects the JWT and refreshes on `401`
- `frontend/src/components/ProtectedRoute.jsx` and `AuthRoute.jsx` now attempt cookie bootstrap via `/auth/session`
- `frontend/src/pages/LoginPage.jsx` and `RegisterPage.jsx` already expose a Google CTA

This means the frontend is in a hybrid state:

- Better Auth cookie sessions exist
- business API access still depends on compatibility JWTs

### Session stores in play

- `better_auth_sessions`: canonical new session store
- `refresh_sessions`: legacy refresh fallback store
- localStorage access token: frontend transport cache only

### Notification and scheduler architecture

The overdue notification system is intentionally decoupled from interactive sessions:

- `cronJobs.js` schedules background scans
- `emailViewModel.js` resolves recipients from persisted data
- `emailService.js` sends via Resend
- `NotificationLog` tracks pending, failed, sent, and abandoned deliveries

The critical dependency chain is:

1. cron scans `Task`
2. task points to `Task.ownerId`
3. owner resolves to `User._id`
4. `User.email`, `preferredLanguage`, and `notificationPreferences` drive the email
5. `NotificationLog` stores delivery lifecycle

No overdue scheduler path depends on:

- JWT claims
- current browser cookies
- Better Auth session state
- active login presence

## 2. Current-to-target architecture principle

The target architecture is intentionally layered:

- Better Auth becomes the source of truth for identity, cookie sessions, and OAuth.
- The existing app-specific JWT remains only as a temporary compatibility transport.
- The `users` collection remains the business identity backbone for the rest of the system.

This avoids rewriting:

- task ownership logic
- RBAC middleware
- admin analytics based on `users.providers`
- notification recipient resolution
- overdue schedulers and retry logic

## 3. Target architecture components

### Better Auth core

Mounted at:

- `ALL /api/v1/auth/core/*`

Responsibilities:

- provider flows
- session cookie lifecycle
- callback handling
- session revocation
- future native Better Auth endpoints

### Compatibility auth API

Public routes remain:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/session`
- `GET /api/v1/auth/google`

Responsibilities:

- preserve SPA response contracts
- translate Better Auth responses into app payloads
- forward Better Auth `Set-Cookie` headers
- mint compatibility JWTs
- keep legacy refresh fallback alive temporarily

### Legacy business authorization

Still owned by:

- `authMiddleware`
- `requireRole`
- `requirePermission`

Responsibilities:

- protect profile, task, audit, and admin APIs
- load role and permissions from `users`
- enforce `status !== "disabled"`

### Notification subsystem

Remains unchanged in principle:

- scheduler reads persisted tasks and users
- sender reads persisted email preferences
- no runtime auth lookup is required

## 4. Session lifecycle

### Email/password register

1. frontend submits to `POST /api/v1/auth/register`
2. compatibility route validates payload
3. Better Auth `signUpEmail` creates the user and cookie session
4. compatibility layer builds `data.accessToken` and `data.user`
5. frontend persists local auth state and navigates normally

### Email/password login

1. frontend submits credentials to `POST /api/v1/auth/login`
2. backend attempts Better Auth `signInEmail`
3. if credential account is missing, backend validates against legacy `users.passwordHash`
4. backend links a Better Auth credential account through lazy migration
5. backend retries Better Auth sign-in
6. Better Auth sets the session cookie
7. backend returns the compatibility JWT and user payload

### Refresh lifecycle

1. frontend request fails with `401`
2. axios interceptor calls `POST /api/v1/auth/refresh`
3. backend first checks Better Auth cookie session
4. if valid, backend mints a fresh compatibility JWT
5. if no Better Auth session is present, backend falls back to `refresh_sessions`
6. frontend retries the original request with the new JWT

### Cookie bootstrap lifecycle

1. browser loads `/login`, `/register`, or a protected route
2. route guard sees no local token
3. frontend calls `GET /api/v1/auth/session` with credentials enabled
4. backend validates Better Auth cookie
5. backend returns compatibility JWT and user payload
6. frontend repopulates localStorage and continues

### Logout lifecycle

1. frontend calls `POST /api/v1/auth/logout`
2. backend revokes the Better Auth cookie session
3. backend clears the legacy `refreshToken` cookie
4. backend deletes legacy `refresh_sessions` for the current user
5. frontend clears local auth state

## 5. Google OAuth flow

### Start flow

1. user clicks `Continue with Google`
2. browser navigates to `GET /api/v1/auth/google`
3. backend calls Better Auth `signInSocial`
4. Better Auth creates provider state and redirects to Google

### Callback flow

1. Google redirects back into Better Auth native callback routes under `/api/v1/auth/core`
2. Better Auth validates the provider response
3. Better Auth sets the secure cookie session
4. Better Auth redirects the browser to `APP_URL/login?oauth=success`

### Frontend resume flow

1. `AuthRoute` loads on `/login`
2. it attempts silent bootstrap via `/auth/session`
3. backend returns compatibility JWT plus user payload
4. frontend redirects to the role-appropriate landing page

### Account linking policy

Phase 1 policy is intentionally conservative:

- implicit linking is disabled
- Google is allowed for:
  - new users
  - already-linked users
- Google is blocked for:
  - legacy local-only users who merely share the same email

Reason:

- legacy local accounts do not have a verified-email trust chain
- linking them automatically would create account takeover risk

## 6. Middleware flow

### Backend middleware flow

1. Better Auth cookie session establishes canonical identity
2. compatibility route mints access JWT
3. protected business request sends JWT
4. `authMiddleware` resolves the app user from Mongo
5. role and permission checks continue unchanged

This architecture is acceptable because:

- Better Auth owns the true session
- the JWT is now only a transport shim
- business code does not need to know which login method created the session

### Frontend protected route flow

`ProtectedRoute` behavior:

1. if token exists, allow normal render
2. if token is missing, attempt cookie bootstrap
3. if bootstrap fails, redirect to `/login`
4. preserve `from` location for post-login resume

`AuthRoute` behavior:

1. always evaluate current auth state
2. if no local token, attempt cookie bootstrap
3. if authenticated after bootstrap, redirect away from auth pages
4. otherwise allow login or register screen

## 7. Notification system dependency mapping

### Recipient resolution dependencies

The notification system currently depends on:

- `Task.ownerId`
- `User._id`
- `User.email`
- `User.status`
- `User.notificationPreferences`
- `User.preferredLanguage`

The migration must not change any of those references.

### Queue processing dependencies

The queue processor depends on:

- `NotificationLog.status`
- `NotificationLog.retryCount`
- `NotificationLog.nextRetryAt`
- the continued ability to reload the owning user and task

The migration must not:

- add auth requirements to cron jobs
- make email sending dependent on session cookies
- replace user identity with a Better Auth-only external id

### Existing resilience already in code

If a user or task is missing during queue processing, the processor does not crash the app. It marks the log as `abandoned` and continues. This is important for production resilience and must remain true after migration.

## 8. Database relationship architecture

### Canonical identity

`users._id` remains the canonical identity for:

- `tasks.ownerId`
- `notification_logs.userId`
- `audit_logs.actorId`
- admin reporting and moderation

### Better Auth side collections

New collections are additive:

- `better_auth_accounts`
- `better_auth_sessions`
- `better_auth_verifications`

These collections must enrich identity and session management without becoming the new source of business ownership.

## 9. Migration strategy

### Phase 0: stabilize implementation reality

- confirm Better Auth bootstrap and cookie handling
- document actual code paths
- confirm Google callback and trusted origins
- confirm notification and scheduler invariants

### Phase 1: hybrid production rollout

- Better Auth handles new sessions and Google OAuth
- compatibility JWT continues to serve business APIs
- legacy refresh fallback remains available
- local and Google users coexist in the same `users` collection

### Phase 2: operational hardening

- run idempotent credential backfill in staging and optionally production
- instrument auth success, failure, refresh, and bootstrap metrics
- add explicit account-linking design for authenticated users

### Phase 3: transport retirement

- confirm near-zero `refresh_sessions` fallback usage
- migrate SPA to first-class Better Auth session consumption
- remove legacy refresh fallback in a separate release

## 10. Phased rollout strategy

### Development

- verify auth routes locally
- verify Google round trip
- verify session bootstrap on fresh tabs
- verify profile session listing and revocation

### Staging

- run backfill
- validate legacy-user login migration
- validate cron startup and overdue notification delivery
- validate Resend headers and unsubscribe links

### Production canary

- release with detailed monitoring
- watch login and refresh error rates
- watch OAuth callback failures
- watch `auth/session` bootstrap failures

### Full rollout

- keep rollback path active until fallback refresh usage is low
- do not remove legacy password hashes during the initial rollout window

## 11. Architecture decisions that must not change accidentally

- Do not replace `authMiddleware` with direct Better Auth checks in all business routes during phase 1.
- Do not rewrite task ownership to use provider account ids.
- Do not make cron or email delivery dependent on web request context.
- Do not auto-link Google to legacy local accounts until verified linking policy exists.
- Do not delete `refresh_sessions` before compatibility traffic ages out.
