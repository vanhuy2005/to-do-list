# Stitch Runbook: Generate All Screens in Fewer Iterations

Goal: generate the full screen set with consistent Pop Art style in as few Stitch iterations as possible.

## Fast strategy (3 passes)
- Pass 1: lock visual system with foundation screens.
- Pass 2: generate all user screens with shared components.
- Pass 3: generate all admin screens + edge states.

Use the exact same global context block in every pass.

---

## Global Context Block (paste first in every Stitch run)
"Design a mobile-first productivity app named To-Do Pop. Style is bold Pop Art inspired by comic books and ad posters. Use thick black outlines, high-contrast fills, comic-offset shadows, and clear hierarchy. Palette: #FF2D55 (primary), #FFD60A (highlight), #00C2FF (secondary), #111111 (outline), #FFFDF7 (base). Keep UX action-first and readable. Vietnamese-first labels with bilingual-ready layout. Ensure role-aware UX for user/admin. Include loading, empty, error, and confirmation states."

---

## Pass 1 — Foundation Lock (4 screens)
Purpose: freeze style tokens, spacing rhythm, typography scale, and component language.

### Prompt A1
"Using the global context, generate these screens with identical style tokens and component language:
1) Splash / Brand Intro
2) Login
3) Register
4) Task Home (List)

Requirements:
- establish final button, input, chip, card, modal visual patterns.
- include one loading state and one empty state variant on Task Home.
- export consistent spacing rules and reusable component behavior notes."

### Acceptance gate for Pass 1
- Outline thickness and shadow style are identical across all 4 screens.
- CTA hierarchy is consistent (red primary, yellow highlight, cyan secondary).
- Typography scales and label casing are stable.
- If this gate fails, refine only these 4 screens once, then proceed.

---

## Pass 2 — User Experience Expansion (12 screens)
Purpose: build complete end-user flow without visual drift.

### Prompt B1
"Reuse the exact visual system from Pass 1. Generate these user screens:
1) OAuth Linking Verification
2) Forgot Password
3) Task Board
4) Task Filter Page
5) Task Search Result Page
6) Task Detail
7) Add Task Modal
8) Edit Task Modal
9) Delete Confirmation Modal
10) Profile
11) Settings
12) Linked Providers Management Modal

Requirements:
- bottom nav must be exactly: Tasks, Profile, Settings.
- Add Task action opens modal (not full page).
- destructive actions must show 7-day restore policy.
- keep same card/button/input styles as Pass 1."

### Prompt B2 (optional if needed)
"Generate Session Devices Modal and Notifications/Activity page using the same style lock from Pass 1 and Pass 2."

### Acceptance gate for Pass 2
- User nav and flow are coherent end-to-end.
- No component style drift from Pass 1.
- Modals use one shared visual template.

---

## Pass 3 — Admin Suite (14 screens)
Purpose: generate complete governance/admin UX in one cohesive batch.

### Prompt C1
"Reuse the exact visual system from Pass 1. Generate these admin screens:
1) Admin Home Dashboard
2) Admin Analytics
3) Admin Users
4) Admin Add User
5) Admin Edit User Modal
6) Admin User Filter
7) Admin Task Moderation
8) Admin Task Filter
9) Admin Audit Logs
10) Admin Settings
11) Admin Trash
12) Global Success Toast
13) Global Error Modal
14) Global Confirm Modal

Requirements:
- admin nav: Home, Analytics, Users, Tasks, Audit Logs, Settings, Trash.
- include filters and search patterns matching user pages.
- include soft-delete + restore (7-day window) messaging.
- maintain same visual tokens and component anatomy from Pass 1."

### Acceptance gate for Pass 3
- Admin pages feel like same product family as user pages.
- Filter/search/action patterns are consistent with user flow.
- Policy UX matches backend plan (soft delete, restore, audit visibility).

---

## One-shot fallback (if you want 1 single iteration)
"Using the global context block, generate all screens from [wireframes/stitch-ready-prompts.md](wireframes/stitch-ready-prompts.md) in one design system pass. Freeze component styles from the first 4 foundation screens (Splash, Login, Register, Task Home) and apply the exact same component tokens to every other screen."

Tradeoff: fewer iterations, but higher risk of detail inconsistencies.

---

## Consistency checklist (run after each pass)
- Same border thickness everywhere.
- Same button radius and shadow offset everywhere.
- Same input focus style everywhere.
- Same badge/chip color semantics everywhere.
- Same nav placement/structure for each role.
- Same modal header/body/action layout everywhere.

---

