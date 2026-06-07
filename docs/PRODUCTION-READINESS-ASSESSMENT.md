# ConstructIQ — Production Readiness Assessment

> **Date:** 2026-06-07
> **Assessed against:** `main` @ `b16ad0b` (Merge PR #19)
> **Method:** Parallel evidence-based audits of backend maturity/security, frontend completeness, infra/ops/testing, and product shippability. All claims cite `file:line` where applicable.

---

## Bottom line

The **product** is much further along than the `CLAUDE.md` phase table suggests — the operational core (PM, Site Eng, Surveyor, Procurement) is genuinely real and end-to-end. But the **delivery/ops layer is essentially absent**, and there is a **live-secret leak on `main`**.

- ✅ Close to a **white-glove pilot**
- ❌ Far from a **self-serve SaaS launch**

**Rough readiness: ~60% to a pilot, ~30% to a public SaaS launch.**

---

## 🔴 P0 — Act today (confirmed, not theoretical)

**A live OpenAI key is committed to `main` and pushed to the remote.**

- File: `backend/env` (note: **no leading dot**), added in commit `490614d` (part of the procurement merge, now on `origin/main`).
- `.gitignore` only catches `.env` *with* the dot, so `backend/env` slipped through and is now in git history on the shared remote.
- The same file carries placeholder JWT secrets (`..._change_in_production`) and `SUPER_ADMIN_PASSWORD=Admin@1234` as the **actual** values used locally — anyone with those can forge tokens / log in as super admin.

**Actions:**
1. **Rotate the OpenAI key now** — it's in shared history; assume compromised.
2. Rotate JWT secrets + super-admin password to strong unique values.
3. `git rm --cached backend/env`, add to `.gitignore`, purge from history (rotation matters more than purge since it's already pushed).

---

## ✅ What's genuinely real (operational core)

Wired backend→frontend, org-scoped and member-scoped, with proper loading/error states. Actual progress is well ahead of the documented phase table.

| Persona | Status | Notes |
|---|---|---|
| **Project Manager** | ✅ Ready | All 14 pages real-API; budget w/ committed-cost rollup, Gantt, dependencies |
| **Procurement Officer** | ✅ Ready | MR→PO→delivery→supplier full flow — strongest module |
| **Site Engineer** | 🟡 Usable | Reports/issues/tasks/inspections/RFIs/docs real + member-scoped; gap is mobile/field UX |
| **Quantity Surveyor** | 🟡 Usable | BOQ/variations/valuations/orders real but **siloed** (don't flow into budget) |
| **Org Admin** | 🟡 Usable | Users/settings real; **billing is display-only** |
| **Super Admin** | 🟡 Usable | Tenant/plan/audit mgmt real; `settings` page still a stub |

**Real infra/integrations:** S3 uploads (env-gated, 503 if unconfigured), Autodesk APS + homegrown CAD canvas editor, real external client token-portal (`/portal/[token]`), real AI billing/feature gating (`AiFeatureGuard`). Backend compiles clean.

---

## 🟡 What's mock or missing

### Mock-backed surfaces (do not demo as real)
- **Entire logged-in `client` section** — 9 pages on hardcoded fixtures ("Welcome back, Carlos", static "$185k"). Real APIs (`units.api`, `payments.api`, `progressPhotos.api`) exist but aren't wired.
- **Entire `support-agent` console** — on a mock Zustand store; split-brained with the real ticket lists admins see.
- **Ticket detail/comment/create flow** across all roles — half-migrated (lists real, detail/comments/create mock).
- **Header notification bell** — mock data.
- **Profile personal-info tab** — never persists (no `PATCH /users/me`; store-only → silent data loss).

### Missing commercial wrapper (central shippability risk — not in the team's backlog)
- **No way to charge money** — billing is a manual invoice ledger; "download receipt" is a fake snackbar; no Stripe/checkout. Plan entitlements gate **AI endpoints only**, not the core product.
- **No tenant self-signup** — orgs are Super-Admin-provisioned only.
- **No email delivery anywhere** → no password reset ("forgot password" is a `mailto:`), and **new users have no way to receive their credentials.**
- **No data export** (CSV/PDF) — construction buyers expect to export BOQs, PO registers, issue logs.

---

## 🔴 Ops / deploy layer — almost entirely absent

| Area | Status | Evidence |
|---|---|---|
| Deploy artifacts | ❌ Missing | No app Dockerfiles, no CI/CD (`.github/workflows` absent), no host config. `docker-compose.yml` is infra-only (mongo/redis/minio). Frontend not built as `standalone`. |
| Secrets mgmt | ❌ Missing | Placeholder JWT secrets + default admin password are the live values; no vault/secrets manager. |
| Observability | ❌ Missing | No health endpoint, no structured logging (console only), no Sentry, no `enableShutdownHooks()` (no graceful shutdown). |
| Rate limiting | ⚠️ Partial | `ThrottlerModule` configured but **`ThrottlerGuard` never registered** — auth endpoints unthrottled despite lockout logic. |
| Tests | ⚠️ Partial | Unit suite **red: 28 failed / 142 passed (4 suites)** — stale DI after model deps added (`projects`/`procurement`/`budget`/`reports`). 34 QA curl scripts + 39 Playwright specs exist but are **manual, not CI-wired**. |
| Frontend build | ❌ Failing | `type-check` fails — missing `three` dep (CAD editor, `CADEditor.tsx:2752`) + PO-status type bug (`usePurchaseOrders.ts:32`). `next build` won't pass until fixed. |
| DB | ⚠️ Partial | Single-node Mongo (no HA), seeders not migrations (no prod guard), no backup story. Indexes on 20/39 schemas. |
| Backend build | ✅ Pass | `nest build` compiles clean. |

---

## Correctness / security findings

- **Cross-tenant leak:** AI report-summary path (`report-summary.agent.ts:27`) queries daily reports by id with **no `organizationId` filter** — an AI-enabled user can summarize any org's report. Same line has a `?? context.projectId` fallback bug (projectId used as report id).
- **AI module hard-crashes at boot** without `OPENAI_API_KEY` (constructors build `new OpenAI()` eagerly; `AiModule` eagerly imported) — contradicts "optional" in `CLAUDE.md`. Needs lazy-init or conditional module.
- **WIP in HEAD** (`d43dba5`): daily-report↔documents linking; `reports.service.spec.ts` doesn't compile against the new `findAll` signature (contributes to red suite).
- **CORS** omits `X-Organization-Id` from `allowedHeaders` (`main.ts:36`) — works via same-origin dev proxy, breaks under true cross-origin prod hosting.
- **No virus scanning** on uploads; no presigned-GET / no bucket cleanup on soft-delete.
- Multi-tenancy is otherwise disciplined (`(organizationId, isSuperAdmin)` convention). Recommend a dedicated cross-org/permissions audit before launch rather than asserting clean.

---

## How close are we? Two paths

### Path A — White-glove pilot (the wedge) — ~2–4 weeks
The operational tool is real today. For one paying customer you provision yourself:
1. Fix P0 secret (hours) + two FE build errors (hours) + green the unit suite (~1 day).
2. Wire throttler + `/health` endpoint + cross-org report fix + AI lazy-init (~1–2 days).
3. Containerize + minimal CI + deploy target (~3–5 days).
4. **3 non-negotiables even for B2B white-glove:** user-invite/credential email, password reset, S3 configured (~1 week).
5. Hide/delete the mock `client` + `support-agent` sections; ship the real token-portal as the client experience.

### Path B — Self-serve SaaS (pricing-page product) — ~2–3 months on top of Path A
Adds Stripe + checkout + plan-paywall on the core product, public tenant self-signup, full email/notification delivery, data export, and making the client + support sections real.

### Recommendation
Path A now, lead with **PM + Site Engineer** (attach Procurement), white-glove provisioning + offline invoicing for the first cohort. Treat Path B as a fast-follow once there are signed customers — building Stripe/self-signup before that is premature.

---

## Decisions needed (blocking)

1. **Launch model:** (a) white-glove single-tenant + offline invoicing [fastest], (b) self-serve SaaS [weeks of net-new commercial build], or (c) white-glove now + self-serve fast-follow. Recommended: (a)/(c).
2. **Wedge personas:** PM + Site-Eng vs PM + Procurement. Recommended: **PM + Site-Eng**, attach Procurement.
3. **Client deliverable:** ship the real token portal and hide the mock `client` section (recommended), or invest to make it real.
4. **Minimum commercial wrapper:** confirm invite-email, password reset, S3 config are in scope before first paid customer.

---

## Prioritized blocker list (consolidated)

**P0**
- [ ] Live OpenAI key + secrets committed in `backend/env` (in history on `main`) — rotate + remove.
- [ ] Frontend build red (`three` missing + PO-status type bug) — repo not buildable/CI-able until fixed.
- [ ] No deployment artifacts (Dockerfiles, CI/CD, host config).
- [ ] Placeholder JWT secrets + default super-admin password as live values.

**P1**
- [ ] Cross-org daily-report leak via AI summarize (`report-summary.agent.ts:27`).
- [ ] Rate limiting not enforced (register `ThrottlerGuard` globally).
- [ ] AI module crashes boot without `OPENAI_API_KEY` (lazy-init / conditional).
- [ ] Unit suite red (4 suites, stale DI) — blocks any CI gate.
- [ ] No observability floor (health endpoint, structured logs, error tracking, graceful shutdown).
- [ ] No user-invite / credential delivery + no password reset (onboarding dead-end).
- [ ] Client + support-agent sections mock — wire or de-scope.

**P2**
- [ ] No data export (CSV/PDF).
- [ ] Single-node Mongo, no migrations/backups.
- [ ] CORS missing `X-Organization-Id`; validate/reject placeholder secrets in prod.
- [ ] Profile personal-info never persists; notification bell mock; ticket detail/comments mock.
- [ ] QA/E2E harnesses manual, not CI-wired; remove vestigial `docker/pgadmin/` artifacts.

---

*Snapshot as of `main` @ `b16ad0b` (2026-06-07). Re-validate against current `main` before acting — file:line references will drift.*
