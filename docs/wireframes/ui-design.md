# UI Design Consolidated Spec (To-Do Pop)

This document consolidates and analyzes all information from:

- `docs/wireframes/lowfi-prototype.md`
- `docs/wireframes/stitch-ready-prompts.md`
- `docs/wireframes/stitch-runbook.md`

It is intended to be the single source of truth for UI/UX direction, information architecture, componentization, and Stitch generation workflow.

---

## 1) Product Identity & Design Intent

- Product name: **To-Do Pop**.
- Platform priority: **mobile-first (390x844)**, then responsive upscale to tablet/desktop.
- Visual direction: **Pop Art** inspired by comic books, mass media, and advertising posters.
- UX philosophy: attention-grabbing visuals with efficient, low-cognitive-load task management.
- Core principle: every viewport should present one dominant action and clear recovery paths.

---

## 2) Visual Design System

### 2.1 Mood, density, and aesthetic

- Mood: loud, playful, high-energy, optimistic, action-oriented.
- Density: medium UI density with bold anchors and quick scan hierarchy.
- Design language: comic-panel framing, thick black outlines, high contrast.

### 2.2 Color palette and semantic roles

- **Electric Hero Red** `#FF2D55`: primary CTA, urgent actions, high-priority markers.
- **Comic Sun Yellow** `#FFD60A`: highlights, badges, active tab indicators, attention chips.
- **Pop Cyan Blast** `#00C2FF`: secondary CTA, links, hover/focus accents.
- **Ink Black Outline** `#111111`: outlines, icon strokes, heading emphasis, borders.
- **Paper White Base** `#FFFDF7`: primary background for readability.
- **Bubble Pink Accent** `#FF77B7`: playful optional accent chips.
- **Success Lime Punch** `#7DDE2B`: done/success confirmations.
- **Alert Orange Burst** `#FF8A00`: warning and recoverable error states.

### 2.3 Typography

- Headings: comic-impact style (Bangers/Anton-like), uppercase emphasis for hero/page titles.
- Body: clean rounded geometric sans for VI/EN legibility.
- Scale:
  - H1: 28–32px mobile, heavy.
  - H2: 20–24px mobile, bold.
  - Body: 14–16px regular/medium.
  - Caption: 12–13px.
- Letter spacing:
  - body text: tight;
  - hero headings/badges: slightly expanded.

### 2.4 Shape language

- Buttons: pill or strongly rounded rectangles with thick black border.
- Cards: medium rounded corners with high-contrast borders.
- Inputs: rounded rectangles, clear 2–3px border, explicit focus ring.
- Chips/tags: capsule pills with high-contrast fill + border.
- Modals: comic-panel framing with strong header strip.

### 2.5 Elevation and depth

- Elevation style: short, hard-edge comic offset shadows (not blur-heavy material shadows).
- Foreground emphasis: outline + offset shadow to “pop” over base.
- Priority treatment:
  - high priority: stronger border + red/yellow blend;
  - secondary content: lighter fill but retain black outline.

### 2.6 Layout & spacing

- Horizontal mobile padding: 16px.
- Vertical rhythm: 8px base spacing unit.
- Section gaps: 16–24px.
- Information flow for task surfaces: summary → filters → list/action area.
- Responsive behavior:
  - mobile: single-column stacked;
  - tablet/desktop: split summary/action regions with higher scan density.

### 2.7 Motion and interaction

- Transition speed: 150–220ms, snappy easing.
- Micro-interactions:
  - CTA press: slight scale-down + reduced shadow offset.
  - Card tap/hover: subtle lift + border emphasis.
  - Status change: quick badge flash + toast confirmation.
- Realtime feedback:
  - silent list refresh + compact “Updated” toast.
  - reconnect event shows sync indicator.

### 2.8 Accessibility guardrails

- Maintain WCAG contrast on saturated backgrounds.
- Minimum touch target: 44x44.
- Always-visible keyboard focus indicators.
- Never encode status by color alone; pair with icon/label.
- Vietnamese strings must avoid overflow at mobile width 390.

---

