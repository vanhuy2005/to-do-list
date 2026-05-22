# Better Auth Migration Security

## 1. Security objectives

- prevent account takeover during provider rollout
- keep session revocation trustworthy
- prevent sensitive auth material from leaking to the browser or logs
- keep disabled-user enforcement intact
- preserve rollback without weakening the production security posture

## 2. Threat model for this migration

Primary threats:

- implicit account takeover through unsafe Google email matching
- replay of legacy or stale session artifacts during hybrid rollout
- cookie misconfiguration causing broken or cross-origin session behavior
- provider callback misconfiguration causing silent login failures
- stale JWT acceptance after Better Auth revocation
- logging of secrets, tokens, or provider payloads

## 3. Canonical session security model

Phase 1 must have a single source of truth for active authentication:

- Better Auth cookie session

The compatibility JWT is intentionally not the source of truth. It exists only so the current SPA can keep using the existing protected API contract.

Security rule:

- a JWT may only be minted from:
  - a valid Better Auth session cookie
  - a temporary legacy refresh fallback that is still in the allowed coexistence window

## 4. Cookie strategy

Better Auth cookies should remain:

- `HttpOnly`
- `Secure` in production
- same-site scoped for the deployed topology
- sent only from trusted origins

Operational rule:

- legacy `refreshToken` cookies should be cleared on successful Better Auth login and logout

Why this matters:

- reduces coexistence confusion
- lowers the risk of a stale legacy cookie masking a session issue

## 5. OAuth security posture

### Safe default

Implicit social linking must remain disabled for phase 1.

### Why

The current application historically created local accounts without a trustworthy verified-email linking policy. If Google sign-in were allowed to auto-link by email alone, an attacker who controls a matching Google account could take over a legacy local account.

### Resulting behavior

- new Google users may sign up
- already-linked Google users may sign in
- legacy local-only users must continue using password until explicit linking is added

## 6. CSRF and origin protection

Better Auth must retain its built-in CSRF and trusted-origin protections.

Required env governance:

- `BETTER_AUTH_URL` must match the API host
- `BETTER_AUTH_TRUSTED_ORIGINS` must include the SPA origin
- `CORS_ORIGIN` must allow the same browser origins that are expected to use credentials

Operational rule:

- never disable origin checks as a quick fix for broken callbacks

## 7. Session expiration and replay mitigation

### Better Auth session expiry

Better Auth centrally manages cookie expiry and update age. That is the authoritative expiry signal.

### Compatibility JWT expiry

The compatibility JWT must remain short-lived so that:

- revocations converge quickly
- stolen localStorage tokens have reduced value
- the app naturally revalidates through Better Auth more often

### Replay mitigation rules

- revoked Better Auth sessions must no longer mint new compatibility JWTs
- `/auth/refresh` must check Better Auth first
- stale localStorage alone must not keep the session alive indefinitely

## 8. Disabled-user enforcement

The migration must not weaken business authorization.

Still required on protected APIs:

- user exists
- `user.status !== "disabled"`
- role is allowed
- permission set is allowed

Why this matters:

- Better Auth can confirm identity
- only the application can confirm business authorization and user lifecycle status

## 9. Account hijacking prevention

Required controls:

- keep `disableImplicitLinking: true`
- do not introduce auto-link fallback code outside Better Auth
- keep legacy password verification restricted to the lazy migration path
- add `emailVerified` for future safer linking, but do not treat all legacy accounts as verified retroactively

## 10. Secret handling

Required server-side secrets:

- `BETTER_AUTH_SECRET`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `GOOGLE_CLIENT_SECRET`
- `RESEND_API_KEY`

Optional infra secrets:

- `BETTER_AUTH_API_KEY`
- `BETTER_AUTH_API_URL`
- `BETTER_AUTH_KV_URL`

Rules:

- never expose secrets to the browser
- never print raw secrets in logs
- never check production values into source control

## 11. Secret rotation strategy

### Better Auth secret

- rotate independently from JWT secrets
- validate session behavior in staging before production rotation
- document expected reauthentication impact when applicable

### JWT secrets

- retain while compatibility JWT is still in use
- rotate separately from Better Auth to avoid bundling too many auth variables in one change event

### Google OAuth secrets

- rotate with callback validation in staging first
- confirm Google console callback URLs before production rollout

## 12. Logging and observability

Security-safe logging requirements:

- log route, environment, provider, and error code
- do not log raw cookies
- do not log raw JWTs
- do not log provider access tokens
- do not log Better Auth session tokens

Recommended monitored signals:

- OAuth start-to-success conversion
- OAuth callback error count
- `/auth/session` bootstrap failures
- `/auth/refresh` fallback usage volume
- Better Auth session revocation failures

## 13. Better Auth infra plugin posture

`@better-auth/infra` is optional hardening, not a requirement for base login success.

Security rule:

- infra plugins such as `dash` and `sentinel` may be enabled only when their env vars are present
- core auth must still work when infra credentials are absent

This prevents a telemetry or anti-abuse dependency outage from becoming a full authentication outage.

## 14. Frontend storage posture

Current reality:

- localStorage still stores a short-lived access JWT and user payload

Security implications:

- treat localStorage as a temporary compatibility layer only
- avoid storing refresh tokens there
- rely on the Better Auth cookie session for canonical continuity

Longer-term direction:

- move away from transport-state dependency on localStorage once the SPA fully adopts Better Auth session semantics

## 15. Notification and email security considerations

The auth migration must not break:

- unsubscribe token generation
- Resend sender configuration
- preference-based recipient filtering

Important note:

- unsubscribe links are verified with a server-side HMAC derived from `JWT_SECRET`
- rotating JWT secrets therefore has email-side operational consequences and should be coordinated carefully

## 16. Security acceptance criteria

Before production rollout, confirm:

- Google cannot silently take over a local-only legacy account
- revoked Better Auth sessions stop new JWT minting
- disabled users remain blocked from protected APIs
- Better Auth cookies are set and cleared correctly in staging
- no auth logs contain raw secrets or tokens
- fallback refresh usage is observable
