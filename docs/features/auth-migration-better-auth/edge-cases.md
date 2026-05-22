# Better Auth Migration Edge Cases

## 1. Duplicate Google account versus existing local account

Scenario:

- a user already has a legacy local account
- Google returns the same email
- the account has never been explicitly linked

Risk:

- unsafe account takeover if linked automatically

Expected handling:

- block implicit linking
- redirect to login with a safe explanation
- instruct the user to continue with password until explicit linking exists

## 2. Existing email collision during OAuth sign-up

Scenario:

- a first-time Google sign-up collides with an existing `users.email`

Risk:

- ambiguous ownership
- support confusion

Expected handling:

- no automatic merge
- no new second business identity row
- return a recoverable error state

## 3. Partially migrated credential users

Scenario:

- user exists in `users`
- `passwordHash` exists
- no Better Auth credential account exists yet

Expected handling:

- validate password against legacy hash
- create Better Auth credential account
- retry Better Auth sign-in
- keep the flow invisible to the user

Operational note:

- this path must be idempotent and heavily monitored during early rollout

## 4. Expired compatibility JWT with valid Better Auth cookie

Scenario:

- local JWT expired
- Better Auth cookie session is still valid

Expected handling:

- `/auth/refresh` should mint a new compatibility JWT
- user should remain signed in

## 5. Stale legacy refresh cookie with no Better Auth session

Scenario:

- browser still holds a legacy `refreshToken`
- Better Auth session does not exist

Expected handling:

- allow temporary fallback to `refresh_sessions`
- use this only during the hybrid coexistence window

Risk:

- support complexity if this window stays open too long

## 6. Revoked Better Auth session

Scenario:

- session revoked from another device or admin action

Expected handling:

- `/auth/refresh` must stop issuing compatibility JWTs
- route bootstrap through `/auth/session` must fail
- frontend clears auth state and returns to login

## 7. OAuth callback failure

Scenario:

- user cancels consent
- provider returns an error
- callback URL is wrong
- trusted origin is misconfigured

Expected handling:

- return to `/login?oauth=error`
- show a safe retry message
- avoid partial or stale local auth state

## 8. Stale localStorage user data

Scenario:

- user payload remains in localStorage
- Better Auth session has expired

Expected handling:

- protected API requests fail
- refresh fails
- frontend clears local state
- no access should continue based on stale local data

## 9. Disabled user with a valid Better Auth session

Scenario:

- user was disabled after login

Risk:

- provider session may still exist while business access should not

Expected handling:

- protected APIs still block the user through `authMiddleware`
- session bootstrap should not grant business access beyond the disabled-user check

## 10. Resend outage during auth rollout

Scenario:

- auth release is deployed
- Resend experiences transient failure

Expected handling:

- login remains independent from Resend
- email queue marks notification logs as `failed`
- retry scheduler continues with exponential backoff

Important point:

- auth migration must not couple login success to email infrastructure health

## 11. Scheduler and auth desynchronization

Scenario:

- there are no active user sessions
- cron still needs to send overdue email

Expected handling:

- scheduler continues to operate purely from persisted data
- no auth context should be required

## 12. Deleted users with pending notification logs

Scenario:

- a user is deleted or becomes unreadable
- `notification_logs` still contain pending items

Current runtime behavior:

- queue processing loads `User`
- if the user is missing or inactive, the log is marked `abandoned`
- TTL index later expires old logs after 90 days

Expected documentation stance:

- do not claim cascade delete exists unless it is actually implemented

## 13. Deleted or completed task after queueing

Scenario:

- overdue notification log is already pending
- task is completed or deleted before send attempt

Expected handling:

- queue processor marks the log `abandoned`
- no email is sent

## 14. Orphaned tasks

Scenario:

- task exists with `ownerId` referencing a missing user

Risk:

- task still exists but recipient resolution fails

Expected handling:

- scheduler skips or abandons downstream delivery safely
- rollout audits should identify orphan rates before and after migration

## 15. Broken task ownership references caused by identity remapping

Scenario:

- Better Auth generates a user id different from Mongo `_id`

Risk:

- all existing task, audit, and notification ownership references become invalid

Expected handling:

- explicitly prevented by reusing the `users` collection and Mongo `_id`
- this should be validated in staging with migrated and OAuth-created users

## 16. Legacy refresh-only active users during deployment

Scenario:

- a user is already online before the auth release
- only a legacy refresh session exists

Expected handling:

- refresh keeps working temporarily
- user is not forced to reauthenticate on rollout day
- traffic is monitored until the fallback can be retired

## 17. Google-only new users and local-only legacy users coexisting

Scenario:

- production contains a mixed population immediately after launch

Expected handling:

- both user types live in the same `users` collection
- `providers` reflects linked auth methods
- task ownership and notifications remain identical regardless of login method

## 18. Better Auth infra plugin unavailable

Scenario:

- `@better-auth/infra` plugins are configured in some environments but not others
- infra service is unavailable or env vars are absent

Expected handling:

- core auth still works
- optional anti-abuse or telemetry features degrade gracefully

## 19. Session list mixing Better Auth and legacy sessions

Scenario:

- a user has both new Better Auth sessions and old legacy sessions during rollout

Expected handling:

- settings UI still shows a usable list
- revocation continues to work for either backing store
- support documentation must explain temporary dual-store behavior

## 20. Rollback after partial provider adoption

Scenario:

- some users have already signed in with Google
- rollback is required for a broader auth regression

Expected handling:

- Better Auth collections remain intact
- local users keep `passwordHash`
- rollback focuses on route behavior, not destructive data deletion
- rollback plan must explicitly state what happens to Google-only users if the fallback app cannot authenticate them