## 3) Information Architecture (Complete)

### 3.1 Public/Auth screens

1. Splash / Brand Intro
2. Login
3. Register
4. OAuth Linking Verification
5. Forgot Password

### 3.2 User screens

6. Task Home (list)
7. Task Board (column view)
8. Task Filter Page (advanced filters)
9. Task Search Result Page
10. Task Detail Bottom Drawer (mobile-first)
11. Add Task Modal
12. Edit Task Modal
13. Delete Confirmation Modal
14. Restore Task Panel (bottom-anchored)
15. Notifications/Activity Page
16. Profile Page
17. Settings Page (separate from profile)
18. Linked Providers Management Modal
19. Session Devices Modal

### 3.3 Admin screens

20. Admin Home Dashboard
21. Admin Analytic Page
22. Admin Users Page

#### Embedded Admin Modules (under 3-nav IA)

23. Add User flow (inside Users)
24. Edit User flow (inside Users)
25. User Filter panel (inside Users)
26. Task Moderation tab (inside Home)
27. Task Filter drawer (inside Home > Moderation)
28. Audit Logs tab (inside Home)
29. Settings tab (inside Home)
30. Soft-Delete Trash tab (inside Home)

---

## 4) Navigation Model

### 4.1 User navigation

- Mobile bottom nav: **Tasks**, **Profile**, **Settings**.
- Top actions: **Add Task**, **Search**, **Filter**.
- Constraint: Add Task opens **modal** (not full page).

### 4.2 Admin navigation

- Sections: **Home**, **Analytic**, **Users**.

---

## 5) Core Feature Behavior Requirements

### 5.1 Auth flow

- Login states: idle, validation error, submitting, success redirect.
- Register fields: display name, email, password, confirm password.
- OAuth options: Google and GitHub.
- Same-email OAuth linking:
  - show verification step;
  - then auto-link and show warning toast.
- Forgot password: email input, submit, success state, return-to-login action.
- Language toggle VI/EN is visible at key entry points.

### 5.2 Task management flow

- Task Home includes:
  - app bar,
  - search,
  - status counters (Todo/Doing/Done/Overdue),
  - filter chips,
  - task cards,
  - add-task FAB.
- Task filters:
  - status,
  - priority,
  - tags,
  - due-date range,
  - keyword search,
  - overdue toggle.
- Task card anatomy:
  - title row,
  - metadata row,
  - status badge,
  - priority badge,
  - due date,
  - tag chips,
  - action menu.
- Reorder behavior:
  - drag within status column;
  - persist `orderIndex` per column.
- Delete behavior:
  - soft delete only;
  - confirmation modal;
  - success feedback uses a bottom-anchored restore panel (single pattern).
- Overdue behavior:
  - computed overdue gets orange indicator;
  - manual overdue shows explicit “Overdue (manual)” badge.
- Task Detail behavior:
  - opens as bottom drawer on mobile;
  - default drawer height: 70% viewport;
  - drawer content area uses internal scroll.

### 5.3 Profile and settings

- Profile includes avatar/name/email/role and account actions.
- Settings is separate from profile and includes preferences/privacy/app behavior/sync controls.
- Preference persistence:
  - language + theme saved immediately.
- Linked providers panel/modal:
  - local/google/github linked status;
  - link/unlink actions + security explanation.
- Session devices modal:
  - active sessions list,
  - current device marker,
  - revoke session action.
- Password change form shown for local provider.

### 5.4 Admin behavior

- Admin Home hierarchy:
  - primary: view trends and high-level outcomes first;
  - secondary: monitor alerts/issues and trigger quick actions;
  - tertiary: system health/sync visibility and recent governance activity.
- Home embedded tabs:
  - Moderation (task governance list + actions),
  - Audit Logs,
  - Settings,
  - Trash.
- Admin Analytic scope:
  - task status distribution,
  - user growth/activity trends,
  - productivity trends,
  - provider usage,
  - deletion/restore trends,
  - CSV/PDF export;
  - default range: last 7 days.
