# QA Prompt 10 — Org Admin: Billing & Subscription

## Scope
`/admin/billing` — invoice list, summary cards, download/pay actions; `/admin/subscription` — current plan details, features list, usage meters, upgrade/downgrade.

## Prerequisites
- Logged in as `orgadmin@constructiq.com` / `Demo@1234`.
- Seed data: invoices for the org (PAID, ISSUED, OVERDUE statuses).
- Plans seeded via super admin (STARTER, PRO, ENTERPRISE or similar).
- `useInvoices()` calls `GET /api/v1/invoices` scoped to org.
- `usePlans()` calls `GET /api/v1/plans`.
- `useOrgDashboard()` calls `GET /api/v1/dashboard/org`.

---

## BILLING PAGE

## TC-10-001: Billing Page Renders
**Steps:**
1. Navigate to `/admin/billing`.

**Expected:**
- Page header: "Billing".
- 3 summary cards: Current Balance, Payment Method, Next Invoice.
- Invoice table below cards.
- No console errors.

---

## TC-10-002: Billing — API Request
**Steps:**
1. DevTools → Network, navigate to `/admin/billing`.

**Expected:**
- `GET /api/v1/invoices` fires with `X-Organization-Id` header.
- Response 200 with array of invoices.
- Each invoice has: `_id`, `number`, `amountUsd`, `status`, `issuedAt`, `dueAt`.

---

## TC-10-003: Billing — Loading Skeleton
**Steps:**
1. Throttle network, navigate to `/admin/billing`.

**Expected:**
- Skeleton shown during fetch.
- After load, real data replaces skeleton.

---

## TC-10-004: Summary Card — Current Balance
**Steps:**
1. Observe "Current Balance" card.

**Expected:**
- Value = sum of `amountUsd` for invoices with status ISSUED or OVERDUE.
- Shows "X due · Y overdue" breakdown beneath the balance.
- Formatted as currency (e.g., $1,250.00).

---

## TC-10-005: Summary Card — Balance Accuracy
**Steps:**
1. Manually sum ISSUED + OVERDUE invoice amounts from the table.

**Expected:**
- Sum matches the "Current Balance" card value exactly.

---

## TC-10-006: Summary Card — Payment Method
**Steps:**
1. Observe "Payment Method" card.

**Expected:**
- Shows card brand (VISA), last 4 digits, expiry date.
- "Update" button visible (stub or functional).
- Clicking "Update" opens a form or snackbar.

---

## TC-10-007: Summary Card — Next Invoice
**Steps:**
1. Observe "Next Invoice" card.

**Expected:**
- Shows next invoice date and amount (or "No upcoming invoice").
- Card content matches plan pricing if dynamically wired.

---

## TC-10-008: Invoice Table — Columns
**Steps:**
1. Observe the invoice table.

**Expected:**
- Columns: Invoice #, Issued Date, Due Date, Status, Amount, Actions.
- Header text uppercase or styled distinctly.

---

## TC-10-009: Invoice Table — Status Color Coding
**Steps:**
1. Observe status chips in the invoice table.

**Expected:**
- PAID → green (success) chip.
- ISSUED → yellow (warning) chip.
- OVERDUE → red (error) chip.
- DRAFT → grey (default) chip.
- VOID → blue (info) chip.

---

## TC-10-010: Invoice Table — Date Formatting
**Steps:**
1. Observe the "Issued" and "Due" date columns.

**Expected:**
- Dates formatted as "MMM D, YYYY" (e.g., "May 13, 2026").
- Null/empty dates show "—" (em dash).

---

## TC-10-011: Invoice Table — Amount Formatting
**Steps:**
1. Observe the Amount column.

**Expected:**
- Amounts formatted with commas and 2 decimal places: "$1,250.00".
- Tabular numeral alignment (right-aligned).

---

## TC-10-012: Invoice Table — Pay Now Action
**Steps:**
1. Find an ISSUED invoice.
2. Click "Pay Now".

**Expected:**
- Snackbar: "Payment for INV-XXXX processed." (or real payment flow).
- If real: invoice status changes to PAID, balance card updates.
- If stub: snackbar only, no state change.
- Document which behavior is implemented.

---

## TC-10-013: Invoice Table — Pay Now Not Shown for PAID/VOID
**Steps:**
1. Observe a PAID invoice row.

**Expected:**
- "Pay now" button is NOT visible.
- Only "PDF" button shown.

---

## TC-10-014: Invoice Table — Download PDF
**Steps:**
1. Click "PDF" on any invoice.

**Expected:**
- Either PDF downloads, or snackbar: "INV-XXXX.pdf downloaded."
- No uncaught error.

---

## TC-10-015: Invoice Table — Empty State
**Steps:**
1. Use a brand new org with no invoices.
2. Navigate to `/admin/billing`.

**Expected:**
- Table shows "No invoices yet." message centered.
- Balance card shows $0.00.

---

## TC-10-016: Invoice Table — Pagination/Scroll
**Steps:**
1. If org has > 10 invoices, observe pagination or scroll behavior.

**Expected:**
- All invoices accessible without data loss.

---

## TC-10-017: Billing — Org Isolation
**Steps:**
1. Note invoice count for orgA admin.
2. Log in as orgB admin, navigate to `/admin/billing`.

**Expected:**
- orgB's invoices shown, not orgA's.

