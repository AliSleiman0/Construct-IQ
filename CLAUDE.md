# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ConstructIQ is a multi-tenant construction management platform. Phase 1 (auth, users, organizations, RBAC) is complete. Phases 2–8 (projects, tasks, reports, budget, documents, AI, deployment) are pending but the full Prisma schema is already defined for all phases.

## Architecture

**Monorepo with two apps:**
- `backend/` — NestJS REST API on port 4000
- `frontend/` — Next.js 14 (App Router) on port 3000

**Infrastructure (Docker):** PostgreSQL 16, Redis 7, PgAdmin (port 5050)

### Request Flow

```
Browser → Next.js Middleware (auth check)
       → React Component (TanStack Query)
       → Axios Client (injects X-Organization-Id, handles 401 token refresh)
       → Next.js Rewrite Proxy (/api/v1/* → localhost:4000/api/v1/*)
       → NestJS Controller → Service → Prisma → PostgreSQL
       → ResponseInterceptor wraps all responses: { success, data, timestamp }
```

### Auth Flow

- Login returns JWT access token (15m) + refresh token (7d) stored as httpOnly cookies
- `JwtAuthGuard` protects all routes except those marked `@Public()`
- 401 responses trigger silent token refresh via axios interceptor; if refresh fails → redirect `/login`
- Super Admin: `isSuperAdmin: true` in JWT payload; no `organizationId` — can manage all orgs via `/company-select`
- Regular users scoped to one org; `X-Organization-Id` header injected by axios from localStorage

### Multi-Tenancy

All service queries must filter by `organizationId`. The `OrgContextInterceptor` injects org context from `X-Organization-Id` header. Never return cross-org data.

## Backend

**Module structure:** `src/modules/{feature}/{feature}.controller.ts`, `.service.ts`, `.module.ts`, `dto/`

**Key locations:**
- Guards & decorators: `src/common/guards/`, `src/common/decorators/`
- Permissions constants: `src/common/constants/permissions.ts` — always use these, never raw strings
- Response/exception formatting: `src/common/interceptors/`, `src/common/filters/`
- Config & env validation: `src/config/`
- Prisma schema: `prisma/schema.prisma`

**Rate limiting:** 100 req/min default, 10 req/min on auth endpoints.

**Swagger:** Auto-generated at `http://localhost:4000/api/docs` (non-production only). DTOs are auto-documented via `@nestjs/swagger` plugin.

### AI Module (`src/modules/ai/`)

**Endpoints:**
- `POST /ai/chat` — main entry point. Body: `{ message, projectId?, sessionId? }`. Returns `{ reply, action?, sessionId }`.
- `POST /ai/summarize-report/:reportId` — direct report summarization.

**Pattern:** `OrchestratorService` classifies user intent via OpenAI and dispatches to a specialized agent. Each agent is an `@Injectable()` service under `agents/`.

**Current agents:**
- `NavigationAgent` — maps natural language to app routes using OpenAI tool-calling. Returns `{ action: { type: 'navigate', route } }`.
- `ReportSummaryAgent` — fetches a `DailyReport`, summarizes via OpenAI, persists to `DailyReport.aiSummary`.

**Persistence:** `ChatSessionService` persists conversations to `ChatSession` + `ChatMessage` tables, scoped per user + organization. The orchestrator loads prior messages and passes them as OpenAI context so follow-up intents work ("and now go to users").

**Provider:** OpenAI `gpt-4o-mini` (configurable via `AI_MODEL` env var). SDK: `openai` npm package.

**Extending:** add new agent in `src/modules/ai/agents/`, register in `ai.module.ts`, add routing case in `orchestrator.service.ts` switch statement.

## Frontend

**Route groups:**
- `src/app/(auth)/` — public routes (e.g., `/login`)
- `src/app/(dashboard)/` — protected routes (e.g., `/dashboard`, `/users`)
- `src/app/company-select/` — Super Admin org picker

**Key locations:**
- API client + interceptors: `src/lib/api/client.ts`
- Zustand stores: `src/store/auth.store.ts`, `src/store/company.store.ts`
- Feature modules: `src/features/{auth,companies,users,ai}/`
- AI chat widget: `src/features/ai/` — FAB mounted in `AppLayout`, Zustand store for messages/sessionId, `useAiChat` mutation auto-navigates on `action.type === 'navigate'`
- Route & permission constants: `src/constants/`

**Styling:** MUI v5 + Tailwind CSS used together. Forms use React Hook Form + Zod for type-safe validation.

## Commands

### Infrastructure
```bash
docker-compose up -d          # Start PostgreSQL, Redis, PgAdmin
```

### Backend (`cd backend`)
```bash
npm run start:dev             # Dev server with watch (port 4000)
npm run build                 # Compile TypeScript to dist/
npm run start:prod            # Run compiled production build
npm run test                  # Unit tests
npm run test:watch            # Unit tests in watch mode
npm run test:cov              # Coverage report
npm run test:e2e              # End-to-end tests
npm run lint                  # ESLint with auto-fix
npm run format                # Prettier format

npx prisma generate           # Regenerate Prisma client after schema changes
npx prisma migrate dev        # Apply migrations in development
npm run prisma:seed           # Seed database (super admin + sample data)
npm run prisma:studio         # Open Prisma Studio GUI
```

### Frontend (`cd frontend`)
```bash
npm run dev                   # Dev server (port 3000)
npm run build                 # Production build
npm run lint                  # ESLint check
npm run type-check            # TypeScript type check only
```

## Environment Setup

**Backend** — copy `backend/.env.example` to `backend/.env`:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — must be set
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` — seeded on first run
- `OPENAI_API_KEY` — required for AI module; optional if AI endpoints not used
- `AI_MODEL` — defaults to `gpt-4o-mini`

**Frontend** — copy `frontend/.env.local.example` to `frontend/.env.local`:
- `NEXT_PUBLIC_API_URL=http://localhost:4000`

## Development Phases

| Phase | Status | Scope |
|-------|--------|-------|
| 1 | ✅ Done | Auth, Users, Organizations, RBAC |
| 2 | ⏳ | Projects, Phases, Milestones |
| 3 | ⏳ | Tasks, Dependencies, Progress |
| 4 | ⏳ | Daily Reports, Issues, Blockers |
| 5 | ⏳ | Budget, Procurement, Purchase Orders |
| 6 | ⏳ | Documents, Dashboard, File Storage (S3) |
| 7 | 🟡 | AI Layer — orchestrator + navigation + report-summary agents + chat session persistence shipped |
| 8 | ⏳ | Hardening, Deployment |

All Prisma models for future phases are already defined in `prisma/schema.prisma`.
