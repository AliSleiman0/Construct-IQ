# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ConstructIQ is a multi-tenant construction management platform. Phase 1 (auth, users, organizations, RBAC) is complete plus assorted Phase 7 (AI) features. Mongoose schemas for every later phase already exist; controllers/services land per phase.

## Architecture

**Monorepo with two apps:**
- `backend/` — NestJS REST API on port 4000 (deep details: `backend/CLAUDE.md`)
- `frontend/` — Next.js 14 (App Router) on port 3000 (deep details: `frontend/CLAUDE.md`)

**Infrastructure (Docker):** MongoDB 7 (single-node replica set `rs0`, required for transactions), Redis 7, mongo-express on port 5050.

### Request Flow

```
Browser → Next.js Middleware (auth cookie check)
       → React Component (TanStack Query)
       → Axios client at frontend/src/lib/api/client.ts
            · injects X-Organization-Id from useCompanyStore
            · handles 401 → silent refresh → retry (NO_REFRESH_ON_401 list excludes auth endpoints)
       → Next.js rewrite proxy (/api/v1/* → http://localhost:4000/api/v1/*)
       → NestJS global guards: JwtAuthGuard → IpAllowlistGuard → PermissionsGuard
       → Controller → Service → Mongoose Model → MongoDB
       → ResponseInterceptor wraps all responses: { success, data, timestamp }
            · axios response interceptor unwraps `.data.data` to `.data`
```

### Auth Flow

- Login returns JWT access token + refresh token as httpOnly cookies.
- Access-token TTL is **per-org**: `OrgSettings.sessionTimeoutMin` overrides the env default at sign time. Refresh-token TTL stays env-driven.
- `JwtAuthGuard` is the global APP_GUARD; bypass via `@Public()` decorator.
- 401 on any non-auth endpoint triggers a silent refresh in the axios interceptor (singleton in-flight promise). Refresh failure clears the `logged_in` cookie and hard-redirects to `/login`.
- Super Admin: `isSuperAdmin: true` in JWT payload, no `organizationId`. Can manage all orgs via `/company-select`. Bypasses `IpAllowlistGuard`.
- Regular users scoped to one org; `X-Organization-Id` header is mirrored from a non-httpOnly cookie + localStorage by `useCompanyStore`.
- Account lockout enforced in `AuthService.login()` per org's `lockoutMaxAttempts` / `lockoutDurationMin`.

### Multi-Tenancy

All service queries must filter by `organizationId`. The `OrgContextInterceptor` injects org context from the `X-Organization-Id` header. **Never return cross-org data.** Super Admins are the only callers that may see global lists; those services accept an explicit `isSuperAdmin` flag and return cross-org rows only when it's true.

## Conventions used across both apps

- **Permissions**: backend permission keys live in `backend/src/common/constants/permissions.ts`; frontend mirrors live in `frontend/src/constants/`. Always reference constants, never raw strings.
- **DTOs use class-validator + class-transformer**; the global `ValidationPipe` is `{ whitelist: true, forbidNonWhitelisted: true, transform: true, enableImplicitConversion: true }` — so unknown fields are stripped, nested DTOs are class-validated, and string→number transforms happen for free.
- **Auth-gated TanStack Query**: any `useQuery` that mounts inside a Provider (above `(auth)`) must pass `enabled: isAuthenticated` to avoid a 401 → refresh-fail → `/login` redirect loop. See `useOrgSettings` and `useMe` for the pattern.
- **Audit logging**: significant state changes are written to the `audit_logs` collection via `AuditService.log()` (org-settings diffs, plus approvals/results/deletes across procurement, surveyor, projects, tasks, issues, etc.). New mutations of record should follow the pattern (fire-and-forget; failure must not surface to the user).
- **Domain events → notifications**: those same state changes also emit in-app notifications via `NotificationsService.notifyMany()` (fire-and-forget). The frontend bell reads `/notifications`. See `backend/CLAUDE.md` → "Domain events" for the recipient + helper conventions.
- **Soft-delete & cascades**: every entity soft-deletes (`deletedAt`); deleting a project/org cascades via `cascadeSoftDelete`, and deleting a financial parent with live dependents is blocked (409). See `backend/CLAUDE.md` → "Soft-delete, cascades & referential integrity".

## Commands

### Infrastructure
```bash
docker-compose up -d          # MongoDB (replica set rs0), Redis, mongo-express
```

### Backend (`cd backend`)
```bash
npm run start:dev             # Dev server, watch mode (port 4000)
npm run build                 # Compile TS to dist/
npm run start:prod            # Run compiled build
npm run test                  # Unit tests
npm run test:e2e              # End-to-end tests
npm run lint                  # ESLint --fix
npm run format                # Prettier
npm run seed                  # Seed super admin + demo users + roles + permissions
```

### Frontend (`cd frontend`)
```bash
npm run dev                   # Dev server (port 3000)
npm run build                 # Production build
npm run lint                  # ESLint
npm run type-check            # tsc --noEmit
```

## Environment Setup

**Backend** — copy `backend/.env.example` to `backend/.env`:
- `MONGO_URL` — replica set required (`mongodb://localhost:27017/constructiq?replicaSet=rs0&directConnection=true` for local).
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — both required.
- `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` — defaults `15m` / `7d`. Access TTL is overridden per-org by `OrgSettings.sessionTimeoutMin`.
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`.
- `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` — seeded on first run.
- `OPENAI_API_KEY` — required for AI module; optional if AI endpoints not used.
- `AI_MODEL` — defaults to `gpt-4o-mini`.

**Frontend** — copy `frontend/.env.local.example` to `frontend/.env.local`:
- `NEXT_PUBLIC_API_URL=http://localhost:4000`

## Development Phases

| Phase | Status | Scope |
|-------|--------|-------|
| 1 | ✅ Done | Auth, Users, Organizations, RBAC, per-user profile (localization + notifications), org-settings security stack (password policy, account lockout, session timeout, IP allowlist, audit log) |
| 2 | ⏳ | Projects, Phases, Milestones |
| 3 | ⏳ | Tasks, Dependencies, Progress |
| 4 | ⏳ | Daily Reports, Issues, Blockers |
| 5 | ⏳ | Budget, Procurement, Purchase Orders |
| 6 | ⏳ | Documents, Dashboard, File Storage (S3) |
| 7 | 🟡 | AI Layer — orchestrator + navigation + report-summary agents + chat session persistence shipped |
| 8 | 🟡 | Hardening, Deployment — **Pre-pilot hardening** milestone complete: business-logic audit remediation (#28–#36) landed cross-cutting integrity (tenant scoping, money invariants, status guards), segregation of duties + audit logging on approvals, soft-delete cascades + referential-integrity guards, domain-event notifications, an overdue-task / dashboard-snapshot scheduler, and the bid-award→PO seam. Real SSO, multi-device sessions, 2FA enrollment still deferred. |

All Mongoose schemas for future phases are already defined under `backend/src/modules/*/schemas/`.

## See also
- `backend/CLAUDE.md` — module layout, security stack details, AI module
- `frontend/CLAUDE.md` — route groups, provider order, reactive theming, query gating, profile + settings page structure
