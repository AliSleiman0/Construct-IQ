# QA Prompt 09 — Org Admin: Support Tickets

## Scope
`/admin/support` — ticket list, stat cards, create ticket modal; `/admin/support/[id]` — ticket detail (read-only for org admin, editable for super admin).

## Prerequisites
- Logged in as `orgadmin@constructiq.com` / `Demo@1234`.
- Seed data: 3 tickets created for the org (TECHNICAL/HIGH, BILLING/URGENT, FEATURE_REQUEST/LOW).
- Backend: `GET /support-tickets`, `POST /support-tickets`, `GET /support-tickets/:id`, `POST /support-tickets/:id/comments`.

---

## TC-09-001: Support Page Renders
**Steps:**
1. Navigate to `/admin/support`.

**Expected:**
- Page header: "Support".
- 4 stat cards: Total, Open, In Progress, Resolved.
- Ticket table/list showing seeded tickets.
- "New Ticket" button visible.

---

## TC-09-002: Stat Cards — Counts Accuracy
**Steps:**
1. Note counts on each stat card.
2. Query: `db.tickets.find({ organizationId: <orgId> })` and group by status.

**Expected:**
- Total matches all tickets for org.
- Open = tickets with status OPEN.
- In Progress = IN_PROGRESS status count.
- Resolved = RESOLVED + CLOSED count (verify which statuses are grouped).

---

## TC-09-003: Ticket Table — Columns
**Steps:**
1. Observe the ticket table.

**Expected:**
- Columns: Title (or Subject), Category, Priority, Status, Reporter, Created At.
- Priority chips color-coded: URGENT/CRITICAL=red, HIGH=orange, MEDIUM=yellow, LOW=grey.
- Status chips: OPEN=blue, IN_PROGRESS=warning, RESOLVED=green, CLOSED=grey.

---

## TC-09-004: Ticket Table — Seeded Data Visible
**Steps:**
1. Confirm the 3 seeded tickets appear:
   - "Cannot access project dashboard" (TECHNICAL, HIGH, OPEN)
   - "Invoice discrepancy for May 2026" (BILLING, URGENT, OPEN)
   - "Export reports to PDF" (FEATURE_REQUEST, LOW, OPEN)

**Expected:**
- All 3 visible with correct category and priority.

---

## TC-09-005: Ticket Table — Filter by Status
**Steps:**
1. Click "Open" filter tab/button.
2. Confirm only OPEN tickets shown.
3. Click "In Progress".
4. Click "Resolved".
5. Click "All".

**Expected:**
- Each filter shows correct subset.
- "All" restores full list.

---

## TC-09-006: Ticket Table — Filter by Category
**Steps:**
1. Select "BILLING" from category dropdown filter (if available).

**Expected:**
- Only billing category tickets shown.

---

## TC-09-007: Ticket Table — Search by Title
**Steps:**
1. Type "invoice" in the search box.

**Expected:**
- Only tickets with "invoice" in the title shown.
- Case-insensitive match.

---

## TC-09-008: Ticket Table — Sort by Priority
**Steps:**
1. Click "Priority" column header.

**Expected:**
- Tickets sorted by priority severity (URGENT first, then HIGH, MEDIUM, LOW — or vice versa).

---

## TC-09-009: Ticket Table — Sort by Date
**Steps:**
1. Click "Created At" column header.

**Expected:**
- Tickets sorted newest first, then toggle to oldest first.

---

## TC-09-010: Create New Ticket — Modal Opens
**Steps:**
1. Click "New Ticket" button.

**Expected:**
- Modal/dialog opens with form fields: Subject/Title, Description, Category (dropdown), Priority (dropdown).
- Submit and Cancel buttons visible.

---

## TC-09-011: Create Ticket — Happy Path
**Steps:**
1. Fill in: Title = "QA Test Ticket", Description = "This is a QA test.", Category = GENERAL, Priority = MEDIUM.
2. Click "Submit".

