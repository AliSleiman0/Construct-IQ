# ConstructIQ — Go-Live & Business-Logic Assessment

> **Date:** 2026-06-25
> **Assessed against:** `main` @ `33c9853` (post Bid-Analyzer + deploy-stack merge)
> **Author:** PO assessment (evidence-based; file:line cited where verified)
> **Companion doc:** `docs/PRODUCTION-READINESS-ASSESSMENT.md` (older snapshot @ `b16ad0b`, 2026-06-07)

This document has two parts:
1. **Go-Live / License-Readiness** — can we sell and operate this? (ops, security, commercial wrapper)
2. **Business-Logic / Feature Completeness** — do the modules connect into real construction workflows?

---

# Part 1 — Go-Live Verdict (selling licenses)

**Not ready to *sell licenses* self-serve — ~2–3 focused weeks from a white-glove paid pilot.**

The product underneath is strong, but there is **no mechanism to take money or onboard a customer**: no Stripe/payment processor, no self-signup, and **no email delivery at all** (verified — no `nodemailer`/`sendgrid`/`resend`/etc. in `backend/package.json`). You cannot sell, bill, or even deliver credentials to a license buyer today.

## Fixed since the 2026-06-07 snapshot (verified in current tree)

| Previously a blocker | Now |
|---|---|
| No deploy artifacts | ✅ Dockerfiles (BE+FE), `docker-compose.prod.yml`, nginx, deploy guide |
| No `/health` endpoint | ✅ `health` module present |
| No graceful shutdown | ✅ `enableShutdownHooks()` — `backend/src/main.ts:69` |
| FE build red (`three` missing) | ✅ `three@^0.184.0` in `frontend/package.json` |
| Profile never persisted | ✅ `PATCH /users/me` — `users.controller.ts:68` |
| New Bids feature | ✅ Org-scoped (14 `organizationId` refs in `bids.service.ts`) |

## Go-Live Checklist (verified against current `main`)

### 🔴 GATE 1 — Security / legal blockers (before anyone outside touches it)
- [ ] **Rotate all leaked secrets.** `backend/env` is **still git-tracked and in history** (commit `490614d` on `main`) — OpenAI key, JWT secrets, `SUPER_ADMIN_PASSWORD=Admin@1234` are compromised. Rotate keys, `git rm --cached backend/env`, treat history as exposed. (`.gitignore` now lists it, but that does not untrack the already-committed file.)
- [ ] **Cross-tenant data leak — still open.** `ai/agents/report-summary.agent.ts:27` does `findOne({ _id: reportId })` with **no `organizationId` filter** → any AI-enabled user can summarize any org's report.
- [ ] **Enforce rate limiting.** `ThrottlerGuard` is configured but **never registered** (verified absent in `backend/src`). Login/lockout endpoints are unthrottled.
- [ ] Reject placeholder JWT secrets / default admin password in prod config (fail-fast on boot).

### 🔴 GATE 2 — Can you onboard a paying customer? (the actual "sell licenses" gate)
- [ ] **Email delivery** — none exists. No credential delivery, no password reset, no invites.
- [ ] **Password reset flow** — verified absent (no `forgot`/`reset-password` routes).
- [ ] **Decide the commercial model** (blocking PO decision):
  - **Path A — white-glove + offline invoicing:** you provision the tenant, invoice manually. ~2–3 weeks. **Recommended for first customers.**
  - **Path B — self-serve license sales:** Stripe + checkout + plan paywall on the *core* product (today entitlements gate **AI endpoints only**) + public self-signup. ~2–3 months net-new. Do not build before signed customers.

### 🟡 GATE 3 — Operability floor (before production traffic)
- [ ] **AI module boot-crash** — OpenAI client built eagerly in constructors; backend **crash-loops without a valid key** (confirmed in deploy doc "known constraints"). Make it lazy/conditional.
- [ ] **No CI/CD** — `.github/workflows` absent. No automated build/test gate.
- [ ] **No structured logging / error tracking** — no Sentry/pino/winston (verified).
- [ ] **Verify the test suite is green.** 2026-06-07 reported 28 failing unit tests; **not run this session** — run + wire into CI.
- [ ] **Mongo backups** — single-node, no HA; backup is manual `mongodump`. Schedule it.

### 🟡 GATE 4 — Don't demo the fakes
- [ ] Hide/de-scope the **mock `client` portal** (9 hardcoded pages) and **`support-agent` console** (mock store) — ship the real token-portal as the client experience.
- [ ] Confirm ticket detail/comments and the notification bell are real before they're customer-visible.

### ⚪ GATE 5 — Buyer expectations (fast-follow, not launch-blocking)
- [ ] Data export (CSV/PDF for BOQs, PO registers, issue logs).
- [ ] TLS/HTTPS (deploy guide ships HTTP-only; cert steps documented, not done).
- [ ] CORS `X-Organization-Id` header for true cross-origin hosting.

