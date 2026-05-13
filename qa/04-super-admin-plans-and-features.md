# QA Prompt 04 — Super Admin: Plans & Features CRUD

## Scope
`/super-admin/plans` and `/super-admin/features` — create, read, update, delete plans and feature flags; assign features to plans.

## Prerequisites
- Logged in as Super Admin.
- Seed data: at least 2 plans seeded (e.g., STARTER, PRO).

---

## TC-04-001: Plans List Renders
**Steps:**
1. Navigate to `/super-admin/plans`.

**Expected:**
- All seeded plans displayed (name, tier, price/month, maxUsers, maxProjects, isPopular flag, isActive status).
- "New Plan" button visible.

---

## TC-04-002: Plans — Create Happy Path
**Steps:**
1. Click "New Plan".
2. Fill in: Name = "QA Plan", Tier = "ENTERPRISE", Price = 999, maxUsers = 200, maxProjects = 500.
3. Toggle "Popular" off, "Active" on.
4. Add 2 features to the features list: "Advanced Analytics", "Dedicated Support".
5. Save.

**Expected:**
- POST `/api/v1/plans` returns 201.
- New plan appears in the list.
- Features visible on plan card/row.
- Success snackbar.

---

## TC-04-003: Plans — Create Missing Required Fields
**Steps:**
1. Open create dialog.
2. Leave Name empty, submit.

**Expected:**
- Validation error: "Name is required".
- No API call.

---

## TC-04-004: Plans — Price Validation
**Steps:**
1. Enter negative price (e.g., -50) or non-numeric string.

**Expected:**
- Validation error shown.
- No plan created.

---

## TC-04-005: Plans — Edit
**Steps:**
1. Click edit on any plan.
2. Change price from current value to a different value.
3. Save.

**Expected:**
- PATCH `/api/v1/plans/:id` returns 200.
- Updated price visible in list.
- Success snackbar.

---

## TC-04-006: Plans — Toggle Active/Inactive
**Steps:**
1. Click toggle or "Deactivate" on an active plan.

**Expected:**
- Plan marked inactive.
- Inactive plan not available for new org assignments (verify in org create form — plan not in dropdown).

---

## TC-04-007: Plans — Mark as Popular
**Steps:**
1. Toggle "Popular" on for one plan (ensure it's off for all others first).

**Expected:**
- Only one plan marked popular at a time (business rule check).
- Popular badge/chip visible on the plan card.
- Subscription page for any org shows this plan as the "current plan" if none specifically assigned.

---

## TC-04-008: Plans — Delete
**Steps:**
1. Delete the "QA Plan" created in TC-04-002.
2. Confirm in dialog.

**Expected:**
- DELETE `/api/v1/plans/:id` returns 200/204.
- Plan removed from list.
- Orgs previously on this plan show plan as null or fallback.

---

## TC-04-009: Plans — Cannot Delete Plan Assigned to Org
**Steps:**
1. Note which plan orgA uses.
2. Attempt to delete that plan.

**Expected:**
- Error response: 400/409 "Plan is assigned to one or more organizations."
- Plan NOT deleted.
- Error snackbar shown.

---

## TC-04-010: Features List Renders
**Steps:**
1. Navigate to `/super-admin/features`.

**Expected:**
- List of feature flags displayed: name, key, description, enabled status.
- "New Feature" button visible.

---

## TC-04-011: Features — Create
**Steps:**
1. Click "New Feature".
2. Fill in: Name = "AI Insights", Key = "ai_insights", Description = "Enables AI dashboard insights".
3. Set enabled = true.
4. Save.

**Expected:**
- POST to features API returns 201.
- Feature appears in list.

---

## TC-04-012: Features — Toggle Enabled/Disabled
**Steps:**
1. Toggle the "AI Insights" feature off.

**Expected:**
- Feature marked disabled.
- PATCH request updates `enabled: false`.

---

## TC-04-013: Features — Edit Name/Description
**Steps:**
1. Edit "AI Insights" — change description.
2. Save.

**Expected:**
- PATCH returns 200.
- Updated description shows in list.

---

## TC-04-014: Features — Delete
**Steps:**
1. Delete "AI Insights".
2. Confirm.

**Expected:**
- Feature removed from list.
- No references to it remain in plans (or graceful null handling).

---

## TC-04-015: Features — Assign to Plan
**Steps:**
1. On plan edit dialog, add "AI Insights" feature to the features array.
2. Save plan.

**Expected:**
- Plan's features[] includes "AI Insights".
- Subscription page for an org on this plan shows "AI Insights" in "What's included" section.

---

## TC-04-016: Plans — Subscription Page Integration
**Steps:**
1. Log in as org admin for orgA.
2. Navigate to `/admin/subscription`.
3. Compare plan name, price, maxUsers, maxProjects shown with what's in the super admin plans list.

**Expected:**
- Values match exactly.
- Features list in subscription page matches plan's features array.

---

## TC-04-017: Plans — Usage Meters Accuracy
**Steps:**
1. On `/admin/subscription`, observe the "Members" usage bar.
2. Compare `current` value with the team member count visible on `/admin/dashboard`.

**Expected:**
- Both values equal the actual member count in the DB.
