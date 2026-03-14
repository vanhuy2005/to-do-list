# Stitch-Ready Prompt Pack (Pop Art To-Do)

## Fast execution companion
- For fewer iterations and consistent generation order, use:
  - [wireframes/stitch-runbook.md](wireframes/stitch-runbook.md)
  - One-shot copy block: [wireframes/stitch-runbook.md](wireframes/stitch-runbook.md#L131)

## How to use
- Use one prompt per screen in Stitch.
- Keep visual language consistent with Pop Art system from lowfi prototype.
- Mobile-first frame target: 390x844.
- UX principle: action-first, low cognitive load, clear recovery paths.

## Global constraints for all prompts
- Style: bold Pop Art, comic-panel framing, thick black outlines, high contrast.
- Core palette:
  - Electric Hero Red (#FF2D55)
  - Comic Sun Yellow (#FFD60A)
  - Pop Cyan Blast (#00C2FF)
  - Ink Black Outline (#111111)
  - Paper White Base (#FFFDF7)
- Typography: comic-impact heading + clean geometric sans body.
- Accessibility: minimum 44x44 touch targets, visible focus state, labels with icons.
- Language: Vietnamese first, with visible VI/EN toggle in key entry points.

---

## Information Architecture (User-Centered)

### Public flow
1. Splash / Brand Intro
2. Login
3. Register
4. OAuth Linking Verification
5. Forgot Password

### User app flow
6. Task Home (list)
7. Task Board (column view)
8. Task Filter Page (advanced filters)
9. Task Search Result Page
10. Task Detail Drawer/Page
11. Add Task Modal
12. Edit Task Modal
13. Delete Confirmation Modal
14. Restore Task Snackbar/Panel
15. Notifications/Activity Page (optional v1.1-ready)
16. Profile Page
17. Settings Page (separate from profile)
18. Linked Providers Management Modal
19. Session Devices Modal

### Admin flow
20. Admin Home Dashboard
21. Admin Analytics Page
22. Admin Users Page
23. Admin Add User Page
24. Admin Edit User Modal
25. Admin User Filter Page
26. Admin Task Moderation Page
27. Admin Task Filter Page
28. Admin Audit Logs Page
29. Admin Settings Page
30. Admin Soft-Delete Trash Page

---

## Navigation Model

### User bottom nav (mobile)
- Tasks
- Profile
- Settings

### User top actions
- Add Task (FAB or top-right action)
- Search
- Filter

### Admin navigation
- Admin Home
- Analytics
- Users
- Tasks
- Audit Logs
- Settings
- Trash

---

## Master system prompt for Stitch
Use this as shared context before screen-specific prompts:

"Design a mobile-first productivity app named To-Do Pop with bold Pop Art aesthetics inspired by comic books and ad posters. Prioritize clarity and speed of use over decorative complexity. Every critical action must be obvious, with strong visual hierarchy and high-contrast controls. Use thick black outlines, offset comic shadows, red/yellow/cyan accent strategy, and Vietnamese-first copy with bilingual readiness. Build clean, scannable layouts with one dominant action per section. Include loading, empty, error, and confirmation states. Ensure role-aware UX for user vs admin."

---

## Screen-specific Stitch prompts

### 1) Splash / Brand Intro
"Create a Splash screen for To-Do Pop. Show logo, short tagline, and quick CTA buttons: Đăng nhập and Đăng ký. Keep composition bold and minimal. Include language toggle in top-right."

### 2) Login Page
"Create a Login screen with comic-panel card layout. Include email/password inputs, remember checkbox, forgot password link, and primary login CTA. Add OAuth Google and GitHub buttons. Include inline validation and warning toast placeholder for same-email account linking."

### 3) Register Page
"Create a Register screen matching Login style. Fields: display name, email, password, confirm password. Include password strength hint, OAuth options, and clear switch-back to login action."

### 4) OAuth Linking Verification
"Create a verification step screen shown when OAuth email matches local account. Include explanation message, verification CTA, cancel/back action, and error/retry block. Tone: secure but friendly."

### 5) Forgot Password
"Create Forgot Password screen with email input, submit CTA, success state, and return-to-login action."

### 6) Task Home (List)
"Create the primary Task Home list view. Include app bar, search field, quick status counters (Todo/Doing/Done/Overdue), filter chips, task list cards, and add-task floating button. Cards show title, due date, priority, tags, and quick actions."

### 7) Task Board (Column View)
"Create a mobile board view with horizontal status columns (Todo/Doing/Done/Overdue). Support drag reorder mental model with visible card handles. Keep readability high and controls simple."

### 8) Task Filter Page
"Create dedicated advanced filter page for tasks. Include status multiselect, priority, tags, date range, overdue toggle, and reset/apply actions."

### 9) Task Search Result Page
"Create search results page with query header, filter summary chips, sortable result list, and no-results empty state."

### 10) Task Detail Drawer/Page
"Create task detail screen with full metadata, status history preview, notes area, and action row: Edit, Change Status, Soft Delete."

### 11) Add Task Modal
"Create Add Task modal as comic-panel overlay. Fields: title, description, status, priority, tags, due date. Primary CTA: Tạo công việc. Secondary: Hủy. Include validation states."

### 12) Edit Task Modal
"Create Edit Task modal with pre-filled fields and change-highlighting cues. CTA: Lưu thay đổi."

### 13) Delete Confirmation Modal
"Create confirmation modal for soft-delete with warning style. Show restore window (7 days), reason dropdown, confirm/cancel actions."

### 14) Restore Task Feedback
"Create compact restore interaction pattern (snackbar or panel) with undo action and expiration note."

### 15) Notifications / Activity Page
"Create optional notifications page listing realtime updates, sync events, and admin actions affecting user tasks."

### 16) Profile Page
"Create Profile page with avatar, display name, email, role badge, quick account actions, and linked providers summary."

### 17) Settings Page (Separate)
"Create separate Settings page with sections: Preferences (theme/language), Privacy, App behavior, and sync controls. Must be distinct from Profile page."

### 18) Linked Providers Management Modal
"Create modal for linking/unlinking Local, Google, GitHub providers with clear status chips and security explanation."

### 19) Session Devices Modal
"Create modal listing active devices/sessions with revoke session action and current device marker."

### 20) Admin Home Dashboard
"Create Admin Home with top KPIs, alerts, quick actions, and recent moderation activity feed."

### 21) Admin Analytics Page
"Create analytics screen with task status charts, user activity summary, and trend cards. Keep chart area clean and readable on mobile."

### 22) Admin Users Page
"Create users management page with searchable list/table, status chips, role chips, and row actions: view/edit/disable/soft delete."

### 23) Admin Add User Page
"Create dedicated Add User page with form fields, role selection, status default, provider setup hint, and save/cancel actions."

### 24) Admin Edit User Modal
"Create user edit modal for profile/status/role changes and provider management summary."

### 25) Admin User Filter Page
"Create advanced filter page for users with role, status, provider type, created date range, and reset/apply controls."

### 26) Admin Task Moderation Page
"Create moderation page for all tasks with owner context, status, priority, and moderation actions including soft delete/restore."

### 27) Admin Task Filter Page
"Create advanced filter page for moderation task list with owner, status, tags, due range, and deletion source filters."

### 28) Admin Audit Logs Page
"Create audit log timeline/list with actor, action, target, timestamp, and before/after summary chips. Include filter and search controls."

### 29) Admin Settings Page
"Create admin settings screen for policy toggles, retention visibility, and operational preferences."

### 30) Admin Soft-Delete Trash Page
"Create trash page listing deleted users/tasks, restore actions, remaining restore window indicator, and warning banner about permanent purge."

---

## Reusable modal prompts

### Global confirm modal
"Create a reusable confirmation modal with strong hierarchy: title, consequence text, primary confirm, secondary cancel, optional danger icon."

### Error modal
"Create a reusable blocking error modal with retry and support/help action."

### Success toast
"Create a reusable success toast with compact icon, short message, optional action link."

---

## Stitch output QA checklist
- Navigation correctly separates Tasks, Profile, Settings for users.
- Admin includes distinct Home, Analytics, Settings, Add User, Filter pages.
- Add button launches Add Task modal, not full page.
- Every destructive action uses soft-delete messaging with 7-day restore window.
- Each screen includes empty/loading/error placeholders.
- Visual style remains consistent Pop Art across all screens.
