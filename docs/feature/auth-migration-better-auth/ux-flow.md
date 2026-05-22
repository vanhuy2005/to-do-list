# Better Auth Migration UX Flow

## 1. UX goals

- preserve the familiar Task.Do auth experience for existing users
- add Google sign-in without creating confusion between local and social accounts
- allow silent session recovery after OAuth redirects and fresh page loads
- keep error states explicit, safe, and easy to recover from

## 2. Login UX

### Email/password path

The `/login` page remains the primary entry point for existing users.

Expected flow:

1. user enters email and password
2. form validates locally
3. backend authenticates through Better Auth or performs a safe lazy migration for legacy users
4. Better Auth sets the secure cookie session
5. frontend stores compatibility JWT and user payload
6. user is redirected by role

UX expectations:

- same page structure and visual language as the current app
- no new auth concepts exposed to the user
- no requirement to understand cookies versus tokens

## 3. Signup UX

### Email/password registration

The `/register` page remains simple and direct.

Expected flow:

1. user enters display name, email, password, and confirmation
2. frontend validates and submits
3. Better Auth creates the user and session
4. frontend receives compatibility JWT and user payload
5. user lands inside the product immediately

UX expectations:

- no unnecessary post-signup re-login step
- same role-based redirect rules as before
- same toast conventions as the current UI

## 4. Google OAuth UX

### Entry points

Google CTA should appear on:

- `/login`
- `/register`

CTA design expectations:

- secondary to email/password submit, not hidden
- visually obvious
- available in mobile single-column layout

### Happy path

1. user clicks Google CTA
2. browser redirects to Google consent
3. provider callback completes
4. browser returns to `/login?oauth=success`
5. `AuthRoute` silently bootstraps from the Better Auth cookie
6. user is redirected into the app

The user should perceive this as a normal social login flow, not a debug-style redirect handshake.

## 5. Session persistence behavior

### Silent bootstrap

If the browser has a valid Better Auth cookie but localStorage is empty:

- `AuthRoute` and `ProtectedRoute` attempt `GET /auth/session`
- frontend restores the compatibility JWT and user payload
- user continues without manual re-login

This is especially important for:

- OAuth return flows
- refreshing the tab
- opening a new tab
- localStorage clearing while cookies remain valid

### Expected loading behavior

During bootstrap checks:

- show a lightweight loading state
- avoid flashing the login page and then redirecting
- avoid loading protected content before auth is restored

## 6. Protected page redirects

### Anonymous user on protected route

Expected flow:

1. route sees no local token
2. route attempts cookie bootstrap
3. if bootstrap succeeds, render page
4. if bootstrap fails, redirect to `/login`

### Authenticated user on auth pages

Expected flow:

1. `/login` or `/register` loads
2. route checks existing session
3. if authenticated, redirect away to the default route for the user role

UX rule:

- no redirect loops
- no visible double-navigation on normal network conditions

## 7. Session expiration UX

### Expired compatibility JWT, valid Better Auth cookie

Expected behavior:

- API request returns `401`
- axios calls `/auth/refresh`
- backend mints a new compatibility JWT from the Better Auth session
- request retries silently

User experience:

- no forced logout
- no toast needed

### Expired Better Auth cookie

Expected behavior:

- refresh fails
- frontend clears local auth state
- user is redirected to `/login`

User experience:

- clear and unsurprising return to sign-in
- no broken half-authenticated state

## 8. Error handling UX

### Invalid local credentials

Display:

- normal error toast or inline validation pattern already used by the app

Message quality:

- direct and actionable
- no provider-internal terminology

### Google account not linked to a local-only legacy user

Display:

- safe, friendly explanation

Recommended copy direction:

- this Google account is not linked yet
- please sign in with your existing password first

### Generic OAuth failure

Display:

- return to login page
- show retry-safe message

Examples:

- user canceled consent
- provider callback failed
- callback URL misconfiguration

## 9. Role-based UX continuity

Current role-based navigation must remain unchanged:

- `admin` defaults to `/dashboard`
- `user` defaults to `/`

The auth migration should not introduce new landing-page logic during phase 1.

## 10. Settings and session management UX

The user-facing session area in settings should continue to work even during the hybrid rollout.

Expected behavior:

- session count remains visible
- current device remains identifiable when Better Auth can supply that information
- revoking another device works whether it is backed by Better Auth or legacy refresh storage

## 11. Invite onboarding future compatibility

This migration should leave room for:

- invite acceptance before account creation
- invite acceptance after Google OAuth
- authenticated account linking
- future workspace and organization membership flows

UX rule:

- phase 1 should not fake invite support before the underlying permission and membership model exists

## 12. Mobile responsiveness expectations

- auth forms remain single-column and tappable
- Google CTA stays above the fold on common mobile viewport heights
- loading states stay readable on slow mobile networks
- cookie bootstrap does not trap users in a spinner on weak connections

## 13. Accessibility expectations

- auth buttons remain keyboard reachable
- errors are visible and understandable without inspecting the network
- loading states communicate that session recovery is in progress
- redirect behavior should not disorient screen-reader users with repeated route churn

## 14. UX acceptance criteria

The migration meets UX expectations when:

- existing users can still log in exactly as before
- new users can sign up with Google with minimal friction
- OAuth return feels smooth and reliable
- protected pages do not prematurely redirect when a cookie-backed session exists
- expired sessions fail cleanly instead of leaving the app in a broken state