**Expected:**
- POST `/api/v1/support-tickets` (or `/api/v1/tickets`) returns 201.
- Modal closes.
- Success snackbar: "Ticket submitted" or similar.
- New ticket appears in the list.
- Stat card "Total" increments by 1.

---

## TC-09-012: Create Ticket — Missing Title
**Steps:**
1. Open modal, leave Title empty.
2. Click "Submit".

**Expected:**
- Validation error: "Title is required".
- No API call.

---

## TC-09-013: Create Ticket — Missing Description
**Steps:**
1. Leave Description empty.
2. Submit.

**Expected:**
- Validation error shown (if description required) OR ticket created without description.
- Document expected behavior.

---

## TC-09-014: Create Ticket — Category Dropdown Options
**Steps:**
1. Open the Category dropdown.

**Expected:**
- Options: General, Billing, Technical, Feature Request (matching `TicketCategory` enum).

---

## TC-09-015: Create Ticket — Priority Dropdown Options
**Steps:**
1. Open the Priority dropdown.

**Expected:**
- Options: Low, Medium, High, Urgent (matching `TicketPriority` enum).

---

## TC-09-016: Create Ticket — Cancel
**Steps:**
1. Open modal, fill in some fields.
2. Click "Cancel".

**Expected:**
- Modal closes.
- No ticket created.
- List unchanged.

---

## TC-09-017: Ticket Detail — Navigate
**Steps:**
1. Click on any ticket row.

**Expected:**
- Navigate to `/admin/support/[id]`.
- URL contains the ticket's ID.

---

## TC-09-018: Ticket Detail — Read-Only Mode
**Steps:**
1. Open a ticket detail as org admin.

**Expected:**
- Ticket title, description/body, category, priority, status visible.
- Fields are READ-ONLY (no edit dropdowns — mode="read", viewerKind="customer").
- No status change dropdown accessible to org admin.
- No assignee field editable.

---

## TC-09-019: Ticket Detail — View Comments
**Steps:**
1. Open a ticket that has comments (or add one as super admin first).

**Expected:**
- Comments thread visible with: author name, comment text, timestamp.
- Most recent comment last (or first — verify order).

---

## TC-09-020: Ticket Detail — Add Comment (Customer)
**Steps:**
1. On ticket detail, type "Any update on this?" in the comment input.
2. Click "Send".

**Expected:**
- POST to `/api/v1/support-tickets/:id/comments` (or `/api/v1/tickets/:id/comments`) returns 200/201.
- Comment appears in thread with org admin's name and current timestamp.
- Input clears.

---

## TC-09-021: Ticket Detail — Empty Comment
**Steps:**
1. Click "Send" with empty comment input.

**Expected:**
- No API request.
- Input focused or validation message shown.

---

## TC-09-022: Ticket Detail — Back Navigation
**Steps:**
1. On ticket detail, click "Back" button or breadcrumb.

**Expected:**
- Navigates back to `/admin/support`.
- Ticket list still shows correct data (no re-fetch required unless stale).

---

## TC-09-023: Ticket Detail — Properties Panel
**Steps:**
1. Observe the right-side properties panel on ticket detail.

**Expected:**
- Shows: Status, Priority, Category, Reporter name, Created At, Updated At.
- Read-only for org admin (no edit controls).

---

## TC-09-024: Ticket Scoping — Org Isolation
**Steps:**
1. Note tickets for orgA admin.
2. Log in as orgB admin, navigate to `/admin/support`.

**Expected:**
- orgB's tickets shown, not orgA's.
- `GET /api/v1/support-tickets` scoped by `X-Organization-Id` header.

---

## TC-09-025: Pagination
**Steps:**
1. If org has > 10 tickets (create extras if needed), observe pagination.

**Expected:**
- Pagination controls shown.
- Page 2 loads next set of tickets.
- No duplicate tickets across pages.

---

## TC-09-026: Ticket List — API Request Verification
**Steps:**
1. DevTools → Network → observe GET request when loading `/admin/support`.

**Expected:**
- `GET /api/v1/support-tickets` (or `/api/v1/tickets`) fires.
- `X-Organization-Id` header present.
- Response 200 with array of tickets.
