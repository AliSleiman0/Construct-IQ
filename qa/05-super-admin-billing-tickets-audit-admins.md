# QA Prompt 05 — Super Admin: Billing, Tickets, Audit Log, Org Admins

## Scope
`/super-admin/billing`, `/super-admin/tickets`, `/super-admin/tickets/[id]`, `/super-admin/audit-log`, `/super-admin/org-admins`.

## Prerequisites
- Logged in as Super Admin with an org selected.
- Seed data: invoices, tickets, audit log entries present.

---

## BILLING

## TC-05-001: Super Admin Billing List Renders
**Steps:**
1. Navigate to `/super-admin/billing`.

**Expected:**
- Table of invoices across all organizations.
- Columns: Invoice #, Organization, Status (PAID/ISSUED/OVERDUE/DRAFT/VOID), Amount, Issued At, Due At, Actions.
- Summary cards: total revenue, outstanding balance, overdue count.

---

## TC-05-002: Billing — Invoice Status Color Coding
**Steps:**
1. Observe the Status chips in the billing table.

**Expected:**
- PAID → green chip.
- ISSUED → yellow/warning chip.
- OVERDUE → red chip.
- DRAFT → grey chip.
- VOID → blue/info chip.

---

## TC-05-003: Billing — Create Invoice
**Steps:**
1. Click "New Invoice" (if available on super admin billing).
2. Select an org, enter amount, set due date.
3. Save.

**Expected:**
- POST `/api/v1/invoices` returns 201.
- Invoice appears in list with DRAFT or ISSUED status.

---

## TC-05-004: Billing — Mark Invoice as Paid
**Steps:**
1. Find an ISSUED invoice.
2. Click "Mark Paid" or "Pay Now".

**Expected:**
- PATCH request updates status to PAID.
- Status chip changes to green PAID.
- Balance on summary card decreases.

---

## TC-05-005: Billing — Download PDF (Stub)
**Steps:**
1. Click "PDF" button on any invoice row.

**Expected:**
- Either a PDF downloads, or a snackbar confirms "INV-XXXX.pdf downloaded" (stub behavior acceptable).
- No uncaught error.

---

## TC-05-006: Billing — Filter by Organization
**Steps:**
1. Select a specific org from a filter/dropdown.

**Expected:**
- Only invoices for that org displayed.
- Total in summary card updates to reflect filtered set.

---

## TC-05-007: Billing — Filter by Status
**Steps:**
1. Filter to show only OVERDUE invoices.

**Expected:**
- Only OVERDUE invoices shown.
- Count matches overdue count in summary card.

---

## TICKETS

## TC-05-008: Super Admin Tickets List Renders
**Steps:**
1. Navigate to `/super-admin/tickets`.

**Expected:**
- Table or card list of all support tickets across all orgs.
- Columns: Title, Category, Priority, Status, Reporter, Assigned To, Created At.
- Filter by status (OPEN, IN_PROGRESS, RESOLVED, CLOSED).

---

## TC-05-009: Tickets — Status Filter
**Steps:**
1. Filter to "OPEN" only.
2. Then filter to "RESOLVED".

**Expected:**
- Correct tickets shown for each filter.
- Count badge or header updates.

---

## TC-05-010: Tickets — Open Ticket Detail
**Steps:**
1. Click on any ticket row.
2. Navigate to `/super-admin/tickets/[id]`.

**Expected:**
- Detail page renders: Title, Description/Body, Category, Priority, Status, Reporter info, Comments thread.
- Properties panel shows: Status dropdown, Priority dropdown, Assignee field.
- Back button returns to ticket list.

---

## TC-05-011: Ticket Detail — Change Status
**Steps:**
1. Open ticket detail.
2. Change status dropdown from OPEN to IN_PROGRESS.

**Expected:**
- PATCH request fired.
- Status chip updates immediately.
- Success snackbar.

---

## TC-05-012: Ticket Detail — Change Priority
**Steps:**
1. Open ticket detail.
2. Change priority from HIGH to MEDIUM.

**Expected:**
- PATCH `/api/v1/tickets/:id` returns 200.
- Priority updates in properties panel.

---

## TC-05-013: Ticket Detail — Assign Ticket
**Steps:**
1. Open ticket detail.
2. Enter a valid user ID or email in the Assignee field.
3. Blur the field (click away or press Tab).

**Expected:**
- PATCH request fires with new assigneeId.
- Assignee name shown in properties panel.

---

## TC-05-014: Ticket Detail — Add Comment
**Steps:**
1. Open ticket detail.
2. Type "This is a QA test comment" in the comment input.
3. Click "Send" or press Enter.

**Expected:**
- POST `/api/v1/tickets/:id/comments` returns 200/201.
- Comment appears in the thread with timestamp and author name.
- Input field clears.

---

## TC-05-015: Ticket Detail — Empty Comment
**Steps:**
1. Click "Send" with empty comment input.

**Expected:**
- No API request fired.
- Validation feedback shown.

---

## TC-05-016: Tickets — Create New Ticket (if available from super admin)
**Steps:**
1. If "New Ticket" button exists, create a ticket with Title, Body, Priority = URGENT, Category = BILLING.

**Expected:**
- POST returns 201.
- Ticket appears in list with correct category and priority.

---

## AUDIT LOG

## TC-05-017: Audit Log Renders
**Steps:**
1. Navigate to `/super-admin/audit-log`.

**Expected:**
- Table of audit events: Action, Actor (user name), Organization, Resource (project/ticket/etc.), Timestamp.
- At least seed-generated entries visible.

---

## TC-05-018: Audit Log — Filter by Actor
**Steps:**
1. Filter by actor name or email.

**Expected:**
- Only events by that actor shown.

---

## TC-05-019: Audit Log — Filter by Date Range
**Steps:**
1. Set start date and end date.
2. Apply filter.

**Expected:**
- Only events within the date range shown.
- Events outside range not visible.

---

## TC-05-020: Audit Log — Event Detail
**Steps:**
1. Click on an audit log entry (if expandable/detail view exists).

**Expected:**
- Full event detail shown: before/after state if applicable, IP address, user agent, timestamp.

---

## ORG ADMINS

## TC-05-021: Org Admins List Renders
**Steps:**
1. Navigate to `/super-admin/org-admins`.

**Expected:**
- Table of users with ORG_ADMIN role across all orgs.
- Columns: Name, Email, Organization, Status, Created At.
- At least `orgadmin@constructiq.com` visible.

---

## TC-05-022: Org Admins — Invite/Create
**Steps:**
1. Click "Invite Org Admin" or "Add Admin".
2. Fill email, organization, name.
3. Submit.

**Expected:**
- POST to users or invites API returns 201.
- New admin appears in list.
- Invitation email sent (or snackbar confirms).

---

## TC-05-023: Org Admins — Remove/Deactivate Admin
**Steps:**
1. Find a non-critical org admin.
2. Click "Remove" or "Deactivate".
3. Confirm.

**Expected:**
- User's role changed or user deactivated.
- No longer appears in org admins list (or shows as inactive).
- That user cannot log in with admin privileges.

---

## TC-05-024: Org Admins — View Admin's Org
**Steps:**
1. Click on an org admin's organization name/link.

**Expected:**
- Navigates to org detail or org list with that org highlighted.