## Handoff order to frontend build
1) Build foundation components from Pass 1.
2) Build user feature screens from Pass 2.
3) Build admin screens from Pass 3.
4) Integrate realtime and state handling.
5) Final accessibility and i18n pass.

---

## Final Mega Prompt (One-Shot)

Copy-paste this single block into Stitch:

"Design a complete mobile-first productivity product named To-Do Pop using a strict, consistent Pop Art design system. Generate all required user and admin screens in one coherent family.

GLOBAL STYLE SYSTEM:
- Visual direction: bold Pop Art inspired by comic books and advertising posters.
- Mood: energetic, playful, action-first, but highly usable.
- Core palette: #FF2D55 (primary CTA), #FFD60A (highlight), #00C2FF (secondary), #111111 (outline/text emphasis), #FFFDF7 (base).
- Shape language: thick black outlines, rounded rectangles/pills, comic panel framing.
- Elevation: short offset comic shadows (not soft material blur).
- Typography: strong comic-like display headings + readable geometric sans body.
- Motion feel: quick and snappy transitions.
- Accessibility: touch targets >=44x44, visible focus states, color + icon redundancy for status.
- Localization: Vietnamese-first text layout, bilingual-ready spacing (VI/EN).

CONSISTENCY RULES (MANDATORY):
- Freeze component tokens and re-use everywhere: same button radius, border thickness, input style, card style, chip style, modal style, toast style.
- Keep CTA hierarchy identical across all screens.
- Preserve shared interaction patterns for search/filter/confirm/delete/restore.
- Do not redesign component anatomy per screen.

INFORMATION ARCHITECTURE TO GENERATE:

Public/Auth:
1) Splash / Brand Intro
2) Login
3) Register
4) OAuth Linking Verification (same-email account-linking flow)
5) Forgot Password

User area:
6) Task Home (list)
7) Task Board (status columns)
8) Task Filter Page (advanced filters)
9) Task Search Result Page
10) Task Detail Drawer/Page
11) Add Task Modal
12) Edit Task Modal
13) Delete Confirmation Modal (soft-delete + 7-day restore message)
14) Restore Task Snackbar/Panel
15) Notifications/Activity Page (lightweight)
16) Profile Page
17) Settings Page (separate from profile)
18) Linked Providers Management Modal
19) Session Devices Modal

Admin area:
20) Admin Home Dashboard
21) Admin Analytics Page
22) Admin Users Page
23) Admin Add User Page
24) Admin Edit User Modal
25) Admin User Filter Page
26) Admin Task Moderation Page
27) Admin Task Filter Page
28) Admin Audit Logs Page
29) Admin Settings Page
30) Admin Soft-Delete Trash Page

NAVIGATION REQUIREMENTS:
- User mobile bottom nav must be exactly: Tasks, Profile, Settings.
- User top actions: Add Task, Search, Filter.
- Add Task must open Add Task Modal (not standalone page).
- Admin nav must include: Home, Analytics, Users, Tasks, Audit Logs, Settings, Trash.

DOMAIN/POLICY UX REQUIREMENTS:
- Soft-delete policy: no hard delete in v1, restore window 7 days.
- Realtime model: assume full refetch on update events and reconnect; include subtle sync feedback UI.
- OAuth linking: when OAuth email matches local account, show verification step then success warning toast.
- Task statuses: todo, doing, done, overdue; overdue can be computed and visually distinct.

COMPONENTS TO REUSE ACROSS SCREENS:
- Shared app shell, route guard placeholders, toasts, confirmation modal, error modal, loading/empty/error state blocks.
- Shared search bar, filter chips, status badges, table/list item action menus.

SCREEN DETAIL EXPECTATIONS:
- Every screen must include realistic content hierarchy, action placements, and state placeholders.
- Include destructive-action confirmations where relevant.
- Include empty/loading/error variants at least on core list pages (Task Home, Admin Users, Admin Tasks, Audit Logs).

OUTPUT FORMAT EXPECTATIONS:
- Deliver a coherent set of screen designs with consistent tokens.
- Prioritize mobile-first composition (390x844), with clear responsive intent for tablet/desktop.
- Keep all screens visually aligned as one product system.
- Ensure user-centered UX clarity: simple, fast, recoverable actions.

FINAL QA BEFORE COMPLETION:
- Check visual consistency across all 30 screens.
- Check nav correctness (user and admin).
- Check modal usage correctness (Add/Edit/Delete and provider/session management).
- Check policy messaging consistency (soft-delete, restore window, audit visibility)."
