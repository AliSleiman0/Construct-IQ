# ConstructIQ — Product Backlog

Maintained alongside the `product-owner` subagent (`.claude/agents/product-owner.md`).
The PO agent **proposes** deltas to this file in its reports; a human accepts/reorders
and a build agent applies them. The PO agent never edits this file directly.

**Status legend:** 🔴 not started · 🟡 in progress · ✅ done · ⏸️ parked · ❌ won't do
**Effort:** S (≤1 day) · M (a few days) · L (≥1 week)

---

## Now (next up)

_Site Engineer gap review — 2026-05-24 (after the section was made real, PR #11). Sized S/M/L, priced P0–P2._

| # | Item | Value | Effort | Notes / decision |
|---|------|-------|--------|------------------|
| SE-1 | ✅ **Member-scope `documents` + `progress-photos`** | P0 | S | Same leak class as Cycle 1 (org-scoped, not member-scoped). **DONE** — `documents.service.findAll` + `units.service.findPhotos` now take a viewer; resource=`'documents'` keeps PM org-wide. |
| SE-2 | **Issues "assigned to me / raised by me" filter** | P1 | S | Server already supports `assignedToId` (incl. `'NONE'`); pure FE toggle in `IssueListView`. |
| SE-3 | **Failed inspection → "Raise issue" + `inspectionId` link** | P1 | M | Closes the QA loop. **Decide artifact: Issue+`inspectionId` (thin, rec) vs formal NCR** — SME-VALIDATE. |
| SE-4 | **Inspection detail/edit page** | P2 | M | PATCH already supports reschedule/inspector/notes; FE only flips status today. |
| SE-5 | **Daily-report photos** via existing progress-photos API | P2 | M | Depends on SE-1. |
| SE-6 | **Site-eng Documents/Drawings read page** | P2 | M | Depends on SE-1; SITE_ENG already holds `read/upload:documents`. |
| SE-7 | **Deliveries receipt confirmation** (site-eng) | P2 | M | Needs `DELIVERIES.READ` grant + process decision (who confirms goods-received). SME. |
| SE-8 | **RFI module** | P2 | L | Core site-eng artifact, no schema today. Validate need vs "Issue type" first. SME. |
| SE-9 | **H&S / permits-to-work / incident reporting** | High-domain | L | Legal-sensitive; SME-gated. Defer. |

## Next (soon)

| # | Item | Value | Effort | Notes |
|---|------|-------|--------|-------|
| B1 | ✅ **Site Eng real-API migration** | High | L | **DONE (PR #11):** reports/issues/tasks/dashboard real + member-scoped; inspections greenfield (thin). |
| B2 | **Surveyor cost module** (BOQ → budget lines; Variations → contract sum; Valuations → actuals) | High | L | 4 placeholder pages. Decide integrated-vs-siloed up front. Needs QS SME. |
| B3 | **Budget ↔ Procurement link** (PO → committed cost; "post expense from PO"; Planned→Committed→Actual) | High | M | Kills double-entry; budget "Reference" already points at PO numbers with no link. |
| B4 | Procurement **Material Requests** page | Med | M | Only remaining procurement placeholder. |
| B5 | **PM oversight of Variations** (read + approve) | Med | S–M | Mirror the procurement-PO approve pattern. **Depends on B2** (surveyor variations real first). |
| B6 | **PM dashboard cross-role rollups** (failed/safety inspections, valuations awaiting certification, variations pending approval) | Med | M | Status + deep-link, **not** new tabs. **Inspections half now UNBLOCKED** (inspections real; PM holds `manage:inspections`). |

## Later / ideas

- Budget mutation **audit trail** (createdBy/when) — parity with org-settings auditing.
- Issues ↔ tasks linking (a SAFETY issue spawns/blocks remediation tasks).
- Saved filter views / CSV export on the issues triage console.
- **Member-scope `units.findAllUnits` + `findPayments`** — same leak class as SE-1 (org-scoped, reachable via `read:projects`), but the units/sales domain, not site-eng. Apply the `seesAllProjects` pattern when that domain gets attention.
- **Mobile/offline field app** for site engineers (platform-level initiative, not a section backlog item).

## Decisions log

> Record scope decisions here so they're not re-litigated.

- _2026-05-24_ — Issues triage: server-side paginated console + dense table + bulk + summary chips (shipped). Cross-type issue↔task links deferred.
- _2026-05-24_ — Budget per-expense edit covers attribution; bulk re-assign deferred.
- _2026-05-24_ — **Site Engineer section made real** (PR #11, stacked on PR #10): reports/issues/tasks migrated off mocks, real member-scoped dashboard, inspections greenfield (thin). **Member-scoping** (issues/reports/tasks, then documents/progress-photos in SE-1) restricts field roles to assigned projects; managers with `manage:<resource>` stay org-wide.
- _2026-05-24_ — **Inspections thin v1**: status doubles as outcome (SCHEDULED→PASSED/FAILED/CANCELLED); NO checklist/photos/sign-off. `InspectionType` taxonomy is an **SME-VALIDATE placeholder**, not authoritative. Failed-inspection→issue link deferred to SE-3 (artifact Issue-vs-NCR is an open SME decision).
- _2026-05-24_ — **Photo scoping** (SE-1): progress-photos scoped via resource `'documents'`; Procurement perms intentionally unchanged (no UI consumes photos org-wide). `units` units/payments left for later (different domain).
- _2026-05-24_ — **PM cross-role oversight**: do NOT clone a full read-only tab per role. PM already sees Site-Eng output (reports/issues/tasks) + budget. Surface cross-role status only where the PM acts (Variations → approve view, like POs) or must be aware (failed inspections / valuations / variations → dashboard rollups). Always build the owning section first, then the PM slice (how `/pm/procurement` was done).

## Out of scope (for now)

- Presigned-URL direct uploads; Gantt row virtualization; phase/milestone cross-type deps;
  Phase 8 hardening (SSO, 2FA, multi-device sessions).
