# Better Auth Migration API Design

## 1. API design principles

- preserve the current SPA contract during phase 1
- keep Better Auth behind compatibility endpoints wherever possible
- avoid forcing business routes to understand provider-specific auth internals
- make OAuth entry and resume flows explicit
- keep rollback easy by separating public auth compatibility routes from business APIs

## 2. Public auth compatibility endpoints

### `POST /api/v1/auth/register`

Purpose:

- preserve the current registration contract
- create a Better Auth user and session
- return a compatibility JWT and app-shaped user payload

Request body:

- `email`
- `password`
- `displayName`

Behavior:

1. validate payload locally
2. call Better Auth `signUpEmail`
3. forward Better Auth `Set-Cookie` headers
4. build `data.accessToken`
5. build `data.user`

Response contract:

- `success: true`
- `data.accessToken`
- `data.user`
- `message`

Backward-compatibility note:

- frontend should not need a new response parser

### `POST /api/v1/auth/login`

Purpose:

- preserve the current login contract
- support both already-migrated and legacy-local users

Request body:

- `email`
- `password`

Behavior:

1. normalize email
2. attempt Better Auth `signInEmail`
3. if credential account is missing or rejected, attempt legacy password validation
4. if legacy password is valid, create the Better Auth credential link
5. retry Better Auth sign-in
6. return compatibility JWT and user payload

Response contract:

- `success: true`
- `data.accessToken`
- `data.user`
- `message`

Failure notes:

- disabled users must still be rejected
- invalid password must not leak whether the account is local-only or linked

### `POST /api/v1/auth/refresh`

Purpose:

- keep the axios refresh interceptor functional without a frontend rewrite

Behavior:

1. validate Better Auth cookie session first
2. if valid, mint a fresh compatibility JWT
3. if absent, attempt legacy `refresh_sessions` fallback
4. return only the new access token

Response contract:

- `success: true`
- `data.accessToken`

Key rule:

- Better Auth session takes precedence over a stale legacy cookie

### `POST /api/v1/auth/logout`

Purpose:

- preserve the current logout action for the SPA

Behavior:

1. require business auth middleware for the active user context
2. call Better Auth `signOut`
3. clear legacy `refreshToken` cookie
4. delete the user’s legacy `refresh_sessions`
5. return success message

Response contract:

- `success: true`
- `message`

### `GET /api/v1/auth/session`

Purpose:

- bootstrap frontend state from Better Auth cookie sessions

Used by:

- `AuthRoute`
- `ProtectedRoute`
- OAuth return flow
- fresh-tab recovery

Behavior:

1. inspect Better Auth cookies
2. load the corresponding application user
3. mint compatibility JWT
4. return user payload

Response contract:

- `success: true`
- `data.accessToken`
- `data.user`

### `GET /api/v1/auth/google`

Purpose:

- provide a stable frontend entrypoint for Google OAuth

Behavior:

1. verify Google env vars exist
2. call Better Auth `signInSocial`
3. forward Better Auth headers
4. redirect the browser to Google

Response characteristics:

- typically `302`
- may return JSON only in exceptional flows

## 3. Better Auth native mount

### `ALL /api/v1/auth/core/*`

Purpose:

- allow Better Auth to own provider callbacks and native session internals

Typical responsibilities:

- Google callback handling
- Better Auth native session APIs
- verification endpoints

Design rule:

- frontend should not depend directly on native Better Auth endpoints during phase 1 except through browser redirects managed by Better Auth itself

## 4. Protected API strategy

### Business APIs remain unchanged

Protected route groups still use:

- `/api/v1/profile`
- `/api/v1/tasks`
- `/api/v1/voice-task`
- `/api/v1/voice/stt`
- `/api/v1/admin`
- `/api/v1/audit-logs`

Protection still happens through:

- `authMiddleware`
- `requireRole`
- `requirePermission`

### Why this matters

Task, profile, admin, and notification-related business logic already assume:

- `req.user`
- `req.userId`
- RBAC permissions derived from the `users` document

Keeping that contract avoids rewriting large parts of the application.

## 5. API compatibility layer responsibilities

The compatibility layer must do all of the following:

- translate Better Auth user/session results into the existing app response shape
- forward Better Auth cookies to the browser
- keep current route URLs stable
- keep local user payload fields stable:
  - `id`
  - `email`
  - `displayName`
  - `role`
  - `status`
  - `providers`
  - `permissions`

It must not:

- expose raw Better Auth internals to the current SPA
- break existing toast and redirect flows
- require task or profile routes to parse Better Auth session state

## 6. Google OAuth endpoint design

### Start URL

- `GET /api/v1/auth/google`

### Redirect targets

- success: `APP_URL/login?oauth=success`
- failure: `APP_URL/login?oauth=error`

### Frontend behavior

- the login page should parse query params
- known OAuth errors should map to human-readable messages
- the frontend should not assume a token is returned directly from Google

### Safe collision behavior

When Google returns an email already present in a legacy local account:

- do not auto-link
- redirect back with an explanatory error state

## 7. Session endpoints and profile compatibility

### `GET /api/v1/profile/sessions`

Purpose:

- keep the current settings/session management UI functional

Behavior:

1. try Better Auth `getSession` and `listSessions`
2. if Better Auth sessions exist, normalize them into the current UI shape
3. if Better Auth lookup fails or returns nothing useful, fall back to `refresh_sessions`

Response contract:

- array of session items containing:
  - `id`
  - `userAgent`
  - `ipAddress`
  - `createdAt`
  - `isCurrent`

### `DELETE /api/v1/profile/sessions/:id`

Purpose:

- revoke a single device session

Behavior:

1. try to match the id against Better Auth sessions
2. revoke using the underlying Better Auth session token
3. if no Better Auth session matches, fall back to deleting a legacy `refresh_sessions` record

Compatibility note:

- the UI continues to operate on session ids and does not need to know which store owns the session

## 8. Error model

### Preserve existing application error envelope

Error responses should remain:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

### Error translation rules

- Better Auth provider and session errors must be translated into app-level codes
- raw provider secrets or tokens must never be returned
- legacy and Better Auth failures should converge on stable, user-safe messages where possible

## 9. Auth validation flow

### Register validation

- validate email format
- validate minimum password length
- validate `displayName` length
- do not rely exclusively on provider-side validation for user-facing error quality

### Login validation

- require email and password
- normalize email case and whitespace
- reject disabled users even if the provider auth step succeeded

### Refresh validation

- prefer Better Auth cookie validation first
- keep legacy refresh as a temporary bridge only

## 10. Why existing APIs remain functional

Existing APIs remain functional because:

- they still receive `req.userId`
- they still receive `req.user.role`
- permissions are still computed from the same role config
- task and notification code does not depend on session implementation details

## 11. API evolution roadmap

### Phase 1

- keep compatibility endpoints and legacy JWT transport

### Phase 2

- add explicit account-linking endpoints for authenticated users
- add auth metrics and session diagnostics

### Phase 3

- deprecate legacy refresh fallback
- move frontend toward first-class Better Auth client usage
- simplify auth endpoints once compatibility transport is no longer required
