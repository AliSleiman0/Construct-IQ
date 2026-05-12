# QA Test Prompts — Org Admin Pages

These 3 prompts are designed to be run sequentially in fresh Claude Code sessions. They fully test all 6 org admin pages against the real backend.

**Prerequisites:**
- MongoDB replica set running on port 27019
- Backend seeded (`npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts`)
- Backend running (`npm run start:dev` on port 4000)
- Frontend running (`npm run dev` on port 3000)

---

## Prompt 1 — Backend API Smoke Tests (Auth + Dashboard + Reports data)

```
You are QA-testing the ConstructIQ org admin backend. The backend runs at http://localhost:4000/api/v1. Run every test below using curl commands. Report PASS/FAIL for each with the response status code and a one-line summary of the response body.

### Step 1: Login as Org Admin
POST /api/v1/auth/login with body {"email":"orgadmin@constructiq.com","password":"Demo@1234"}
- Save the access_token cookie from the response headers for all subsequent requests.
- PASS if status 200/201 and response contains user.firstName = "Org".

### Step 2: Dashboard endpoint
GET /api/v1/dashboard/org (with auth cookie)
- PASS if status 200 and response contains all of these fields: activeProjectCount, totalProjectCount, teamMemberCount, budgetTotal, budgetSpent, budgetBurnPct, openIssueCount, openIssuesByPriority (with critical/high/medium/low), projectStatusDistribution (with planning/active/onHold/completed/cancelled), weeklyReportCounts (array with week/count), reportsFiledLast30d, recentActivity (array).

### Step 3: Org Settings — GET defaults
GET /api/v1/org-settings (with auth cookie)
- PASS if status 200 and response contains brandColor, theme, timezone, currency, dateFormat, weekStart, measurement, notifications, twoFactorRequired, passwordPolicy, sessionTimeoutMin, ssoEnabled.

### Step 4: Org Settings — PATCH update
PATCH /api/v1/org-settings with body {"brandColor":"#2e7d32","theme":"dark","timezone":"America/Chicago","sessionTimeoutMin":60}
- PASS if status 200 and response shows the updated values (brandColor="#2e7d32", theme="dark", timezone="America/Chicago", sessionTimeoutMin=60).

### Step 5: Org Settings — GET verify update
GET /api/v1/org-settings (with auth cookie)
- PASS if status 200 and the returned values match what was patched in Step 4.

### Step 6: Org Settings — Revert
PATCH /api/v1/org-settings with body {"brandColor":"#1976d2","theme":"light","timezone":"America/New_York","sessionTimeoutMin":480}
- PASS if status 200.

### Step 7: Support Tickets — List
GET /api/v1/support-tickets (with auth cookie)
- PASS if status 200 and response is an array with 3 tickets (from seed). Each ticket should have: id, subject, description, category, priority, status, createdBy (with firstName/lastName), _count.comments.

### Step 8: Support Tickets — Create
POST /api/v1/support-tickets with body {"subject":"QA Test Ticket","description":"Automated QA test — please ignore.","category":"TECHNICAL","priority":"HIGH"}
- Save the returned ticket ID.
- PASS if status 201 and response contains the created ticket with status="OPEN" and the subject matches.

### Step 9: Support Tickets — Get by ID
GET /api/v1/support-tickets/{id} (using the ID from Step 8)
- PASS if status 200 and response contains the ticket details plus an empty comments array.

### Step 10: Support Tickets — Add comment
POST /api/v1/support-tickets/{id}/comments with body {"content":"This is a QA test comment.","isInternal":false}
- PASS if status 201 and response contains the comment with user info.

### Step 11: Support Tickets — Verify comment
GET /api/v1/support-tickets/{id} (same ID)
- PASS if status 200 and comments array now has 1 entry.

### Step 12: Support Tickets — Update status
PATCH /api/v1/support-tickets/{id} with body {"status":"RESOLVED"}
- PASS if status 200 and response shows status="RESOLVED" and resolvedAt is not null.

### Step 13: Support Tickets — Verify final count
GET /api/v1/support-tickets
- PASS if status 200 and array length is 4 (3 seeded + 1 created).

### Step 14: Permission guard test
Login as client@constructiq.com / Demo@1234 (Client Viewer role — no support_tickets permission).
GET /api/v1/support-tickets
- PASS if status 403 (Forbidden).
GET /api/v1/dashboard/org
- PASS if status 403 (Forbidden).

### Step 15: Cleanup
Login back as orgadmin and DELETE or note that the QA ticket exists (no delete endpoint, so just note it).

Print a final summary table: Test # | Endpoint | Expected | Actual | PASS/FAIL
```

