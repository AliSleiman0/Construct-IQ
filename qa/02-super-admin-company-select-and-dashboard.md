# QA Prompt 02 — Super Admin: Company Select & Dashboard

## Scope
`/company-select` page and `/super-admin/dashboard` — org picker, context switching, dashboard KPIs.

## Prerequisites
- Logged in as `admin@constructiq.com` / `Admin@1234`.
- Seed data present (orgA, orgB, orgC with members, plans, tickets).

---

## TC-02-001: Company Select Page Renders
**Steps:**
1. Log in as Super Admin.
2. Confirm redirect to `/company-select`.

**Expected:**
- List of seeded organizations visible (orgA, orgB, orgC).
- Each card shows org name, member count, plan name.
- Search/filter input present.

---

## TC-02-002: Organization Search/Filter
**Steps:**
1. On `/company-select`, type part of an org name in the search box.

**Expected:**
- List filters in real time to matching orgs.
- Clearing the search restores the full list.

---

## TC-02-003: Select an Organization
**Steps:**
1. Click on orgA's card.

**Expected:**
- `companyStore` (Zustand) updated with orgA's ID.
- Redirect to `/super-admin/dashboard`.
- `X-Organization-Id` header on subsequent requests equals orgA's ID.

---

## TC-02-004: Switch Organization Mid-Session
**Steps:**
1. Select orgA → navigate to super admin dashboard.
2. Navigate back to `/company-select` (via nav link or back button).
3. Select orgB.

**Expected:**
- Dashboard re-fetches data for orgB.
- All KPIs and stats reflect orgB's data.
- No stale data from orgA visible.

---

## TC-02-005: Super Admin Dashboard Renders
**Steps:**
1. Select any org on `/company-select`.
2. Observe `/super-admin/dashboard`.

**Expected:**
- Page renders with stat cards (total orgs, total users, active plans, monthly revenue or similar).
- No skeleton / loading state stuck indefinitely.
- No API errors in console.

---

## TC-02-006: Dashboard KPI Cards — Data Accuracy
**Steps:**
1. Via MongoDB (mongo-express at port 5050), count total organizations.
2. Compare to "Total Organizations" KPI card on super admin dashboard.

**Expected:**
- Card value matches DB count (or seeded value).

---

## TC-02-007: Dashboard — Recent Orgs or Activity List
**Steps:**
1. On super admin dashboard, observe any activity feed or recent organizations panel.

**Expected:**
- At least the seeded orgs appear.
- Each entry has name, status (ACTIVE/INACTIVE), plan.
- Clicking an org navigates to org detail or org list with that org highlighted.

---

## TC-02-008: Dashboard — Charts / Graphs
**Steps:**
1. Observe any bar chart or line chart on the super admin dashboard.

**Expected:**
- Chart renders without JS errors.
- Data visible (bars/lines not empty).
- Tooltip on hover shows correct values.

---

## TC-02-009: Dashboard — Loading Skeleton
**Steps:**
1. On a slow connection (DevTools → Network → "Slow 3G"), navigate to `/super-admin/dashboard`.

**Expected:**
- Skeleton loaders shown during fetch.
- After load, skeletons replaced by real data.

---

## TC-02-010: Dashboard — Empty State (New Org)
**Steps:**
1. Create a brand new organization via super admin (no members, no projects).
2. Select that org on `/company-select`.
3. Observe super admin dashboard for that org.

**Expected:**
- Zeros or "No data" displayed gracefully.
- No uncaught errors or blank panels.

---

## TC-02-011: Non-Super-Admin Cannot Access Company Select
**Steps:**
1. Log in as `orgadmin@constructiq.com`.
2. Navigate to `http://localhost:3000/company-select`.

**Expected:**
- Redirect to `/admin/dashboard` or 403 page.
- Company select not visible.

---

## TC-02-012: Non-Super-Admin Cannot Access Super Admin Dashboard
**Steps:**
1. Logged in as org admin.
2. Navigate to `http://localhost:3000/super-admin/dashboard`.

**Expected:**
- Redirect or 403.
- Super admin dashboard content not rendered.

---

## TC-02-013: Super Admin Header / Navbar
**Steps:**
1. Logged in as Super Admin on `/super-admin/dashboard`.

**Expected:**
- Sidebar or topnav shows super admin links: Dashboard, Organizations, Plans, Features, Billing, Tickets, Audit Log, Org Admins.
- Active link highlighted for Dashboard.
- "Switch Org" or "Company Select" link present.

---

## TC-02-014: Super Admin Avatar / User Info
**Steps:**
1. Observe the header while logged in as Super Admin.

**Expected:**
- Shows "Super Admin" label or the seeded name.
- Avatar or initials visible.
- No `organizationId` shown (super admin is cross-org).
