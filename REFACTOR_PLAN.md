# ConstructIQ — Frontend Role-Based Refactor (POC)

> **Status:** plan locked, ready to execute. All decisions confirmed by user. No open questions.
>
> **How to execute:** Read this file top-to-bottom, then start at "Execution order" → step 1. Use TaskCreate to track each step.
>
> **Scope:** Frontend only. Backend stays untouched. POC is fully demoable with mock data — no network calls succeed.

---

## 1. Goal

Disconnect the frontend from the backend, restructure into role-based modules matching the multi-tenant role hierarchy diagram, and ship a clickable POC where each role sees a dedicated sidebar with the pages relevant to that role.

Roles (from the diagram):
- Super Admin (cross-tenant)
- Support Agent (read-only, ticket-focused)
- Org Admin (scoped to one org)
- Project Manager (scoped to their projects)
- Team Member — Procurement
- Team Member — Quantity Surveyor
- Team Member — Site Engineer
- Client Viewer (external — buyer of a unit in a building project)

---

## 2. Locked decisions (recap)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Backend disconnection | **Option b** — Keep axios + TanStack Query skeleton; add `MOCK_MODE=true` flag; mock-client short-circuits all requests to in-memory mocks |
| 2 | Role-switch UX | **Option a** — `/login` shows 8 demo-user cards (one per role); click to log in |
| 3 | Page depth | **Option a** — Fully mocked functional pages (tables with rows, working modals, local-state mutations) |
| 4 | Routing | **Option a** — Per-role route prefix (`/super-admin`, `/admin`, `/pm`, `/site-eng`, etc.) |
| 5 | Team Member roles | **Option a** — Three distinct roles (Procurement, Surveyor, Site Eng) each with its own sidebar |
| 6 | Client Viewer | Build it — buyer/landowner persona viewing units in their building, with payment schedule + docs |
| 7 | Sidebar visibility | **Option a** — Hide non-permitted items entirely (no lock icons) |
| 8 | Module depth tiers | Tickets = deep; Suppliers/POs/Budget = placeholders; Billing = same component style, separate routes for Super Admin (system) vs Org Admin (org) |
| 9 | Super Admin landing | Drop `/company-select` entirely. Land on cross-tenant dashboard |
| 10 | AI chat FAB | Untouched — stays mounted, will fail silently when backend is unreachable |

---

## 3. Industry research findings → page additions

Researched Procore, Buildertrend, Autodesk Construction Cloud (ACC), BOQ/QS tooling, real-estate developer buyer portals.

| Finding | POC translation |
|---------|-----------------|
| Procore = two-tier permissions (Company + Project), distinct PM / Engineer / Superintendent roles | Per-role prefix + per-role sidebar config is correct |
| Buildertrend Client Portal = Schedule + Daily Logs + **Budget/Invoices** + **Change Orders** + **Selections** + Documents/Photos | Client needs **Payments**, **Documents**, **Construction Progress** — not just "Units" |
| ACC core project modules = Issues, Checklists, Daily Updates, Equipment, Reports, **Tasks**, Documents | Site Eng without **Tasks** is a real gap — added. Inspections placeholder added |
| QS/BOQ tools = BOQ → Variations → Valuations → Cost Reports | Surveyor sidebar = BOQ + Variations + Valuations + POs + Budget |
| Real-estate buyer portals = lead → reservation → **payment milestones** → construction comms → handover | Client needs **Payments** and **My Property** as first-class pages |
| SaaS admin tier separates **Plans/Subscriptions** from **Invoices/Billing** | Two distinct pages, not one |
| Procore/ACC ship **Audit Log** at admin tier | Super Admin gets Audit Log |

---

## 4. Final sidebar per role (locked — single source of truth)

### Super Admin (`/super-admin`)
1. Dashboard — cross-tenant KPIs (orgs count, MRR, active projects, ticket queue depth)
2. Organizations — list of all tenants, create/suspend
3. Org Admins — promote/demote org-level admins (NOT every leaf user)
4. Plans — define subscription tiers + features per tier
5. Billing — system-wide invoices + MRR table
6. Audit Log — system-wide activity feed
7. Tickets — oversight + reassign across orgs
8. Settings — system settings