---

## Prompt 2 — Frontend Page Rendering & Data Binding (Dashboard + Reports + Support)

```
You are QA-testing the ConstructIQ frontend org admin pages. The app runs at http://localhost:3000. The backend is at http://localhost:4000. Run all tests by reading the page source code, understanding the data flow, then using curl to verify the backend returns valid data that the frontend can render.

### Prerequisites
First, verify both servers are running:
- curl http://localhost:3000 (should return HTML)
- curl http://localhost:4000/api/v1/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"orgadmin@constructiq.com","password":"Demo@1234"}' (should return 200/201)

Save the auth cookies for subsequent API calls.

### Test Group A: Dashboard Page (/admin/dashboard)

Read the file: frontend/src/app/(app)/admin/dashboard/page.tsx

A1. Verify useOrgDashboard hook calls GET /api/v1/dashboard/org
- Curl the endpoint, confirm it returns valid JSON.
- PASS if response has all required fields the page destructures: activeProjectCount, totalProjectCount, teamMemberCount, budgetBurnPct, budgetSpent, budgetTotal, openIssueCount, openIssuesByPriority, projectStatusDistribution, weeklyReportCounts, reportsFiledLast30d, recentActivity.

A2. Verify StatCard data binding:
- Card 1 "Active Projects": value should be String(activeProjectCount), hint should include totalProjectCount.
- Card 2 "Team Members": value should be String(teamMemberCount).
- Card 3 "Budget Burn": value should be "{budgetBurnPct}%".
- Card 4 "Open Issues": value should be String(openIssueCount).
- PASS if all values from the API response are numeric and can render correctly.

A3. Verify MiniBarChart data for "Project Status":
- The chart uses projectStatusDistribution.planning, .active, .onHold, .completed.
- PASS if all four values are present and are numbers >= 0.

A4. Verify MiniBarChart data for "Weekly Reports Filed":
- The chart maps weeklyReportCounts array to {label: w.week, value: w.count}.
- PASS if weeklyReportCounts is an array of objects with week (string) and count (number).

A5. Verify Recent Activity rendering:
- Each activity needs: id, userName, avatarColor, action, projectCode, projectId, detail, createdAt.
- The page calls dayjs(a.createdAt).fromNow() — so createdAt must be a valid date string.
- PASS if recentActivity is an array and each item has all required fields with correct types.

A6. Verify Quick Actions navigation targets exist:
- /admin/people, /admin/support, /admin/billing, /admin/subscription
- Check that /admin/support and /admin/billing pages exist (they do).
- PASS if the hrefs in QUICK_ACTIONS point to valid routes.

### Test Group B: Reports Page (/admin/reports)

Read the file: frontend/src/app/(app)/admin/reports/page.tsx

B1. Verify the page calls TWO hooks:
- useOrgDashboard() for KPI stats
- useProjects() for the projects table (calls GET /api/v1/projects)
- Curl GET /api/v1/projects with auth cookie.
- PASS if the projects endpoint returns an array (may be empty if no projects seeded).

B2. Verify StatCard data binding uses dashboard data:
- "Active Projects" from dashboard.activeProjectCount
- "Total Budget Burn" from dashboard.budgetSpent / dashboard.budgetTotal
- "Reports Filed (30d)" from dashboard.reportsFiledLast30d
- "Open Issues" from dashboard.openIssueCount
- PASS if all values from dashboard response are available.

B3. Verify Issues by Severity chart:
- Uses openIssuesByPriority.critical, .high, .medium, .low with custom colors.
- PASS if all four values are present.

B4. Verify ProjectsTable renders with real data:
- The table expects projects with: id, name, code, status, totalBudget, currency.
- PASS if the projects API response (even if empty array) matches the expected shape.

### Test Group C: Support Page (/admin/support)

Read the file: frontend/src/app/(app)/admin/support/page.tsx

C1. Verify useTickets() calls GET /api/v1/support-tickets:
- Curl the endpoint.
- PASS if returns array of tickets with id, subject, status, category, priority, createdBy, _count.

C2. Verify stat card calculations:
- Total = tickets.length
- Open = tickets.filter(t => t.status === 'OPEN').length
- In Progress = tickets.filter(t => t.status === 'IN_PROGRESS' || t.status === 'PENDING').length
- Resolved = tickets.filter(t => t.status === 'RESOLVED').length
- Manually count from API response and verify the math adds up.
- PASS if counts are correct.

C3. Verify TicketTable receives correct data:
- Read features/tickets/components/TicketTable.tsx
- Each ticket row shows: subject (as link to /admin/support/{id}), category, priority (Chip), status (Chip), createdBy name, createdAt (fromNow).
- PASS if all fields exist on each ticket in the API response.

C4. Verify NewTicketModal creates a ticket:
- Read features/tickets/components/NewTicketModal.tsx
- It calls useCreateTicket() which POSTs to /api/v1/support-tickets.
- The modal collects: subject, description, category (dropdown), priority (dropdown).
- Curl POST a new ticket and verify it appears in subsequent GET.
- PASS if create returns 201 and subsequent list includes the new ticket.

C5. Verify query invalidation:
- Read features/tickets/hooks/useTicketMutations.ts
- After create, it calls queryClient.invalidateQueries({ queryKey: ['support-tickets'] }).
- PASS if the invalidation key matches the query key in useTickets.ts (['support-tickets']).

Print a final summary table: Test ID | Description | PASS/FAIL | Notes
```