- Admin Users scope:
  - split list + detail pane;
  - default columns: Name, Role, Status, Task count;
  - required actions: view details, edit, disable/enable, soft delete, restore, force logout sessions.
- Trash policy:
  - restore window **7 days**,
  - warning about permanent purge.

### 5.5 Realtime and sync

- On socket event: full refetch with debounce.
- On reconnect: immediate refetch, then continue live stream.
- Sync feedback should be subtle but visible.

### 5.6 Locked implementation decisions (V1)

- Scope includes all 30 screens in this document.
- One admin permission level in V1: `Admin`.
- Validation timing across forms: on blur + on submit.
- Breakpoints are fixed at: 390 / 768 / 1024 / 1440.
- Dark mode is phase-next immediately after V1 (do not block V1 delivery).

---

## 6) Shared Components & App Shell

### 6.1 Global shell and infra components

- `AppShell`
- `RouteGuard` (auth + role gate)
- `LanguageSwitcher`
- `ThemeToggle`
- `ToastHost`
- `ConfirmDialog`
- `LoadingState`
- `EmptyState`
- `ErrorState`

### 6.2 Auth components

- `AuthPageLayout`
- `AuthTabs` (`LoginForm`, `RegisterForm`)
- `OAuthButtons` (`GoogleButton`, `GitHubButton`)
- `LinkingWarningToast`
- `ForgotPasswordLink`

### 6.3 Task components

- `TaskPageHeader`
- `TaskSearchBar`
- `TaskFilterChips`
- `TaskStatsRow`
- `TaskList`
- `TaskCard`
- `TaskActionsMenu`
- `TaskFormModal` (create/edit)
- `TaskTrashPanel` (restore own tasks)

### 6.4 Profile/settings components

- `ProfileSummaryCard`
- `ProfileEditForm`
- `PasswordChangeForm`
- `PreferencePanel`
- `LinkedProvidersPanel`
- `LogoutButton`

### 6.5 Admin components

- `AdminStatsCards`
- `AdminHomePage`
- `AdminAnalyticPage`
- `AdminUsersPage`
- `AdminHomeTabs` (`ModerationTab`, `AuditTab`, `SettingsTab`, `TrashTab`)
- `AdminUserTable`
- `AdminUserDetailPane`
- `AdminAddUserFlow`
- `AdminEditUserFlow`
- `AdminUserFilterPanel`
- `AdminTaskModerationList`
- `AdminTaskFilterDrawer`
- `AdminAuditTimeline`
- `AdminSettingsPanel`
- `AdminTrashPanel`

### 6.6 Reusable cross-screen interaction components

- Global confirm modal.
- Global blocking error modal.
- Global success toast.

---

## 7) Data/API Mapping

### 7.1 API contracts

- Auth APIs: login/register/refresh/logout, OAuth callbacks, account-link verification.
- Task APIs: CRUD, search/filter/sort/paginate, reorder per status, restore.
- Admin APIs: user CRUD, status updates, moderation operations, stats, audit logs.
- Realtime: debounced full-refetch strategy + reconnect refetch.

### 7.2 Collection mapping

- `users`: profile/settings, auth identity, provider link state, role/status.
- `tasks`: board/list, filters, reorder, soft delete/restore.
- `refresh_sessions`: device/session security.
- `audit_logs`: admin timeline and governance traceability.

---

## 8) Screen Prompt Library (Stitch)

Use these prompts when generating one screen at a time.

### Master system prompt

"Design a mobile-first productivity app named To-Do Pop with bold Pop Art aesthetics inspired by comic books and ad posters. Prioritize clarity and speed of use over decorative complexity. Every critical action must be obvious, with strong visual hierarchy and high-contrast controls. Use thick black outlines, offset comic shadows, red/yellow/cyan accent strategy, and Vietnamese-first copy with bilingual readiness. Build clean, scannable layouts with one dominant action per section. Include loading, empty, error, and confirmation states. Ensure role-aware UX for user vs admin."

### Screen-specific prompts