## PO recommendation
1. **Clear GATE 1 this week** — security/liability, not features (~1–2 days).
2. **Commit to Path A** (white-glove + offline invoicing) for the first cohort. Lead with **PM + Site Engineer**, attach Procurement (verified end-to-end real).
3. **GATE 2 email + password-reset is the true "can we sell" unlock** (~1 week).
4. Treat Stripe/self-signup (Path B) as a **fast-follow once you have signed customers**.

**One-liner:** *Strong operational product, sellable as a hand-held pilot in ~2–3 weeks after security + onboarding fixes; not a self-serve licensable SaaS for ~2–3 months.*

---

# Part 2 — Business-Logic / Feature Completeness

**Core finding:** the data models exist, but the **money- and workflow-connecting logic between modules does not.** The platform largely behaves as independent CRUD modules with a read-only dashboard on top. One seam is genuinely wired (Procurement → Budget); almost everything else is siloed.

## Integration-seam scorecard

| Seam | Status | Evidence |
|---|---|---|
| Procurement (POs) → Budget committed cost | ✅ **WIRED** | `budget.service.ts` aggregates SUBMITTED/APPROVED POs by `budgetLineId` |
| Bids → Award → PO/Contract | ❌ **SILOED** | `bids.service.ts` has only upload/list/findOne/remove; no award logic |
| Surveyor (BOQ/variations/valuations) → Budget | 🟡 **PARTIAL** | Variations show on dashboard only; budget never reads valuations |
| Variations / change orders → Contract value | ❌ **SILOED** | No `contractValue` on project; approving a variation updates nothing |
| Valuations → Client invoice (progress billing) | ❌ **MISSING** | No path from certified work to an owner invoice |
| Tasks/reports → Project % complete | ❌ **SILOED** | No progress rollup; no `percentComplete` on project |

## 🔴 Critical business-logic gaps (commercial impact)

### 1. Can't bill the client for work done (no progress billing) — biggest gap
A contractor's cash flow is *certify work → invoice owner → collect (less retention)*. In code:
- QS creates valuations/certifications (`surveyor.service.ts`) but they **never become an invoice**.
- `billing` = **SaaS subscription** invoices (`invoice.schema.ts` → `planId`).
- `units`/`payments` = **real-estate sales installments** to unit buyers — different domain.

→ No "bill the project owner $X for certified work-to-date" capability. For the construction buyer, this is *the* core revenue feature and it's absent. **Credible deal-breaker.**

### 2. Bid Analyzer is a dead-end (no award → contract/PO)
Newly merged, but `bids.service.ts` only does upload/list/findOne/remove. **No "award bid"**, nothing creates a PO/contract/commitment from the winner. Capture-and-compare, then the workflow stops. ROI unrealized until selecting a winner drives procurement downstream.

### 3. Variations / change orders don't move the money
Variations carry `impactAmount`, but approval updates **nothing** — not contract value, not budget. Project has no `contractValue` field (`project.schema.ts` has only `totalBudget`). In construction, change orders are where margin is made/lost; here they're display-only.

### 4. No project progress rollup
Tasks have `progress`/`completedAt`; daily reports have `workCompleted` text — but nothing aggregates into a project **% complete**. No single source of "how far along is this job." Blocks owner reporting *and* progress-based billing (#1).

## 🟡 Secondary — entirely absent domain capabilities
*(lower confidence — some inferred from schema absence, not fully traced)*
- **No Contracts module** — bids never become a contract; no draft→signed→executed lifecycle (a `CONTRACT` document *type* exists, but no contract entity).
- **Subcontractor mgmt is generic supplier** — no license, insurance/bond expiry, retainage.
- **No retention/retainage release workflow.**
- **No punch list / defect closeout** (separate from Issues).
- **No labor/timesheet capture** — tasks have hours fields but no entry collection; manpower is free-text in daily reports.

## Bright spot
**Procurement → Budget is genuinely wired** (approved/submitted POs with `budgetLineId` roll into committed cost). Proves the team *can* build these seams — they just haven't for the others yet.

## PO takeaway
The product is a strong operational record-keeping system, **not yet a closed-loop financial workflow.** Highest-priority missing feature — and it ties straight to "can we sell licenses" — is **client progress billing (valuation → invoice → collection)**. After that: **close the bid→award→PO loop** and **make change orders adjust contract value**.

---

# Open questions to dig into next
- [ ] Trace the **valuation → invoice** path: what exactly would "progress billing" take to build?
- [ ] Confirm which **personas/modules are real vs mock** against current `main` (client portal, support-agent, ticket detail, notification bell).
- [ ] Run the **backend unit suite** and capture current pass/fail.
- [ ] Decide the **commercial model** (Path A vs B) — gates most of Part 1.
- [ ] Scope the **Contracts module** (the missing hub linking bids → POs → valuations → invoices).

---

*Snapshot as of `main` @ `33c9853` (2026-06-25). Re-validate file:line references before acting — they drift.*