---

## Prompt 3 — Frontend Settings + Billing + Subscription + Cross-Page Integration

```
You are QA-testing the remaining ConstructIQ org admin pages and cross-page integration. The app runs at http://localhost:3000, backend at http://localhost:4000.

### Prerequisites
Login as orgadmin@constructiq.com / Demo@1234 and save auth cookies.

### Test Group D: Settings Page (/admin/settings)

Read the full file: frontend/src/app/(app)/admin/settings/page.tsx (it's ~1000 lines)

D1. Verify data loading:
- The page uses useOrgSettings() and useAuthStore().
- Curl GET /api/v1/org-settings with auth cookie.
- Curl GET /api/v1/auth/me with auth cookie to get user.organization data.
- PASS if both endpoints return valid data.

D2. Verify initial state mapping:
- Read the useMemo block that builds `initial` from orgSettings + user.organization.
- Verify these mappings are correct:
  - s.name ← org.name
  - s.slug ← org.slug
  - s.phone ← org.phone
  - s.publicEmail ← org.email
  - s.website ← org.website
  - s.brandColor ← orgSettings.brandColor
  - s.theme ← orgSettings.theme
  - s.timezone ← orgSettings.timezone
  - s.currency ← orgSettings.currency
  - s.measurement ← orgSettings.measurement
  - s.twoFactorRequired ← orgSettings.twoFactorRequired
  - s.passwordPolicy ← orgSettings.passwordPolicy
  - s.sessionTimeoutMin ← orgSettings.sessionTimeoutMin
  - s.ssoEnabled ← orgSettings.ssoEnabled
- PASS if all mappings have matching field names between API response and the initial state builder.

D3. Verify save mutation payload:
- Read the onClick handler for "Save changes" button.
- It calls updateSettings.mutateAsync() with a payload built from local state `s`.
- The payload includes: brandColor, theme, timezone, currency, dateFormat, weekStart, measurement, twoFactorRequired, passwordPolicy, sessionTimeoutMin, ssoEnabled, notifications.
- Verify the PATCH /api/v1/org-settings accepts all these fields by reading the DTO: backend/src/modules/org-settings/dto/update-org-settings.dto.ts.
- PASS if every field in the frontend payload has a matching field in the DTO.

D4. Verify dirty detection:
- The page computes `dirty = JSON.stringify(s) !== JSON.stringify(initial)`.
- The save/discard bar only renders when `dirty` is true.
- The useEffect syncs `s` with `initial` when orgSettings data loads.
- PASS if the logic is correct (useEffect dependency is [initial]).

D5. Verify settings round-trip:
- PATCH /api/v1/org-settings with {"measurement":"metric","currency":"EUR"}
- GET /api/v1/org-settings — verify measurement="metric" and currency="EUR".
- PATCH /api/v1/org-settings with {"measurement":"imperial","currency":"USD"} to revert.
- PASS if values persist correctly.

D6. Verify 7 section navigation:
- The SECTIONS array has ids: profile, address, branding, localization, notifications, security, danger.
- Each section renders conditionally based on `active` state.
- PASS if all 7 section IDs are present and each has corresponding JSX.

### Test Group E: Billing Page (/admin/billing) — Mock Verification

Read: frontend/src/app/(app)/admin/billing/page.tsx and frontend/src/mocks/billing.mock.ts

E1. Verify mock data structure:
- invoicesForOrg() returns an array of Invoice objects.
- Each has: id, number, planName, issuedAt, dueAt, status (InvoiceStatus), amountUsd.
- PASS if the mock returns 6 invoices with correct types.

E2. Verify balance calculation:
- balance = invoices.filter(DUE or OVERDUE).reduce(sum amountUsd)
- From mock data: 1 DUE ($299) + 1 OVERDUE ($299) = $598.00
- PASS if the calculation logic matches expected output.

E3. Verify no real API calls:
- The page only imports from '@/mocks/billing.mock' and '@/store/auth.store'.
- It does NOT import any hook from @tanstack/react-query or any api client.
- PASS if confirmed.

E4. Verify status badge colors:
- PAID → 'success' (green), DUE → 'warning' (orange), OVERDUE → 'error' (red)
- PASS if STATUS_COLOR map is correct.

### Test Group F: Subscription Page (/admin/subscription) — Mock Verification

Read: frontend/src/app/(app)/admin/subscription/page.tsx

F1. Verify fully static/mock:
- The page should have NO imports from api clients or react-query hooks.
- All data (plan name, price, usage numbers) is hardcoded in the component.
- PASS if confirmed.

F2. Verify interactive elements are mock:
- "Upgrade to Enterprise" button shows a snackbar, no API call.
- "Downgrade" button shows a snackbar, no API call.
- PASS if both onClick handlers only call enqueueSnackbar().

### Test Group G: Cross-Page Integration

G1. Verify shared hooks don't conflict:
- Dashboard and Reports both use useOrgDashboard() with queryKey ['dashboard', 'org'].
- Navigating between them should share cached data, not refetch.
- PASS if both pages use identical queryKey.

G2. Verify support ticket mutations invalidate correctly:
- Read useCreateTicket, useUpdateTicket, useAddComment in features/tickets/hooks/useTicketMutations.ts.
- useCreateTicket invalidates ['support-tickets'].
- useUpdateTicket invalidates ['support-tickets'] AND ['support-tickets', ticketId].
- useAddComment invalidates ['support-tickets', ticketId].
- Read useTickets.ts — uses queryKey ['support-tickets'].
- PASS if all invalidation keys correctly match the query keys.

G3. Verify auth store is used consistently:
- Dashboard uses useAuthStore for user.firstName and user.organization.name.
- Settings uses useAuthStore for user.organization data.
- Support uses NO auth store (tickets are org-scoped server-side via JWT).
- Billing uses useAuthStore for user.organization.id.
- PASS if each page's auth usage is correct and consistent.

G4. Verify API client interceptor works for all endpoints:
- Read frontend/src/lib/api/client.ts.
- All API calls use the same apiClient with baseURL '/api/v1'.
- The response interceptor unwraps { success, data, timestamp } → data.
- The request interceptor injects X-Organization-Id from localStorage (for Super Admin).
- PASS if all new API files (dashboard.api.ts, support-tickets.api.ts, org-settings.api.ts) import from './client'.

G5. Verify no remaining mock imports on real pages:
- Grep for '@/mocks' or 'mock-state' or 'projectsForOrg' in all admin pages EXCEPT billing and subscription.
- Dashboard, Reports, Support, Settings should have ZERO mock imports.
- PASS if only billing/page.tsx imports from @/mocks.

Print a final summary table: Test ID | Description | PASS/FAIL | Notes
Print an overall summary: X/Y tests passed across all 3 prompts.
```