1. Splash / Brand Intro: logo + tagline + Đăng nhập/Đăng ký + language toggle.
2. Login: email/password, remember me, forgot password, login CTA, OAuth buttons, inline validation, linking warning toast placeholder.
3. Register: display name/email/password/confirm, password strength hint, OAuth options, switch to login.
4. OAuth Linking Verification: explanation, verification CTA, cancel/back, error/retry block.
5. Forgot Password: email, submit CTA, success state, return to login.
6. Task Home: app bar, search, counters, chips, cards, FAB.
7. Task Board: horizontal Todo/Doing/Done/Overdue columns with drag mental model.
8. Task Filter: status/priority/tags/date-range/overdue + reset/apply.
9. Task Search Result: query header, filter summary chips, sortable list, no-results empty.
10. Task Detail: full metadata, history preview, notes, actions (Edit/Change Status/Soft Delete).
11. Add Task Modal: title/description/status/priority/tags/due + create/cancel + validation.
12. Edit Task Modal: prefilled fields + change-highlighting + save.
13. Delete Confirmation Modal: soft-delete warning + 7-day restore + reason + confirm/cancel.
14. Restore Task Panel: bottom-anchored restore panel with restore CTA + expiration note.
15. Notifications/Activity: realtime updates, sync events, admin-affecting actions.
16. Profile: avatar, name, email, role badge, account actions, provider summary.
17. Settings: preferences/theme/language/privacy/app behavior/sync, separate from profile.
18. Linked Providers Modal: Local/Google/GitHub status chips, link/unlink actions, security note.
19. Session Devices Modal: active devices, revoke action, current device marker.
20. Admin Home: trend-first KPI overview, alerts/issues queue, quick actions, system health, and recent governance activity.
21. Admin Analytic: status distribution, user growth/activity trends, productivity trends, provider and deletion/restore trends, CSV/PDF export, default range 7 days.
22. Admin Users: split list + detail pane, default columns (Name/Role/Status/Task count), row actions and detail drilldown.
23. Add User flow (inside Users): dedicated creation flow launched from Users primary CTA.
24. Edit User flow (inside Users): profile/status/provider/session controls in page-first detail flow.
25. User Filter panel (inside Users): role/status/provider/date filters + reset/apply.
26. Home > Moderation tab: owner context + status/priority + moderation actions.
27. Home > Moderation filter drawer: owner/status/tags/due/deletion-source filters.
28. Home > Audit tab: actor/action/target/time/before-after + search/filter.
29. Home > Settings tab: policy toggles, retention visibility, operational preferences.
30. Home > Trash tab: deleted users/tasks, restore actions, remaining restore window, purge warning.

### Reusable prompts

- Confirm modal: title, consequence text, confirm/cancel, optional danger icon.
- Error modal: blocking error with retry and support/help action.
- Success toast: compact icon + short message + optional action link.

---

## 9) Stitch Runbook (Fewest Iterations)

### Reusable global context block

"Design a mobile-first productivity app named To-Do Pop. Style is bold Pop Art inspired by comic books and ad posters. Use thick black outlines, high-contrast fills, comic-offset shadows, and clear hierarchy. Palette: #FF2D55 (primary), #FFD60A (highlight), #00C2FF (secondary), #111111 (outline), #FFFDF7 (base). Keep UX action-first and readable. Vietnamese-first labels with bilingual-ready layout. Ensure role-aware UX for user/admin. Include loading, empty, error, and confirmation states."

### Pass 1 — Foundation lock (4 screens)

Generate: Splash, Login, Register, Task Home.

Requirements:

- Freeze tokens for button/input/chip/card/modal.
- Include one loading and one empty variant on Task Home.
- Output reusable spacing and behavior notes.

Acceptance gate:

- identical border thickness and shadow style;
- stable CTA hierarchy and typography scale.

### Pass 2 — User expansion (14 screens)

Generate:

- OAuth Linking Verification,
- Forgot Password,
- Task Board,
- Task Filter,
- Task Search Result,
- Task Detail,
- Add Task Modal,
- Edit Task Modal,
- Delete Confirmation Modal,
- Profile,
- Settings,
- Linked Providers Modal.
- Session Devices Modal.
- Notifications/Activity page.

