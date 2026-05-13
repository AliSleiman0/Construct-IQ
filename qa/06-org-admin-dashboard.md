# QA Prompt 06 — Org Admin: Dashboard

## Scope
`/admin/dashboard` — stat cards, project status distribution, issue breakdown, weekly report chart, recent activity feed, quick actions.

## Prerequisites
- Logged in as `orgadmin@constructiq.com` / `Demo@1234`.
- Seed data: projects, issues, daily reports, audit log entries for the org.
- Backend `GET /dashboard/org` endpoint running.

---

## TC-06-001: Dashboard Page Renders Without Error
**Steps:**
1. Log in as org admin.
2. Navigate to `/admin/dashboard`.

**Expected:**
- Page loads fully.
- No console errors.
- No perpetual skeleton/loading state.

---

## TC-06-002: Loading Skeleton
**Steps:**
1. Throttle network to Slow 3G in DevTools.
2. Navigate to `/admin/dashboard`.

**Expected:**
- Skeleton loaders shown for stat cards and panels during fetch.
- Skeletons replaced by real data once API responds.

---

## TC-06-003: Stat Cards — Active Projects
**Steps:**
1. Observe the "Active Projects" stat card.
2. Query MongoDB: `db.projects.countDocuments({ organizationId: <orgId>, status: 'ACTIVE' })`.

**Expected:**
- Card value matches DB count.

---

## TC-06-004: Stat Cards — Total Projects
**Steps:**
1. Observe "Total Projects" card.
2. Query: `db.projects.countDocuments({ organizationId: <orgId> })`.

**Expected:**
- Card value matches.

---

## TC-06-005: Stat Cards — Team Members
**Steps:**
1. Observe "Team Members" (or similar) stat card.
2. Query: `db.users.countDocuments({ organizationId: <orgId> })`.

**Expected:**
- Card value matches.

---

## TC-06-006: Stat Cards — Budget Metrics
**Steps:**
1. Observe budget total and budget spent cards.
2. Query: `db.projects.aggregate([{ $match: { organizationId: <orgId> } }, { $group: { _id: null, total: { $sum: '$totalBudget' } } }])`.

**Expected:**
- Budget total matches aggregate.
- Budget burn percentage = (spent / total) × 100 — verify formula is correct.

---

## TC-06-007: Project Status Distribution
**Steps:**
1. Observe the project status breakdown (pie chart, progress bars, or stat grid).

**Expected:**
- Status labels present: Planning, Active, On Hold, Completed, Cancelled.
- Sum of all status counts equals total project count from TC-06-004.

---

## TC-06-008: Issue Breakdown
**Steps:**
1. Observe "Open Issues" card or breakdown.
2. Query: `db.issues.countDocuments({ organizationId: <orgId>, status: { $ne: 'RESOLVED' } })`.

**Expected:**
- Open issue count matches.
- Priority breakdown (critical, high, medium, low) sums to open issue total.

---

## TC-06-009: Weekly Report Counts Chart
**Steps:**
1. Observe the bar chart showing weekly report counts.

**Expected:**
- 4 bars (last 4 weeks) visible.
- Hovering shows week label and count.
- Counts are non-negative integers.

---

## TC-06-010: Weekly Report Counts — Data Accuracy
**Steps:**
1. Note the count for the most recent week from the chart.
2. Query: `db.dailyreports.countDocuments({ organizationId: <orgId>, createdAt: { $gte: <start of last week>, $lte: <end of last week> } })`.

**Expected:**
- Count matches.

---

## TC-06-011: Recent Activity Feed
**Steps:**
1. Observe the "Recent Activity" section.

**Expected:**
- At least the seeded audit log entries shown (up to 10).
- Each entry: avatar with color, user name, action description, project code/link, relative timestamp (e.g., "2h ago").
- Project code is a clickable link (or text if not implemented).

---

## TC-06-012: Recent Activity — Relative Timestamps
**Steps:**
1. Hover over a relative timestamp (e.g., "3 days ago").

**Expected:**
- Tooltip or title shows the absolute datetime.
- dayjs fromNow() format matches the actual createdAt value.

---

## TC-06-013: Quick Actions Panel
**Steps:**
1. Observe the "Quick Actions" section on the dashboard.

**Expected:**
- Buttons present: "New Project", "View Reports", "Manage Team" (or similar labels per implementation).
- Clicking each navigates to the correct route.

---

## TC-06-014: Dashboard — Data Scoped to Org
**Steps:**
1. Note the active project count for orgA (logged in as orgA admin).
2. Log out, log in as orgB admin.
3. Navigate to `/admin/dashboard`.

**Expected:**
- Active project count reflects orgB's projects, not orgA's.
- No cross-org data leakage.

---

## TC-06-015: Dashboard — API Request Verification
**Steps:**
1. Open DevTools → Network.
2. Navigate to `/admin/dashboard`.

**Expected:**
- `GET /api/v1/dashboard/org` request fired.
- Request includes `X-Organization-Id` header.
- Response: 200 with `{ success: true, data: { activeProjectCount, totalProjectCount, teamMemberCount, budgetTotal, ... } }`.

---

## TC-06-016: Dashboard Refresh
**Steps:**
1. On `/admin/dashboard`, add a project via another tab/tool.
2. Reload the dashboard page.

**Expected:**
- New project count reflected after reload (React Query re-fetches on mount).

---

## TC-06-017: Dashboard — No Projects Empty State
**Steps:**
1. Use a newly seeded org that has zero projects.
2. Log in as its admin.
3. Navigate to `/admin/dashboard`.

**Expected:**
- All count cards show 0.
- Charts show empty state gracefully (no JS errors, no broken UI).
- "No recent activity" message if activity feed is empty.

---

## TC-06-018: Dashboard Sidebar Navigation
**Steps:**
1. On `/admin/dashboard`, observe the sidebar.

**Expected:**
- Links visible: Dashboard, Reports, People, Projects, Support, Billing, Subscription, Settings.
- "Dashboard" link is highlighted as active.
- Clicking each link navigates to the correct `/admin/*` page.
