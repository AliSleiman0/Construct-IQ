# QA Prompt 07 — Org Admin: Reports & Projects

## Scope
`/admin/reports` — project list with status filters, ProjectsTable; `/admin/projects` — full project list; `/admin/projects/[id]` — project detail; `/admin/people` — team members list.

## Prerequisites
- Logged in as `orgadmin@constructiq.com` / `Demo@1234`.
- Seed data: at least 3 projects with different statuses; team members present.

---

## REPORTS PAGE

## TC-07-001: Reports Page Renders
**Steps:**
1. Navigate to `/admin/reports`.

**Expected:**
- Page header: "Reports".
- Summary stat cards: Total Projects, Active Projects, Reports Filed (last 30d), Open Issues.
- ProjectsTable with list of org projects.

---

## TC-07-002: Stat Cards — Total Projects
**Steps:**
1. Note value on "Total Projects" card.
2. Cross-reference with `/admin/dashboard` "Total Projects" card.

**Expected:**
- Values match.

---

## TC-07-003: Stat Cards — Reports Filed Last 30 Days
**Steps:**
1. Note value on "Reports Filed" card.
2. Query: `db.dailyreports.countDocuments({ organizationId: <orgId>, createdAt: { $gte: <30 days ago> } })`.

**Expected:**
- Value matches DB count.

---

## TC-07-004: Projects Table — Renders All Org Projects
**Steps:**
1. Observe the ProjectsTable on reports page.

**Expected:**
- All org projects listed (at least seeded ones).
- Columns: Name/Code, Status, Budget, Target End Date, (PM name if available).

---

## TC-07-005: Projects Table — Status Column Mapping
**Steps:**
1. Observe status values in the table.

**Expected:**
- ACTIVE from API shows as "IN_PROGRESS" or "Active" in the table (mapping applied).
- Status chips color-coded: Planning=grey, Active/IN_PROGRESS=blue, Completed=green, On Hold=orange, Cancelled=red.

---

## TC-07-006: Projects Table — Sort by Status
**Steps:**
1. Click the "Status" column header.

**Expected:**
- Projects reorder by status alphabetically.
- Toggle click reverses order.

---

## TC-07-007: Projects Table — Click Row Navigates to Project Detail
**Steps:**
1. Click on a project row.

**Expected:**
- Navigates to `/admin/projects/[id]` for that project.
- Project detail page loads.

---

## TC-07-008: Reports Page — Data Scope
**Steps:**
1. Note projects shown for orgA admin.
2. Log in as orgB admin, navigate to `/admin/reports`.

**Expected:**
- orgB's projects shown, not orgA's.

---

## PROJECTS PAGE

## TC-07-009: Projects List Page Renders
**Steps:**
1. Navigate to `/admin/projects`.

**Expected:**
- All org projects listed in a table or card grid.
- Search/filter input present.
- "New Project" button (if org admin has create permission).

---

## TC-07-010: Projects — Search
**Steps:**
1. Type part of a project name or code in the search box.

**Expected:**
- List filters to matching projects.
- Clearing search restores full list.

---

## TC-07-011: Projects — Filter by Status
**Steps:**
1. Select "Active" from status filter dropdown.

**Expected:**
- Only active projects shown.

---

## TC-07-012: Projects — Create New Project
**Steps:**
1. Click "New Project".
2. Fill in: Name, Code, Start Date, End Date, Budget.
3. Submit.

**Expected:**
- POST `/api/v1/projects` returns 201.
- Project appears in list.
- Success snackbar.

---

## TC-07-013: Projects — Create Missing Required Fields
**Steps:**
1. Open create form, leave Name empty, submit.

**Expected:**
- Validation error shown.
- No API request.

---

## TC-07-014: Projects — Edit Project
**Steps:**
1. Open a project, click Edit.
2. Change the name.
3. Save.

**Expected:**
- PATCH returns 200.
- Updated name in list.

---

## PROJECT DETAIL

## TC-07-015: Project Detail Page Renders
**Steps:**
1. Click on any project to open `/admin/projects/[id]`.

**Expected:**
- Header shows: project name, code, status chip, phase badges.
- Tabs or sections: Overview, Tasks, Issues, Budget, Documents, Team.

---

## TC-07-016: Project Detail — Overview Section
**Steps:**
1. Observe the Overview section.

**Expected:**
- Start date, end date, budget total, budget spent, PM name, description visible.
- Milestone list or progress indicator present.

---

## TC-07-017: Project Detail — Tasks Section
**Steps:**
1. Click Tasks tab/section.

**Expected:**
- Task list for this project shown.
- Each task: title, status, assigned to, due date.
- "Add Task" button present.

---

## TC-07-018: Project Detail — Issues Section
**Steps:**
1. Click Issues tab/section.

**Expected:**
- Issues for this project listed.
- Priority chips color-coded (CRITICAL=red, HIGH=orange, MEDIUM=yellow, LOW=grey).

---

## TC-07-019: Project Detail — Budget Section
**Steps:**
1. Click Budget tab/section.

**Expected:**
- Budget total, spent, remaining shown.
- Progress bar: spent / total × 100%.
- Expense line items listed if any.

---

## PEOPLE PAGE

## TC-07-020: People / Team Members Page Renders
**Steps:**
1. Navigate to `/admin/people`.

**Expected:**
- List of team members in the organization.
- Columns: Name, Email, Role, Status, Joined At.
- "Invite Member" button visible.

---

## TC-07-021: People — Invite Member
**Steps:**
1. Click "Invite Member".
2. Fill in email, role selection.
3. Submit.

**Expected:**
- POST to users or invites API returns 201.
- New member appears in list (or pending invite shown).

---

## TC-07-022: People — Change Member Role
**Steps:**
1. Click edit on a team member.
2. Change role.
3. Save.

**Expected:**
- Role updated.
- Member sees different permissions on next login.

---

## TC-07-023: People — Remove Member
**Steps:**
1. Click "Remove" on a non-admin member.
2. Confirm.

**Expected:**
- User deactivated or removed from org.
- No longer visible in people list (or shows as inactive).
- That user can no longer access org data.

---

## TC-07-024: People — Member Count Matches Dashboard
**Steps:**
1. Note member count on `/admin/people`.
2. Compare to "Team Members" card on `/admin/dashboard`.

**Expected:**
- Values match.