Acceptance gate:

- coherent end-to-end user flow,
- no style drift from Pass 1,
- one shared modal template.

### Pass 3 — Admin suite (14 screens)

Generate:

- Admin Home (parent),
- Admin Analytic (parent),
- Admin Users (parent),
- Add User flow (Users),
- Edit User flow (Users),
- User Filter panel (Users),
- Moderation tab (Home),
- Moderation filter drawer (Home),
- Audit tab (Home),
- Settings tab (Home),
- Trash tab (Home),
- Global Success Toast,
- Global Error Modal,
- Global Confirm Modal.

Acceptance gate:

- admin feels in same product family,
- consistent filter/search patterns,
- consistent policy messaging (soft delete, restore, audit).

### One-shot fallback

Generate all screens in one pass while freezing foundation tokens from Splash/Login/Register/Task Home.

Tradeoff: fewer runs but higher inconsistency risk.

---

## 10) Delivery Sequence to Frontend

1. Global shell + routing + auth guard.
2. Auth feature (forms + OAuth + linking warning UX).
3. Task feature (list/board/search/filter/modals/stats/reorder/trash restore).
4. Profile/settings feature.
5. Admin feature with 3 parent pages + embedded modules.
6. Realtime subscriptions + reconnect behavior.
7. Cross-feature polish: i18n, theme parity, accessibility, responsive QA.

---

## 11) QA Checklist (Consolidated)

### 11.1 Visual consistency

- Same border thickness (`3px`) across buttons/cards/inputs/chips/modals.
- Same primary radius (`12px`) for buttons/cards/inputs across screens.
- Same comic resting shadow offset (`3px 3px`) across primary surfaces.
- Same mobile control height (`48px`) for standard input/button controls.
- Same input focus treatment (`2px` cyan `#00C2FF`) everywhere.
- Same badge/chip semantic color mapping.

### 11.2 Navigation and IA correctness

- User bottom nav exactly: Tasks/Profile/Settings.
- Admin nav is exactly: Home/Analytic/Users.
- Every legacy admin function is reachable within <=2 interactions from one parent page.
- Settings is separate from Profile.
- Add Task opens modal (not full page).

### 11.3 Policy/state correctness

- All destructive actions are soft-delete.
- Restore window is consistently shown as 7 days.
- Post-delete feedback always uses bottom-anchored restore panel.
- Empty/loading/error placeholders exist on core list pages.
- Realtime + reconnect feedback is present.

### 11.4 Pop Art-specific QA

- Primary action hierarchy is visually dominant (red/yellow).
- Shadows are comic-offset (not material blur).
- Typography keeps comic tone without harming readability.
- VI text fits at 390 width without overflow.
- Light and dark themes preserve Pop Art identity.

---

## 12) Final One-Shot Mega Prompt (Ready to Paste)

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

1. Splash / Brand Intro
2. Login
3. Register
4. OAuth Linking Verification (same-email account-linking flow)
5. Forgot Password

User area: 6) Task Home (list) 7) Task Board (status columns) 8) Task Filter Page (advanced filters) 9) Task Search Result Page 10) Task Detail Bottom Drawer 11) Add Task Modal 12) Edit Task Modal 13) Delete Confirmation Modal (soft-delete + 7-day restore message) 14) Restore Task Panel (bottom-anchored) 15) Notifications/Activity Page (lightweight) 16) Profile Page 17) Settings Page (separate from profile) 18) Linked Providers Management Modal 19) Session Devices Modal

Admin area: 20) Admin Home Dashboard 21) Admin Analytic Page 22) Admin Users Page 23) Add User flow (inside Users) 24) Edit User flow (inside Users) 25) User Filter panel (inside Users) 26) Moderation tab (inside Home) 27) Moderation filter drawer (inside Home) 28) Audit tab (inside Home) 29) Settings tab (inside Home) 30) Soft-Delete Trash tab (inside Home)

NAVIGATION REQUIREMENTS:

