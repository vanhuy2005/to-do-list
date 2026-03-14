## Plan: Pop Art Todo App (MERN)

Build a mobile-first, scalable monolithic full-stack to-do app using React+Vite (frontend) and Node+Express+MongoDB (backend), with JWT + OAuth (Google/GitHub), Socket.IO realtime updates, bilingual UI (Vietnamese/English), and admin capabilities. Reuse workspace Stitch/design skills for UI system definition and component implementation quality.

**Steps**
1. Phase 0 — Foundation decisions and design system (blocks all implementation)
   - Finalize product requirements as agreed: Standard scope, auth required, REST API, user-scoped tasks, realtime via Socket.IO, VN+EN i18n, mobile-first Pop Art UI.
   - Create DESIGN.md using Stitch/design-md workflow (semantic tokens, typography, spacing, interaction language).
   - Define UX IA for required pages: Login/Register, Task Board/List, Profile/Settings, Admin Dashboard.
   - Output artifacts: PRD-lite section, DESIGN.md, page-level component inventory.
2. Phase 1 — Monorepo scaffold and conventions (*depends on 1*)
   - Initialize root workspace with frontend and backend apps and shared config conventions.
   - Define senior-level folder structure: domain-based modules backend + feature-based frontend.
   - Add environment strategy: .env.example per app, secrets policy, naming conventions, and runtime config loader.
   - Add lint/format standards and scripts for both apps.
3. Phase 2 — Backend core architecture (*depends on 2*)
   - Set up Express app layers: app bootstrap, route registration, controllers/services/repositories, centralized error middleware.
   - Configure MongoDB connection, base schemas, indexes, and migration-safe schema conventions.
   - Implement auth domain: local credentials + JWT access/refresh flow (httpOnly cookie strategy), role model (user/admin), account status.
   - Implement OAuth domain with Passport strategies for Google and GitHub, account linking rules, and secure callback flow.
   - Implement audit log model + service (admin actions and security events).
4. Phase 3 — Tasks, realtime, and admin APIs (*depends on 3*)
   - Build REST APIs for tasks with ownership checks, filtering/searching/sorting/pagination, and status/priority/tags/due-date handling.
   - Add Socket.IO server integration with auth handshake and rooms per user/admin channel.
   - Emit task lifecycle events (create/update/delete/status change) and consume in frontend for live updates.
   - Build admin APIs: user list/search, create/update/delete user, task moderation, aggregate stats by task status, audit log retrieval.
5. Phase 4 — Frontend app shell and shared infrastructure (*parallel with late Phase 3 once API contracts are stable*)
   - Set up React+Vite JavaScript app with Tailwind, shadcn/ui, DaisyUI themes (light/dark), Lucide icons, Framer Motion.
   - Build app shell: routing, protected route guards, auth context/store, query client, API client with interceptors.
   - Implement i18n framework (vi/en) with Vietnamese as default and translation namespace structure.
   - Establish responsive design primitives and reusable UI kit aligned with DESIGN.md.
6. Phase 5 — Frontend feature pages (*depends on 5 and API readiness from 4*)
   - Auth pages: login/register, social OAuth buttons, validation, error states, redirect rules.
   - Task board/list page: CRUD, quick status transitions, priority/tag filters, search, due date actions, optimistic updates.
   - Profile/settings page: profile info, password update (if local account), language switcher, theme toggle.
   - Admin dashboard: user management table/actions, task moderation, status analytics cards/charts, audit log list.
   - Wire Socket.IO client subscriptions for live task and admin data updates.
7. Phase 6 — UX polish and accessibility (*parallel with step 6 bug-fixing*)
   - Apply Pop Art visual system consistently: bold outlines, high-contrast accents, comic-inspired motifs while maintaining readability.
   - Add micro-interactions with Framer Motion constrained to performance budget.
   - Ensure mobile-first flows, keyboard navigation, ARIA labels, form accessibility, and touch target sizing.
8. Phase 7 — Testing and quality gates (*depends on 3,4,5,6*)
   - Backend unit/integration tests: auth, OAuth callbacks, task CRUD/filtering, admin permissions, socket auth guards.
   - Frontend unit/integration tests: key components, auth flow, task interactions, admin table actions, i18n/theme toggles.
   - End-to-end smoke tests for critical journeys: register/login, create/edit task, live update, admin moderation.
   - Add CI pipeline for lint, test, and build in pull-request checks.
9. Phase 8 — Deployment to Render monolith and handoff (*depends on 8*)
   - Configure production build/start for monolithic deployment and environment variable mapping.
   - Add health checks, CORS/cookie security, production logging baseline, and fallback routing.
   - Publish deployment runbook and post-deploy verification checklist.

**Execution Policies (Resolved)**
1. OAuth same-email account linking
    - Final choice: auto-link after verification, then show warning toast.
2. Admin delete policy
    - Final choice: soft delete + restore within 7 days.
3. Realtime strategy (Socket.IO)
    - Final choice: always full refetch on every event + immediate full refetch on reconnect.

**Database Design Blueprint (Phase-by-Phase)**

**Linked artifact**
- Full collection-level schema spec, exact JSON samples, and Mongoose migration index DDL:
   - [docs/database-schema-spec.md](docs/database-schema-spec.md)

### Phase 0 — Domain boundaries
- Tenancy: single-tenant for v1, keep schema extensible for future multi-tenant support.
- Roles: `user`, `admin` only in v1.
- Core entities: `users`, `tasks`, `refresh_sessions`, `audit_logs`.

### Phase 1 — Baseline modeling rules
- Document IDs: Mongo `ObjectId`.
- Time strategy: store all timestamps in UTC; render by user timezone in frontend.

### Phase 2 — Auth and identity schema
- `users`, `refresh_sessions`, and provider-linking flow are defined in [docs/database-schema-spec.md](docs/database-schema-spec.md).

### Phase 3 — Task and admin data model
- `tasks` and `audit_logs` schema and policies are defined in [docs/database-schema-spec.md](docs/database-schema-spec.md).

### Phase 4 — Realtime and sync persistence rules
- Realtime transport: Socket.IO.
- Event storage: no persistent event log in v1.
- Client sync policy: full refetch on event + immediate full refetch on reconnect.

### Phase 5 — Search and indexing design
- Search mode v1: simple text search over `title` + `description`.
- Primary indexes are listed in [docs/database-schema-spec.md](docs/database-schema-spec.md).

### Phase 6 — Admin analytics strategy
- Compute stats on read using Mongo aggregations in v1.

### Phase 7 — Retention, cleanup, and backups
- Soft-delete purge job: daily schedule.
- Purge window: 7 days after `deletedAt` for users/tasks.
- Audit logs retention: 30 days.

### Phase 8 — Security, migration, and observability
- Hash password and refresh tokens.
- Use migration scripts per release.
- Enable slow query logging and monthly index review.

**DB Final Locks**
1. Custom status cap per user: max 8.
2. Explicit `overdue` manual override: user only.
3. Task reorder persistence: `orderIndex` scoped per status column.

**Wireframe and Prompt Artifacts**
- [wireframes/lowfi-prototype.md](wireframes/lowfi-prototype.md)
- [wireframes/stitch-ready-prompts.md](wireframes/stitch-ready-prompts.md)
- [wireframes/stitch-runbook.md](wireframes/stitch-runbook.md)
