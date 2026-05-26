# PM Module QA — Results

Full QA of the `feat/pm-kanban-and-timeline` work: Kanban tasks board (`/pm/tasks`),
project timeline (`/pm/schedule`), and the real-API Projects list/detail
(`/pm/projects` + the shared `ProjectsTable`/`ProjectDetail` that also feed
`/admin/projects` and `/admin/reports`).

## How to run

Prereqs: `docker-compose up -d`; backend on `:4000`; for e2e, frontend on `:3001`
(`cd frontend && PORT=3001 npm run dev`); `cd backend && npm run seed` once; `jq` installed.

```bash
# Layer 1 — API (curl/bash)
bash qa/scripts/12-pm-tasks.sh
bash qa/scripts/13-pm-phases-milestones.sh
bash qa/scripts/14-pm-projects-detail.sh
bash qa/scripts/run-all.sh            # full suite incl. the 3 new PM scripts

# Layer 2 — Browser E2E (Playwright)
cd e2e && npx playwright test 11-pm-tasks-board 12-pm-timeline 13-pm-projects

# Layer 3 — Backend Jest
cd backend && npm run test            # or: npx jest tasks.service phases.service milestones.service
```

## Results (latest run)

| Layer | Suite | Pass | Fail | Skip |
|-------|-------|------|------|------|
| API (curl) | `12-pm-tasks.sh` | 24 | 0 | 1 |
| API (curl) | `13-pm-phases-milestones.sh` | 23 | 0 | 1 |
| API (curl) | `14-pm-projects-detail.sh` | 19 | 0 | 0 |
| E2E (Playwright) | `11-pm-tasks-board.spec.ts` | 6 | 0 | 0 |
| E2E (Playwright) | `12-pm-timeline.spec.ts` | 4 | 0 | 0 |
| E2E (Playwright) | `13-pm-projects.spec.ts` | 4 | 0 | 0 |
| Backend (Jest) | `tasks/phases/milestones.service.spec.ts` | 22 | 0 | 0 |
| **Total** | | **102** | **0** | **2** |

The 2 skips are the cross-org isolation checks (TC-12-050.., TC-13-050..): they require
the `pm@companyb.com` user, which is created by `npm run seed`. They run automatically
once a Company B PM exists; the current dev DB predates that seed.

## What's covered

- **Tasks**: CRUD, all status transitions (the board-drag path), `projectId`/`status`/`assignedToId`
  filters, validation 400s, cross-org isolation (403/404), CLIENT permission gating (403).
  UI: 4 columns, project selector, create/edit/delete, real drag-and-drop, disabled-state.
- **Phases & milestones**: CRUD, validation (incl. the PhaseStatus-enum regression guard from
  the earlier `IN_PROGRESS` 400 bug, `percentComplete` bounds), cross-org isolation. UI: empty
  state, add phase/milestone, help guide.
- **Projects**: list-row shape (`_count`, status, budget, dates), detail hydration (members,
  `_count`, phases), task-count accuracy, edit. UI: real-data table (no Manager/Progress/Burn
  columns), detail tabs with live counts, edit. **Admin regression**: `/admin/projects` +
  `/admin/projects/[id]` load real data (confirms the prior "Project not found" bug is fixed).

## Findings (non-blocking, observed during QA)

1. **FE/BE title max-length mismatch** — frontend zod caps task title at 256; backend
   `CreateTaskDto` uses `@MaxLength(300)`. Harmless, but the limits differ.
2. **Phase/milestone PATCH is not a partial update** — the controllers type the PATCH body as
   `CreatePhaseDto`/`CreateMilestoneDto`, so `name` is required on update (unlike projects, which
   use `PartialType(UpdateProjectDto)`). The frontend always sends the full object, so the UI is
   unaffected; consider `PartialType` for API consistency.
3. **Org-admin project visibility is member-scoped** — `findAll` filters non-super-admins by
   `{ organizationId, 'members.userId' }`, so an org admin sees only projects they are a member
   of. Intended per current code; noted because it surprised the admin-list test (handled by
   adding the admin as a member in the fixture).

## Notes for CI / future
- Playwright `baseURL` is `:3001`; run the frontend on that port for e2e.
- Backend Jest tests are unit-level with mocked Mongoose models (no DB). A future HTTP-level
  e2e (`supertest` + test DB) is deferred.