- User mobile bottom nav must be exactly: Tasks, Profile, Settings.
- User top actions: Add Task, Search, Filter.
- Add Task must open Add Task Modal (not standalone page).
- Admin nav must be exactly: Home, Analytic, Users.

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
- Include empty/loading/error variants at least on core list pages (Task Home, Admin Users, Home Moderation tab, Home Audit tab).

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

---

## 13) Design Token Lock Sheet (V1)

This section is the authoritative token lock for implementation and Stitch generation consistency.

### 13.1 Foundation tokens

- `frame.mobile`: `390x844`
- `breakpoint.mobile`: `390`
- `breakpoint.tablet`: `768`
- `breakpoint.desktop`: `1024`
- `breakpoint.wide`: `1440`
- `space.base`: `8px`
- `space.pageX.mobile`: `16px`
- `space.sectionGap.min`: `16px`
- `space.sectionGap.max`: `24px`

### 13.2 Color tokens

- `color.primary`: `#FF2D55`
- `color.highlight`: `#FFD60A`
- `color.secondary`: `#00C2FF`
- `color.outline`: `#111111`
- `color.base`: `#FFFDF7`
- `color.accent.pink`: `#FF77B7`
- `color.success`: `#7DDE2B`
- `color.warning`: `#FF8A00`

### 13.3 Border, radius, and elevation tokens

- `border.default`: `3px solid #111111`
- `radius.default`: `12px`
- `radius.pill`: `9999px`
- `shadow.comic.rest`: `3px 3px 0 #111111`
- `shadow.comic.press`: `1px 1px 0 #111111`
- `shadow.comic.lift`: `4px 4px 0 #111111`

### 13.4 Component size tokens

- `control.height.mobile`: `48px`
- `control.minTouch`: `44px`
- `input.paddingX`: `12px`
- `button.paddingX.default`: `16px`
- `chip.height`: `32px`

### 13.5 Typography tokens

- `font.heading`: comic-impact family (Bangers/Anton-like tone)
- `font.body`: rounded geometric sans
- `text.h1.mobile`: `32px / 38px` (size / line-height)
- `text.h2.mobile`: `24px / 30px`
- `text.body.default`: `16px / 24px`
- `text.body.compact`: `14px / 20px`
- `text.caption`: `12px / 16px`

### 13.6 Focus and interaction tokens

- `focus.ring`: `2px solid #00C2FF`
- `focus.ringOffset`: `2px`
- `motion.fast`: `150ms`
- `motion.standard`: `200ms`
- `motion.slow`: `220ms`
- `motion.easing`: `cubic-bezier(0.2, 0.8, 0.2, 1)`

### 13.7 Overlay and layer tokens

- `overlay.backdrop`: `rgba(17, 17, 17, 0.45)`
- `z.base`: `0`
- `z.dropdown`: `20`
- `z.sticky`: `30`
- `z.drawer`: `40`
- `z.modal`: `50`
- `z.toast.panel`: `60`

---

## 14) Interaction Contracts & Screen Blueprint Matrix (V1)

### 14.1 Interaction contracts

#### Forms

- Validation timing: on blur + on submit.
- Error display: inline below field + red border state + accessible error text.
- Submit loading: disable primary CTA and show inline spinner.

#### Bottom drawer (Task Detail)

- Entry animation: slide-up using `motion.standard`.
- Height: fixed to 70% viewport with internal content scroll.
- Dismiss: swipe down, close icon, or backdrop tap.

#### Restore panel (single pattern)

- Placement: bottom-anchored panel above mobile nav.
- Trigger: appears after successful soft-delete.
- Content: item label + restore CTA + time hint (7-day policy).

#### Drag reorder

- Drag feedback: active card uses `shadow.comic.lift` and `opacity: 0.95`.
- Drop feedback: short highlight flash (`motion.fast`) on drop target.
- Persist order using `orderIndex` scoped by status column.

#### Sync and realtime

- Socket update: debounced full refetch (`300ms`).
- Reconnect: immediate refetch + compact sync indicator/toast.

### 14.2 Screen blueprint matrix (states + mandatory modules)

Each screen must explicitly support the listed states.