### Support Agent (`/support-agent`)
1. Dashboard — ticket queue overview, SLA breaches, my-assigned count
2. Tickets — **deep**: list w/ filters (status, priority, org, assignee) + detail (header, reporter, comment thread, status transitions, assign-to dropdown)
3. Customers — read-only orgs list

### Org Admin (`/admin`)
1. Dashboard — org KPIs roll-up
2. Projects — all org projects
3. People — org users, invite, role assignment
4. Subscription — current plan + upgrade/downgrade
5. Billing — org invoices + payment methods
6. Reports — cross-project roll-up (budget burn, issue count, project status)
7. Support — file/view their org's tickets
8. Settings — org profile, branding, address

### Project Manager (`/pm`)
1. Dashboard — their projects overview
2. Projects — their projects
3. Schedule — Gantt view of phases & milestones
4. Tasks — task board across their projects
5. Project Team — invite/manage team for their projects (NOT org-wide users)
6. Daily Reports — oversight + create
7. Issues — oversight + escalate
8. Budget — read access for their projects
9. Procurement — read-only POs/deliveries for their projects
10. Documents — drawings, contracts, RFIs

### Team Member — Procurement (`/procurement`)
1. Dashboard
2. Material Requests — inbound from PMs
3. Suppliers — placeholder
4. Purchase Orders — placeholder (Procurement creates)
5. Deliveries — placeholder

### Team Member — Quantity Surveyor (`/surveyor`)
1. Dashboard
2. BOQ — Bill of Quantities (placeholder)
3. Variations — Change Orders (placeholder)
4. Valuations — Progress billing (placeholder)
5. Purchase Orders — review/approve (placeholder)
6. Budget — placeholder

