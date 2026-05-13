# QA Prompt 03 — Super Admin: Organizations CRUD

## Scope
`/super-admin/organizations` — list, create, edit, deactivate/activate, delete, view org detail.

## Prerequisites
- Logged in as Super Admin.
- Seed data present.

---

## TC-03-001: Organizations List Renders
**Steps:**
1. Navigate to `/super-admin/organizations`.

**Expected:**
- Table or card grid shows all seeded orgs (orgA, orgB, orgC at minimum).
- Columns visible: Name, Slug, Plan, Members, Status (ACTIVE/INACTIVE), Created At.
- Pagination or scroll if > 10 orgs.

---

## TC-03-002: Organization Search
**Steps:**
1. Type part of an org name in the search/filter input.

**Expected:**
- List filters to matching orgs in real time or on submit.
- Clearing search restores full list.

---

## TC-03-003: Organization Status Filter
**Steps:**
1. Apply filter "Active" only.
2. Confirm only active orgs shown.
3. Switch to "Inactive" — confirm only inactive orgs shown.
4. Switch to "All".

**Expected:**
- Filter works correctly for each state.

---

## TC-03-004: Create Organization — Happy Path
**Steps:**
1. Click "New Organization" / "Add Organization" button.
2. Fill in: Name = "QA Test Org", Slug = "qa-test-org", Plan = select any active plan.
3. Submit.

**Expected:**
- POST `/api/v1/organizations` returns 201.
- New org appears in the list.
- Success snackbar shown.

---

## TC-03-005: Create Organization — Duplicate Slug
**Steps:**
1. Attempt to create org with slug identical to an existing org (e.g., "org-a").

**Expected:**
- Error response: 400 or 409, "Slug already taken" or similar.
- Error snackbar shown.
- Org not created.

---

## TC-03-006: Create Organization — Missing Required Fields
**Steps:**
1. Open create dialog/form.
2. Leave Name empty, submit.

**Expected:**
- Client-side validation: "Name is required".
- No API request fired.

---

## TC-03-007: Edit Organization
**Steps:**
1. Click edit on any org.
2. Change the name.
3. Save.

**Expected:**
- PATCH `/api/v1/organizations/:id` returns 200.
- Updated name visible in the list.
- Success snackbar.

---

## TC-03-008: Edit Organization — Change Plan
**Steps:**
1. Edit an org.
2. Change its plan to a different active plan.
3. Save.

**Expected:**
- Plan field updated.
- Subscription page for that org would show the new plan (verify via org admin account).

---

## TC-03-009: Deactivate Organization
**Steps:**
1. Click "Deactivate" on an active org.
2. Confirm in dialog.

**Expected:**
- PATCH or POST to set status to INACTIVE.
- Org shows as "Inactive" in list.
- Success snackbar.
- Members of that org cannot log in (or get 403) after deactivation — verify by logging in as orgadmin of that org.

---

## TC-03-010: Reactivate Organization
**Steps:**
1. Find an inactive org.
2. Click "Activate" / "Reactivate".
3. Confirm.

**Expected:**
- Status changes to ACTIVE.
- Members can log in again.

---

## TC-03-011: Delete Organization
**Steps:**
1. Click "Delete" on the QA Test Org created in TC-03-004.
2. Confirm deletion in confirmation dialog.

**Expected:**
- DELETE `/api/v1/organizations/:id` returns 200 or 204.
- Org removed from list.
- Success snackbar.
- Navigating to that org's detail page returns 404.

---

## TC-03-012: Delete Organization — Confirmation Required
**Steps:**
1. Click "Delete" on any org.
2. Click "Cancel" in the confirmation dialog.

**Expected:**
- Org NOT deleted.
- No API request fired.

---

## TC-03-013: View Organization Detail
**Steps:**
1. Click on an org name or "View" button.

**Expected:**
- Detail view/page shows: Name, Slug, Plan, Status, Members list (with roles), Created At, billing summary.
- Or: modal opens with org info.

---

## TC-03-014: Organization Member Count Accuracy
**Steps:**
1. Note the member count shown in the organizations list for orgA.
2. Open mongo-express at port 5050, query `users` collection for `organizationId = orgA._id`.

**Expected:**
- Count matches.

---

## TC-03-015: Pagination
**Steps:**
1. If there are > 10 orgs, observe pagination controls.
2. Click "Next" page.

**Expected:**
- Second page of orgs loads.
- Page indicator updates.
- No items repeated or skipped.

---

## TC-03-016: Sort by Column
**Steps:**
1. Click the "Name" column header to sort ascending.
2. Click again to sort descending.

**Expected:**
- List reorders correctly.
- Sort indicator (arrow) toggles direction.