1. **Splash** — modules: logo, tagline, auth CTAs, VI/EN toggle; states: idle.
2. **Login** — modules: login form, OAuth buttons, helper links; states: idle/loading/error.
3. **Register** — modules: register form, OAuth, mode switch; states: idle/loading/error.
4. **OAuth Verification** — modules: explanation, verify CTA, cancel; states: idle/loading/error.
5. **Forgot Password** — modules: email form, submit, back-link; states: idle/loading/success/error.
6. **Task Home** — modules: app bar, search, filters, stats row, list, FAB; states: loading/empty/error/ready.
7. **Task Board** — modules: status columns, draggable cards, quick actions; states: loading/empty/error/ready.
8. **Task Filter** — modules: advanced filter controls, reset/apply; states: idle/loading/error.
9. **Task Search Result** — modules: query header, chips, sortable results; states: loading/empty/error/ready.
10. **Task Detail Drawer** — modules: metadata, notes, action row; states: loading/error/ready.
11. **Add Task Modal** — modules: task form, validation, create/cancel CTAs; states: idle/loading/error.
12. **Edit Task Modal** — modules: prefilled form, save CTA, dirty-state cues; states: idle/loading/error.
13. **Delete Confirm Modal** — modules: warning, reason input, confirm/cancel; states: idle/loading/error.
14. **Restore Task Panel** — modules: restore CTA, item summary, policy hint; states: visible/hidden.
15. **Notifications/Activity** — modules: realtime event list, filters; states: loading/empty/error/ready.
16. **Profile** — modules: user summary, account quick actions; states: loading/error/ready.
17. **Settings** — modules: preference/privacy/sync groups; states: loading/error/ready.
18. **Linked Providers Modal** — modules: provider list, link/unlink CTAs; states: loading/error/ready.
19. **Session Devices Modal** — modules: active sessions, revoke action, current marker; states: loading/empty/error/ready.
20. **Admin Home (parent page)** — modules: trend KPIs first, alerts/issues, quick actions, system health; states: loading/error/ready.
21. **Admin Analytic (parent page)** — modules: charts, trend cards, provider/deletion insights, export controls; states: loading/empty/error/ready.
22. **Admin Users (parent page)** — modules: split list + detail pane, row actions, search/filter; states: loading/empty/error/ready.
23. **Add User flow (Users)** — modules: create-user form and defaults; states: idle/loading/error.
24. **Edit User flow (Users)** — modules: edit form, provider/session controls, save actions; states: idle/loading/error.
25. **User Filter panel (Users)** — modules: role/status/provider/date filters; states: idle/loading/error.
26. **Moderation tab (Home)** — modules: moderation list, owner context, actions; states: loading/empty/error/ready.
27. **Moderation filter drawer (Home)** — modules: owner/status/tags/due/deletion-source filters; states: idle/loading/error.
28. **Audit tab (Home)** — modules: timeline/list, actor/action/target metadata, search/filter; states: loading/empty/error/ready.
29. **Settings tab (Home)** — modules: policy toggles, retention settings, ops preferences; states: loading/error/ready.
30. **Trash tab (Home)** — modules: deleted items list, restore actions, restore-window indicator; states: loading/empty/error/ready.

### 14.2.1 Parent Mapping (Legacy -> 3-Nav)

- Admin Add User -> Users page primary CTA flow.
- Admin Edit User Modal -> Users detail flow.
- Admin User Filter -> Users filter panel.
- Admin Task Moderation -> Home tab: Moderation.
- Admin Task Filter -> Home tab: Moderation filter drawer.
- Admin Audit Logs -> Home tab: Audit.
- Admin Settings -> Home tab: Settings.
- Admin Trash -> Home tab: Trash.

### 14.3 V1 completion gates

- Gate A (visual): token lock is respected across all screens.
- Gate B (interaction): drawer, restore panel, validation, and drag behavior match contracts.
- Gate C (navigation): user/admin nav models match exactly and never overlap.
- Gate D (policy): destructive flows are soft-delete only with 7-day restore messaging.
- Gate E (IA): no orphan admin screen outside Home/Analytic/Users parent model.