### Team Member — Site Engineer (`/site-eng`)
1. Dashboard
2. Tasks — assigned tasks (placeholder; reuse PM's component, role-filtered actions)
3. Daily Reports — **deep**: list + new-report form (weather, manpower, equipment, work done) + detail
4. Issues — **deep**: list w/ severity filter + detail w/ comments + resolve action
5. Inspections — placeholder (ACC standard)

### Client Viewer (`/client`)
1. Dashboard — their building project status
2. Building / Units — **deep**: gallery cards (status: Available / Reserved / Sold), filter by floor/size/price, detail w/ specs, mock "express interest" button
3. My Property — their reservation: unit detail, status, key dates
4. Construction Progress — photos + milestone timeline for their building
5. Payments — payment schedule (12-month installments), invoice cards, due dates, paid/pending status
6. Documents — sale contract, brochure, floor plan
7. Support — file ticket / contact sales

### Cross-cutting (every role)
- **Topbar avatar dropdown** → Profile · Settings · Logout
- **Notifications bell** in topbar (mock notifications)
- Sidebar-bottom avatar block is **removed** (replaced by topbar avatar)

---

## 5. Module depth tiers

### Deep — fully mocked & interactive (must look real for demo)
- **Tickets** (Support Agent + Super Admin oversight): list + filters + detail + comment thread + status transitions + assign. ~30 seeded tickets across 3 orgs.
- **Daily Reports** (Site Eng + PM): list + new-report form + detail.
- **Issues** (Site Eng + PM): list + severity filter + detail + resolve action.
- **Building / Units** (Client): gallery + filter + detail.
- **My Property** (Client): one reserved unit detail.
- **Payments** (Client): 12-month payment schedule with paid/pending pills.
- **Construction Progress** (Client): photo timeline + milestone list.
- **Projects + People** (Admin / Super Admin): reuse existing list/detail/invite components from current code.

### Lite mock — basic table + stat cards, no detail flow
- Organizations, Plans, Audit Log (Super Admin)
- Subscription, Reports (Org Admin)
- Schedule (PM) — static Gantt with mock bars
- Documents (Client) — list of mock PDFs

### Placeholders — page header + "module preview" empty state + 1-2 stat cards
- Suppliers, Purchase Orders, Deliveries, Material Requests
- BOQ, Variations, Valuations, Budget
- Tasks, Inspections, Documents (PM)
- Settings (every role)

---

## 6. File tree (target end state)

```
frontend/src/
  config/
    roles.ts                       # Role enum, prefixes, home routes, demo-user IDs
    sidebar-nav.ts                 # SIDEBAR_BY_ROLE — single source of truth
  app/
    (auth)/
      login/page.tsx               # 8 demo-user cards
    (app)/                         # renamed from (dashboard); shared shell
      layout.tsx                   # sidebar reads role + topbar avatar dropdown
      profile/page.tsx
      settings/page.tsx
      super-admin/
        dashboard/page.tsx
        organizations/page.tsx
        org-admins/page.tsx
        plans/page.tsx
        billing/page.tsx
        audit-log/page.tsx
        tickets/{page,[id]/page}.tsx
        settings/page.tsx
      support-agent/
        dashboard/page.tsx
        tickets/{page,[id]/page}.tsx
        customers/page.tsx
      admin/
        dashboard/page.tsx
        projects/{page,[id]/page}.tsx
        people/page.tsx
        subscription/page.tsx
        billing/page.tsx
        reports/page.tsx
        support/{page,[id]/page}.tsx
        settings/page.tsx
      pm/
        dashboard/page.tsx
        projects/{page,[id]/page}.tsx
        schedule/page.tsx
        tasks/page.tsx
        team/page.tsx
        reports/{page,[id]/page,new/page}.tsx
        issues/{page,[id]/page}.tsx
        budget/page.tsx
        procurement/page.tsx
        documents/page.tsx
      procurement/
        dashboard/page.tsx
        material-requests/page.tsx
        suppliers/page.tsx
        orders/page.tsx
        deliveries/page.tsx
      surveyor/
        dashboard/page.tsx
        boq/page.tsx
        variations/page.tsx
        valuations/page.tsx
        orders/page.tsx
        budget/page.tsx
      site-eng/
        dashboard/page.tsx
        tasks/page.tsx
        reports/{page,[id]/page,new/page}.tsx
        issues/{page,[id]/page}.tsx
        inspections/page.tsx
      client/
        dashboard/page.tsx
        units/{page,[id]/page}.tsx
        my-property/page.tsx
        progress/page.tsx
        payments/page.tsx
        documents/page.tsx
        support/{page,[id]/page}.tsx
  features/
    tickets/                       # NEW — deep
      components/{TicketTable,TicketDetail,TicketCommentThread,TicketStatusBadge,NewTicketModal}.tsx
      hooks/useTickets.ts
    site-reports/                  # NEW — deep
      components/{ReportList,ReportForm,ReportDetail}.tsx
    site-issues/                   # NEW — deep
      components/{IssueList,IssueDetail,IssueSeverityBadge}.tsx
    units/                         # NEW — deep (Client)
      components/{UnitGallery,UnitCard,UnitDetail,UnitFilters}.tsx
    payments/                      # NEW — deep (Client)
      components/{PaymentSchedule,PaymentCard}.tsx
    construction-progress/         # NEW (Client)
      components/{ProgressTimeline,MilestoneList,PhotoGallery}.tsx
    placeholders/                  # NEW — shared
      components/ModulePreview.tsx # accepts {title, description, icon, statCards[]}
  lib/
    mock/
      mode.ts                      # MOCK_MODE flag (env-driven, default true)
      mock-client.ts               # axios stub — routes URL → mock handler
      handlers/                    # one handler per resource
        users.handler.ts
        projects.handler.ts
        tickets.handler.ts
        ...
  mocks/
    users.mock.ts                  # 8 demo users (one per role)
    orgs.mock.ts                   # Company A/B/C
    projects.mock.ts               # ~6 projects across orgs
    tickets.mock.ts                # ~30
    daily-reports.mock.ts          # ~15
    issues.mock.ts                 # ~12
    units.mock.ts                  # ~24 units across 6 floors
    payments.mock.ts               # 12-month schedule for Client
    progress.mock.ts               # photos + milestones
    plans.mock.ts                  # 3 subscription tiers
    billing.mock.ts                # invoices
    audit-log.mock.ts              # ~50 entries
    suppliers.mock.ts
    pos.mock.ts
    deliveries.mock.ts
    material-requests.mock.ts
    boq.mock.ts
    variations.mock.ts
    valuations.mock.ts
    tasks.mock.ts
    documents.mock.ts
    notifications.mock.ts
    index.ts                       # re-exports
  store/
    auth.store.ts                  # extend with `role: Role`
    mock-state.store.ts            # NEW — in-memory mutations
```

### Files / folders to DELETE
- `app/company-select/` — entire folder
- `features/companies/` — Super Admin company-picker (`AddCompanyModal`, `CompanyCard`); the Organizations page rebuilds from scratch
- `app/(dashboard)/dashboard/page.tsx` — replaced by per-role dashboards
- `app/(dashboard)/users/page.tsx` — replaced by `/admin/people` and `/super-admin/org-admins`
- `app/(dashboard)/page.tsx` — root redirect logic moves to `(app)/page.tsx` and routes by role
- `store/company.store.ts` — no more company-switching

### Files to KEEP (and reuse)
- `components/shared/{AppLayout,Header,Sidebar,PageHeader}.tsx` — Sidebar gets refactored, others mostly unchanged
- `components/ui/*` — all reusable
- `components/form/*` — reusable
- `features/users/components/*` — reuse inside `/admin/people` and `/super-admin/org-admins`
- `features/auth/components/LoginForm.tsx` — replaced (kept as reference until /login is rewritten)
- `features/ai/*` — untouched
- `lib/api/client.ts` — extended with MOCK_MODE check

---

## 7. Auth flow

1. `/login` renders an 8-card grid. Each card = one demo user (name, email, role label, org name).
2. Click a card → `loginAsDemo(userId)`:
   - Pulls user from `mocks/users.mock.ts`
   - Stores in `auth.store` (`user`, `role`)
   - Sets `mock_role` cookie via `document.cookie`
   - Redirects to `ROLE_HOME[role]` (e.g., `/super-admin/dashboard`)
3. Logout (topbar avatar dropdown):
   - Clears auth store
   - Deletes `mock_role` cookie
   - Redirects to `/login`
4. Middleware (`middleware.ts`):
   - If no `mock_role` cookie and path !== `/login` → redirect `/login`
   - If path doesn't match user's role prefix → redirect to their `ROLE_HOME`
   - Exception: `/profile`, `/settings` accessible to all logged-in users

### Demo users (seeded in `mocks/users.mock.ts`)
| Role | Name | Email | Org |
|------|------|-------|-----|
| Super Admin | Anjana Patel | anjana@constructiq.com | (none — system) |
| Support Agent | Sam Chen | sam@constructiq.com | (none — staff) |
| Org Admin | Olivia Romero | olivia@companya.com | Company A |
| Project Manager | Pete Williams | pete@companya.com | Company A — "Tower Heights" |
| Procurement | Priya Singh | priya@companya.com | Company A |
| Quantity Surveyor | Sara Khalil | sara@companya.com | Company A |
| Site Engineer | Sebastian Diaz | sebastian@companya.com | Company A |
| Client Viewer | Carlos Rivera | carlos@gmail.com | Company A — buyer at "Tower Heights", Unit 12B |

---

## 8. Backend disconnection mechanism

```
frontend/.env.local
  NEXT_PUBLIC_MOCK_MODE=true
```

```ts
// lib/mock/mode.ts
export const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
```

```ts
// lib/api/client.ts (extended)
if (MOCK_MODE) {
  axios.interceptors.request.use(mockAdapter);
  // mockAdapter resolves to mocked response without hitting network
}
```

`mock-client.ts` switches on URL pattern → calls the matching handler in `lib/mock/handlers/`. Each handler reads/writes the `mock-state.store` (Zustand) so mutations persist within a session.

To re-enable backend later: set `NEXT_PUBLIC_MOCK_MODE=false`. No code changes needed.

### AI chat FAB
Stays mounted in `(app)/layout.tsx`. Will fail silently because backend is unreachable. Per user decision: untouched for now. Optional follow-up: add a mock handler for `/ai/chat`.

---

## 9. Execution order (numbered, sequential)

Each step is one TaskCreate entry. Mark in_progress when starting, completed when done.

### Step 1 — Mock infrastructure
- Add `frontend/.env.local` entry `NEXT_PUBLIC_MOCK_MODE=true`
- Create `lib/mock/mode.ts`
- Create `lib/mock/mock-client.ts` with axios mock adapter (URL-pattern dispatch table)
- Create `mocks/users.mock.ts` with 8 demo users
- Create `mocks/orgs.mock.ts` with Companies A/B/C
- Wire `mock-client.ts` into existing `lib/api/client.ts`
- Verify: starting `npm run dev` doesn't crash, no network calls leak

### Step 2 — Roles config + auth store
- Create `config/roles.ts`:
  - `Role` enum: `SUPER_ADMIN | SUPPORT_AGENT | ORG_ADMIN | PM | PROCUREMENT | SURVEYOR | SITE_ENG | CLIENT`
  - `ROLE_PREFIX[Role]` → `/super-admin`, `/admin`, etc.
  - `ROLE_HOME[Role]` → e.g., `/super-admin/dashboard`
- Create `config/sidebar-nav.ts` — `SIDEBAR_BY_ROLE: Record<Role, NavItem[]>` populated from § 4
- Extend `store/auth.store.ts`: add `role: Role | null`
- Add `loginAsDemo(userId)` action — sets user + role + cookie, returns `ROLE_HOME[role]`
- Add `logout()` action — clears store + cookie

### Step 3 — Sidebar + topbar refactor
- Refactor `components/shared/Sidebar.tsx`:
  - Read `SIDEBAR_BY_ROLE[user.role]` instead of hard-coded `NAV_ITEMS`
  - Remove sidebar-bottom avatar block
  - Remove "Switch Company" button
- Refactor `components/shared/Header.tsx` (topbar):
  - Add avatar dropdown menu (Profile · Settings · Logout)
  - Add notifications bell (count from `mocks/notifications.mock.ts`)
- Update `components/shared/AppLayout.tsx` if needed for new topbar layout

### Step 4 — Login page rewrite + middleware + cleanup
- Rewrite `app/(auth)/login/page.tsx` as 8-card demo-user picker
- Delete `app/company-select/` entirely
- Delete `features/companies/` entirely
- Delete `store/company.store.ts`
- Remove all `useCompanyStore` references
- Update `middleware.ts`:
  - Check `mock_role` cookie
  - Redirect to `/login` if missing
  - Redirect to `ROLE_HOME[role]` if path doesn't match user's role prefix
- Rename `app/(dashboard)/` route group → `app/(app)/`
- Delete legacy `app/(app)/dashboard/`, `app/(app)/users/`, `app/(app)/page.tsx`
- Add `app/(app)/page.tsx` that redirects to `ROLE_HOME[role]`
- Verify: login → land on correct dashboard per role; sidebar adapts; logout works

### Step 5 — All dashboards (smoke test routing)
For each role, create a minimal dashboard page with:
- Page header
- 4 stat cards (mocked numbers)
- One placeholder chart or empty state

Roles in this order: Super Admin → Org Admin → PM → Site Eng → Support Agent → Procurement → Surveyor → Client.

After this step: log in as each demo user and confirm sidebar + dashboard render correctly.

### Step 6 — Deep modules (highest demo value)

**6a. Tickets** (`features/tickets/`)
- Create `mocks/tickets.mock.ts` (~30 tickets, varied status/priority/org)
- Build `TicketTable`, `TicketDetail`, `TicketCommentThread`, `TicketStatusBadge`, `NewTicketModal`
- Wire into `/super-admin/tickets`, `/support-agent/tickets`, `/admin/support`, `/client/support`
- Each role gets the same component but with different actions enabled (Support Agent: full CRUD; Org Admin/Client: create + view their own)

**6b. Building / Units + My Property + Payments + Progress** (Client)
- Create `mocks/units.mock.ts` (~24 units across 6 floors)
- Create `mocks/payments.mock.ts` (12-month installment schedule)
- Create `mocks/progress.mock.ts` (photos + milestones)
- Build `UnitGallery`, `UnitCard`, `UnitDetail`, `UnitFilters`
- Build `PaymentSchedule`, `PaymentCard`
- Build `ProgressTimeline`, `MilestoneList`, `PhotoGallery`
- Wire into `/client/units`, `/client/my-property`, `/client/payments`, `/client/progress`

**6c. Daily Reports** (`features/site-reports/`)
- Create `mocks/daily-reports.mock.ts`
- Build `ReportList`, `ReportForm` (weather, manpower, equipment, work done sections), `ReportDetail`
- Wire into `/site-eng/reports/*` and `/pm/reports/*`

**6d. Issues** (`features/site-issues/`)
- Create `mocks/issues.mock.ts`
- Build `IssueList`, `IssueDetail`, `IssueSeverityBadge`
- Wire into `/site-eng/issues/*` and `/pm/issues/*`

### Step 7 — Lite mocks
- `/super-admin/organizations` — table of all orgs + create-org modal
- `/super-admin/org-admins` — table of org-level admins
- `/super-admin/plans` — table of subscription tiers
- `/super-admin/billing` — system-wide invoices
- `/super-admin/audit-log` — activity feed
- `/admin/projects` — reuse PM projects component, scoped to org
- `/admin/people` — reuse existing UserTable component
- `/admin/subscription` — current plan card + upgrade button
- `/admin/billing` — invoice list
- `/admin/reports` — cross-project roll-up cards
- `/pm/projects` — list + detail
- `/pm/schedule` — static Gantt
- `/pm/team` — project team list

### Step 8 — Placeholders
For all placeholder modules listed in § 5, render `<ModulePreview title={...} description={...} icon={...} statCards={...} />`.

Modules: Suppliers, Purchase Orders, Deliveries, Material Requests, BOQ, Variations, Valuations, Budget, Tasks (PM + Site Eng), Inspections, Documents (PM), Settings (every role).

### Step 9 — Profile + Settings + Notifications
- `/profile` page — avatar upload + name + email (mock save)
- `/settings` page — generic user settings (notifications prefs, language)
- Notifications bell dropdown — list of mock notifications

### Step 10 — QA pass
- Log in as each of the 8 demo users
- Click every sidebar item, every detail link
- Confirm: no dead links, no console errors, no leaked network calls
- Confirm: logout from any role lands on `/login` and clears state
- Confirm: typing a wrong-role URL in the address bar redirects to user's home

---

## 10. Definition of done

- [ ] All 8 roles have a working dashboard
- [ ] All sidebar entries in § 4 navigate to a real page (deep, lite, or placeholder — not 404)
- [ ] Login → role-specific home; logout → `/login`
- [ ] No backend calls succeed (verified by stopping backend)
- [ ] `MOCK_MODE=false` would re-enable real API (no hard-coded mock paths in business logic)
- [ ] Tickets module is fully demoable end-to-end (create, comment, change status, assign)
- [ ] Client Units → Payments → Progress flow is fully demoable end-to-end
- [ ] Daily Reports and Issues are fully demoable end-to-end
- [ ] Topbar avatar dropdown works (Profile · Settings · Logout)
- [ ] No references to `useCompanyStore` or `/company-select` remain
- [ ] `npm run lint` and `npm run type-check` both pass

---

## 11. Out of scope (explicit non-goals)

- Backend changes (CLAUDE.md AI module, Prisma schema, NestJS modules) — untouched
- Real authentication (no JWT, no token refresh)
- Real-time / WebSocket features
- File upload (use placeholder thumbnails)
- AI chat backend wiring (FAB stays but won't function)
- Internationalization
- Mobile / responsive polish beyond what MUI gives for free
- E2E tests (manual click-through QA only)

---

## 12. Sources (industry research)

- [Procore Permissions](https://support.procore.com/products/online/user-guide/project-level/directory/permissions)
- [Procore User Permissions Matrix](https://support.procore.com/references/user-permissions-matrix-web)
- [Buildertrend Client Portal](https://buildertrend.com/communication/construction-client-portal/)
- [Buildertrend Subcontractor Overview](https://buildertrend.com/help-article/subcontractor-overview/)
- [Autodesk Construction Cloud — Custom Roles](https://forums.autodesk.com/t5/community-blog-aec-english/custom-roles-on-the-autodesk-construction-cloud-platform/ba-p/10987457)
- [ACC Best Practice — Permission Setup](https://resources.imaginit.com/support-blog/acc-best-practice-part-2-permission-set-up)
- [Bill of Quantities Software (RIB)](https://www.rib-software.com/en/blogs/bill-of-quantities)
- [Quantity Surveyor — Cost Estimation Software (Danaos)](https://danaos-projects.com/role-explorer/quantity-surveyor/)
- [Real Estate CRM Buyer Journey](https://metadatacorp.com/how-real-estate-developers-use-crm-to-manage-the-full-buyer-journey-from-lead-to-handover/)
- [Top Real Estate Client Portal Solutions](https://contentsnare.com/real-estate-client-portal/)