---

## SUBSCRIPTION PAGE

## TC-10-018: Subscription Page Renders
**Steps:**
1. Navigate to `/admin/subscription`.

**Expected:**
- Page header: "Subscription".
- Left panel: Current Plan details.
- Right panel: Usage this month.
- No console errors.

---

## TC-10-019: Subscription — APIs Called
**Steps:**
1. DevTools → Network, navigate to `/admin/subscription`.

**Expected:**
- `GET /api/v1/plans` fires (for plan data).
- `GET /api/v1/dashboard/org` fires (for usage data: teamMemberCount, totalProjectCount).
- Both return 200.

---

## TC-10-020: Subscription — Loading Skeleton
**Steps:**
1. Throttle network, navigate to `/admin/subscription`.

**Expected:**
- Skeleton shown while plansLoading || dashLoading.
- After both resolve, real content shown.

---

## TC-10-021: Subscription — Current Plan Display
**Steps:**
1. Observe the "Current Plan" panel.

**Expected:**
- Plan name shown (popular plan or first PRO plan from seed).
- Price per month displayed (e.g., "$299 / month").
- "ACTIVE" chip visible.
- Renewal date shown (static or dynamic).
- Gradient icon box with WorkspacePremiumIcon visible.

---

## TC-10-022: Subscription — Plan Name Accuracy
**Steps:**
1. Note plan name shown on subscription page.
2. Log in as super admin, navigate to plans list.

**Expected:**
- Plan name matches the "popular" or "PRO" plan in super admin plans list.

---

## TC-10-023: Subscription — Features List
**Steps:**
1. Observe "What's included" section under plan details.

**Expected:**
- Features list from the plan's `features[]` array shown.
- Each feature has a green check circle icon.
- Features displayed in 2-column grid.
- No features section if plan has empty features array.

---

## TC-10-024: Subscription — Features Accuracy
**Steps:**
1. Note features listed on subscription page.
2. Log in as super admin, view the plan's feature list.

**Expected:**
- Features match exactly.

---

## TC-10-025: Usage Meter — Members
**Steps:**
1. Observe "Members" usage bar.

**Expected:**
- Current = `dashboard.teamMemberCount` (real API data).
- Max = plan's `maxUsers`.
- Progress bar shows (current / max) × 100%.
- Text: "X of Y" (e.g., "5 of 50").
- Percentage label below bar.

---

## TC-10-026: Usage Meter — Projects
**Steps:**
1. Observe "Projects" usage bar.

**Expected:**
- Current = `dashboard.totalProjectCount` (real API data).
- Max = plan's `maxProjects`.
- Values match `/admin/dashboard` total project count.

---

## TC-10-027: Usage Meter — Storage (Stub)
**Steps:**
1. Observe "Storage" usage bar.

**Expected:**
- Shows "8.2 GB of 100 GB" (stub values acceptable).
- Progress bar at ~8%.
- No error from missing real data.

---

## TC-10-028: Usage Meter — Progress Bar Caps at 100%
**Steps:**
1. If a usage value exceeds the max (e.g., teamMemberCount > maxUsers), observe the bar.

**Expected:**
- LinearProgress value clamped at 100 (not >100%).
- Bar does not overflow.

---

## TC-10-029: Usage Info Banner
**Steps:**
1. Observe the info box below usage meters.

**Expected:**
- Blue info box shows: "You're using X% of your members and Y% of your projects. Plenty of room."
- X = Math.round((usersUsed / maxUsers) * 100).
- Y = Math.round((projectsUsed / maxProjects) * 100).
- Values are accurate.

---

## TC-10-030: Upgrade to Enterprise Button
**Steps:**
1. Click "Upgrade to Enterprise".

**Expected:**
- Snackbar: "Enterprise upgrade quote requested. Our team will reach out within 1 business day." (variant: success).
- No navigation or form required (stub behavior).

---

## TC-10-031: Downgrade Button
**Steps:**
1. Click "Downgrade".

**Expected:**
- Snackbar: "Downgrade flow is not available in this demo." (variant: error).
- No state change.

---

## TC-10-032: Subscription — Plan Not Found (Edge Case)
**Steps:**
1. Delete all plans from super admin.
2. Reload subscription page.

**Expected:**
- Page handles null/empty plans array gracefully.
- Falls back to default values (Professional, $299) or shows "No plan assigned".
- No uncaught JS error.

---

## TC-10-033: Subscription — High Usage Warning
**Steps:**
1. If members usage is > 80%, observe the usage bar color.

**Expected:**
- Bar color may change to warning/error (if implemented).
- Or: remains primary color (document expected behavior).

---

## TC-10-034: Cross-Page Consistency
**Steps:**
1. Note member count on subscription page usage meter.
2. Compare to "Team Members" stat card on `/admin/dashboard`.
3. Compare to member count on `/admin/people`.

**Expected:**
- All three values are equal.
- Single source of truth: `GET /api/v1/dashboard/org` → `teamMemberCount`.

---

## TC-10-035: Subscription — Org Isolation
**Steps:**
1. Observe plan and usage for orgA admin.
2. Log in as orgB admin, navigate to `/admin/subscription`.

**Expected:**
- orgB's usage data (teamMemberCount, totalProjectCount) shown.
- Plan may be the same if both on same plan (verify plan is correctly resolved for each org).
