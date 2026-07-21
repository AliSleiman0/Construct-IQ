# backend/CLAUDE.md

Backend-specific guidance for Claude Code. Cross-cutting concerns live in the root `CLAUDE.md`.

## Stack

- NestJS 10, TypeScript, Mongoose 8 (no Prisma — replaced).
- MongoDB 7 single-node replica set (`rs0`) — required for multi-document transactions used in `UsersService.create()` and similar.
- Redis 7 (rate limit / cache scaffolding).
- Express adapter under the hood (`trust proxy` set in `main.ts` so `req.ip` reflects the real client through any proxy/CDN).

## Module layout

```
src/
  main.ts                   # bootstrap; helmet, cookie-parser, compression, CORS, trust proxy, ValidationPipe
  app.module.ts             # registers global APP_GUARDs (JwtAuthGuard → IpAllowlistGuard), interceptors, filters
  config/                   # env loading + validation
  common/
    guards/                 # JwtAuthGuard, IpAllowlistGuard, PermissionsGuard, FeatureGuard
    decorators/             # @Public, @CurrentUser, @RequirePermissions
    interceptors/           # ResponseInterceptor (envelope), OrgContextInterceptor
    filters/                # HttpExceptionFilter
    constants/permissions.ts # PERMISSIONS.* — always use these, never raw strings
    enums/                  # UserStatus etc. (replaces the old @prisma/client re-exports)
  database/mongoose/        # global module + cuid-id / soft-delete plugins + init.ts for global plugin registration
  modules/
    auth/                   # login/refresh/logout, JWT strategies, password-policy submodule
    users/                  # users + roles + self-update endpoint
    organizations/
    org-settings/           # per-org config: branding, localization, security
    audit/                  # append-only audit log
    ai/                     # orchestrator + agents (Phase 7)
    [projects|tasks|reports|issues|budget|procurement|...]/  # schemas only until their phase ships
```

Each module follows `{feature}.controller.ts`, `.service.ts`, `.module.ts`, `dto/`, `schemas/`. `@Schema`/`@Prop` decorators carry every structural rule (required, enum, unique, index, ref); pair with class-validator DTOs at the API boundary.

## Auth & sessions

### Endpoints (`src/modules/auth/`)
- `POST /auth/login` — credentials → 200 with `{ user, accessToken, refreshToken }`. Tokens are set as httpOnly cookies. Lockout check fires **before** bcrypt; failed compare increments `User.failedLoginAttempts` atomically (`$inc`) and locks once `OrgSettings.lockoutMaxAttempts` is reached.
- `POST /auth/refresh` — `JwtRefreshStrategy` validates the refresh cookie; matches an HMAC of the raw token stored on `User.refreshToken`. Reissues both tokens, rotates the stored hash.
- `POST /auth/logout` — clears `User.refreshToken`. Single-token model (no per-device sessions yet).
- `GET /auth/me` — JWT shape (organization, roles, permissions, isSuperAdmin). Distinct from `GET /users/me` which returns the full User document including `localization` + `notifications` subdocs.

### Token TTL
- Access TTL is **per-org**: `AuthService.resolveAccessTtl(organizationId)` reads `OrgSettings.sessionTimeoutMin` and passes `${min}m` as `expiresIn` to `jwtService.signAsync`. Org-less / Super Admin callers fall back to `JWT_ACCESS_EXPIRES_IN` env (default `15m`).
- Refresh TTL is env-only (`JWT_REFRESH_EXPIRES_IN`, default `7d`).

### Password policy
- `src/modules/auth/services/password-policy.service.ts` enforces `OrgSettings.passwordPolicy` (`standard | strong | strict`) at the point a password is set.
- Tiers: `standard` 8+ chars + upper/lower/digit; `strong` 12+ chars + special char; `strict` 14+ chars + no whitespace.
- Lives in a slim `PasswordPolicyModule` (`src/modules/auth/password-policy.module.ts`) which imports only `OrgSettingsModule`. **Imported by `UsersModule`, not `AuthModule`** — the alternative would close the `AuthModule → UsersModule → PasswordPolicyService` chain into a cycle.
- Called from `UsersService.create()` before `bcrypt.hash`. Future password-change/reset endpoints should call the same service. `User.passwordChangedAt` is captured at insert for a future rotation rule.

### IP allowlist
- `src/common/guards/ip-allowlist.guard.ts` is a global guard registered **after** `JwtAuthGuard` so `request.user` is populated. Reads `OrgSettings.allowedIps`; empty list = allow all; Super Admins always bypass.
- Uses `ip-range-check` for CIDR matching. IPv4-mapped IPv6 addresses (`::ffff:1.2.3.4`) are normalized.
- Self-lockout protection: `OrgSettingsService.update()` refuses to save an `allowedIps` array that would exclude the caller's own IP, returning a 400 with an explicit recovery message.

## Multi-tenancy guardrails

- `OrgContextInterceptor` populates `request.organizationContext` from `X-Organization-Id` (Super Admin company-select) or from the JWT.
- Every service query must filter by `organizationId`. Cross-org reads are reserved for Super Admin endpoints (`UsersService.findAllGlobal`, `findAllOrgAdmins`) and gated by an explicit `isSuperAdmin` check in the controller.

## Users module

**Schemas** (`src/modules/users/schemas/user.schema.ts`):
- Core: `email`, `passwordHash`, `firstName`, `lastName`, `phone`, `avatarUrl`, `status`, `organizationId`, `roleIds`.
- Security: `failedLoginAttempts`, `lockedUntil`, `passwordChangedAt`, `refreshToken` (HMAC).
- Preferences: `localization: UserLocalization` and `notifications: UserNotificationPreferences` — both nested subdocs with `default: () => ({})` so legacy users get fully-defaulted objects on first read (no migration needed).

`UserLocalization` fields: `language` (en/fr/es/ar), `timezone` (IANA or `'auto'`), `dateFormat`, `timeFormat` (12h/24h), `firstDayOfWeek`, `measurement` (imperial/metric).

`UserNotificationPreferences` fields: `digest` (daily/weekly/never) + per-event opt-out toggles (`newProject`, `invoiceDue`, `invoicePaid`, `ticketUpdate`, `productNews`). Security alerts are intentionally **not** a toggle — they always deliver.

**Endpoints** (`src/modules/users/users.controller.ts`):
- `GET /users/me` — own profile, full document including subdocs.
- `PATCH /users/me` — self-update. **Must be declared above `@Patch(':id')`** or Nest captures `me` as `:id`. No `@RequirePermissions` decorator — the user can only touch their own record because the route uses `user.sub`. Accepts `UpdateMyProfileDto` with optional `localization` and `notifications` nested DTOs. The service field-merges (`$set` with dotted keys) so partial payloads don't wipe untouched fields.
- `GET /users` / `GET /users/:id` / `POST /users` / `PATCH /users/:id` / `DELETE /users/:id` — admin CRUD, gated by `PERMISSIONS.USERS.*`.
- `POST /users/org-admins` / `GET /users/org-admins` — Super Admin only (provisions admins across orgs).
- `POST /users/:id/roles` / `DELETE /users/:id/roles/:roleId` — role assignment.

The semantic response shape (`UserResponse`) merges defaults into the subdocs (`{ ...DEFAULT_LOCALIZATION, ...user.localization }`) so the API always returns a complete object even for documents written before the fields existed.

## Org-settings module

**Schema** (`src/modules/org-settings/schemas/org-settings.schema.ts`):
- Branding: `brandColor`, `theme` (light/dark/auto), `emailSender`.
- Localization defaults: `timezone`, `currency`, `dateFormat`, `weekStart`, `measurement`.
- Notification policy: `notifications: Record<string, any>`.
- Security: `twoFactorRequired` (stored config; enrollment + challenge are a separate feature), `passwordPolicy` (enum `standard | strong | strict`, enforced via `PasswordPolicyService`), `sessionTimeoutMin` (enforced as access-token `expiresIn`), `lockoutMaxAttempts` + `lockoutDurationMin` (enforced in `AuthService.login`), `allowedIps: string[]` (enforced via `IpAllowlistGuard`).
- `ssoEnabled` was removed — real SSO is Phase 8.

**Endpoints**:
- `GET /org-settings` — returns the org's settings doc (upserts with defaults on first call).
- `PATCH /org-settings` — `UpdateOrgSettingsDto`. Controller forwards `{ actorUserId, ipAddress, userAgent }` to the service via an `UpdateContext` arg. Service pre-fetches the doc, runs the self-lockout check, saves, then fires `AuditService.log()` with the field diff (fire-and-forget).

## Audit module (`src/modules/audit/`)

- `AuditLog` schema: `organizationId`, `actorUserId`, `projectId`, `action`, `entityType`, `entityId`, `metadata`, `ipAddress`, `userAgent`, `createdAt`.
- `AuditService.log(entry)` — write-only.
- `AuditService.findAll(orgId, isSuperAdmin, filters)` — paginated read for the audit page (Super Admin sees everything; org admins see their org only).
- `AuditModule` is **not** `@Global` — every consumer must `imports: [AuditModule]` in its own module (despite being listed in `app.module`). Same rule for `NotificationsModule`.

## Notifications module (`src/modules/notifications/`)

- `Notification` schema: `organizationId`, `userId`, `title`, `message`, `type`, `entityType`, `entityId`, `isRead`, `metadata`, `createdAt`. In-app only (no email/SMS/websocket yet).
- `NotificationsService.notify(dto)` — one row; `notifyMany(orgId, userIds[], payload)` — fans out, de-dupes, drops falsy ids (so callers pass `[createdById, assignedToId]` and filter the actor at the call site).
- `type` ∈ `success | error | warning | info` — matches the frontend bell's colour map.
- Endpoints: `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/mark-all-read`.

## Domain events: emit notifications + audit on state changes

Key state changes fire a notification **and** an audit entry, both **fire-and-forget** so a logging/delivery failure never breaks the operation. Each consuming service holds two private helpers:
```ts
private audit(e)  { this.auditService.log(e).catch(() => undefined); }
private notify(orgId, ids, p) { this.notificationsService.notifyMany(orgId, ids, p).catch(() => undefined); }
```
Wired at: PO/MR/variation approve+reject, delivery confirm, RFI answer, inspection result, task/issue status + comments, project status, bid award. Recipients = the tracked creator/requester where one exists, else the project's members; **always exclude the actor**. To add a new event, inject `AuditService`+`NotificationsService` (import both modules) and call the helpers after the successful `save()`.

**Segregation of duties (#33):** a creator may not approve their own variation / material request (`createdById`/`requestedById` === actor → `ForbiddenException`); Super Admins are exempt. Self-rejection stays allowed.

**Inspection FAILED → auto-Issue:** `InspectionsService.update` calls `IssuesService.create({ inspectionId, … })` when status transitions to `FAILED` (the Issue schema has `inspectionId`).

**Bid award → PO (#36):** `BidsService.awardBid()` validates the supplier then calls the exported `ProcurementService.createPO()` to make a DRAFT PO seeded from the bid's extracted total/currency, stamps the bid (`awardedAt`/`purchaseOrderId`), and awards once (409 on retry). `BidsModule` imports `ProcurementModule`.

## Soft-delete, cascades & referential integrity (#34)

- `softDeletePlugin` (`database/mongoose/plugins/soft-delete.plugin.ts`) adds `deletedAt` + auto-filters `deletedAt: null` on **reads/updates only** — it does **not** intercept deletes. So soft-delete = `updateOne({_id}, {deletedAt: new Date()})`; `deleteOne()`/`findOneAndDelete()` are **hard** deletes. `{deletedAt: null}` matches missing fields, so adding the plugin to a populated collection is safe.
- **Cascade:** `cascadeSoftDelete(connection, scopeField, id, now)` (`database/mongoose/cascade.util.ts`) sweeps every registered model with both the scope path (`projectId`/`organizationId`) **and** a `deletedAt` path. Used by project soft-delete and the super-admin org delete (`DELETE /organizations/:id`); collections without the plugin (e.g. `audit_logs`) are skipped automatically.
- **Guards:** deleting a financial parent throws `ConflictException` (409) when live dependents exist — supplier→POs, budget-line→POs/expenses, unit→payments.
- Deleting a task/milestone/phase `$pull`s its id from sibling `dependsOn*` arrays.

## Scheduler (`@nestjs/schedule`)

- `ScheduleModule.forRoot()` is registered in `app.module`; add a `@Cron(CronExpression.…)` method to any provider.
- Existing crons: `TasksService.notifyOverdueTasks` (daily 8am — alerts assignees once via `overdueNotifiedAt`); `DashboardService.refreshOrgSnapshots` (every 10 min — warms the org dashboard snapshot).
- **Install note:** the npm registry sits behind a TLS-intercepting corporate proxy — `npm install` may fail with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`; prefix with `NODE_OPTIONS=--use-system-ca`.

## Dashboard snapshot (#36)

- `DashboardService.getOrgDashboard` is a read-through cache backed by the `dashboard_snapshots` collection: serve a snapshot when `computedAt` is within `SNAPSHOT_TTL_MS` (15 min), else compute live + upsert. The 10-min cron keeps it warm.
- **Org dashboard only** — the per-user PM/site-eng/surveyor dashboards stay read-time (member-scoped).

## AI module (`src/modules/ai/`)

**Endpoints**:
- `POST /ai/chat` — main entry. Body `{ message, projectId?, sessionId? }`, returns `{ reply, action?, sessionId }`.
- `POST /ai/summarize-report/:reportId` — direct report summarization.

**Pattern**: `OrchestratorService` classifies user intent via OpenAI and dispatches to a specialized `@Injectable()` agent under `agents/`.

### Per-user scoping — the assistant only does what the caller's role can do

The assistant is available to every internal staff role that has a UI of its own (`use:ai` is seeded on PM, PROCUREMENT, SURVEYOR, SITE_ENG; ORG_ADMIN inherits it from `manage:company`). PLANNING_ENG and FINANCE_VIEWER are withheld — they have no route prefix in `frontend/src/config/roles.ts`, so `(app)/layout.tsx` logs them out on sight; grant them `use:ai` when those sections ship. What it will *do* is then derived from that caller's permissions — a Site Engineer is never offered, navigated to, or answered about budget.

Two registries plus one enforcement point:

- **`capabilities/ai-capabilities.ts`** — which agents a caller may reach. Each entry carries `requires: string[]`; `resolveCapabilities(permissions)` filters. `report-summary` requires `read:reports`.
- **`tools/navigation-catalog.ts`** — which pages the assistant may offer. A destination is real for a caller only when their **primary role has a route for it** *and* their permissions satisfy `requires`. Routes are role-prefixed (`/pm/budget`, `/site-eng/reports`) because `(app)/layout.tsx` bounces anyone off another role's prefix — never emit a bare `/section`. **Keep in lockstep with `frontend/src/config/sidebar-nav.ts`**, which stays the UI source of truth.
- **`OrchestratorService.route()`** — builds the classifier prompt *from the caller's capabilities* (an agent they can't use is never described), then **re-checks `decision.agent` against that same list before dispatching**. The prompt is a hint; this check is the enforcement. `NavigationAgent` re-validates the model's tool call against the scope too, and refuses rather than emitting an unreachable route.

Both resolvers and `PermissionsGuard` share `common/util/permission-check.util.ts` (`satisfiesPermission` / `satisfiesAll`) so the AI can never advertise something the API would refuse. `PermissionsGuard` populates `request.user.permissions` **and** `request.user.roles`; the AI controller forwards both into `OrchestratorContext`.

Adding an agent: one entry in `AI_CAPABILITIES` with the permissions it reads, a provider in `ai.module.ts`, a `case` in the switch. Scoping then comes for free.

**Existing DBs**: role docs are per-org, so editing `STANDARD_ROLES` only affects new orgs. Run `scripts/backfill-ai-permissions.ts` to push `use:ai` into roles that already exist. The org-level `AiFeatureGuard` gate is independent and still applies.

**Current agents**:
- `NavigationAgent` — natural language → app routes via OpenAI tool-calling. Returns `{ action: { type: 'navigate', route } }`.
- `ReportSummaryAgent` — fetches a `DailyReport`, summarizes via OpenAI, persists to `DailyReport.aiSummary`.

**Persistence**: `ChatSessionService` writes to `ChatSession` + `ChatMessage` collections, scoped per user + organization. The orchestrator loads prior messages so follow-up intents work ("and now go to users").

**Provider**: OpenAI `gpt-4o-mini` (configurable via `AI_MODEL` env). SDK: `openai` npm package.

**Extending**: add new agent in `src/modules/ai/agents/`, register in `ai.module.ts`, add a routing case in `orchestrator.service.ts`'s switch.

## Rate limiting & Swagger

- `@nestjs/throttler` — 100 req/min default, 10 req/min on auth endpoints.
- Swagger UI at `http://localhost:4000/api/docs` in non-production. DTOs auto-documented via `@nestjs/swagger`.

## Common pitfalls

- **Route ordering**: literal `me`-style routes must precede `:id` captures.
- **Nested DTO validation**: requires `@ValidateNested()` + `@Type(() => Inner)` and `transform: true` on the global pipe (already set in `main.ts`).
- **Module cycles**: when a service is consumed by both `AuthModule` and `UsersModule`, isolate it in its own slim module (see `PasswordPolicyModule`).
- **CommonJS-only deps**: `ip-range-check` is published as `export =`. Use `require()` interop, not default import — tsconfig has no `esModuleInterop`.
- **Audit/notify writes must not throw**: wrap `AuditService.log()` / `NotificationsService.notifyMany()` in `.catch(() => undefined)` from the consumer side (use the private `audit()`/`notify()` helpers) so a logging/delivery failure doesn't break the user-facing operation.
- **PartialType + `forbidNonWhitelisted`**: an update DTO declared as `PartialType(CreateXDto)` only whitelists the create fields — any field the update needs but create lacks (e.g. `status`, `paidAmountUsd`) is **stripped/rejected** by the global pipe before reaching the service. Define those update DTOs explicitly (see `UpdatePaymentDto`).
- **Pre-existing red suites (#43)**: `reports.service.spec.ts` fails to run on `main` (a tsc error in the spec). `ts-jest` runs `isolatedModules`, so a spec tsc error fails only that suite, not the others — `npx jest` is otherwise green. Don't mistake it for a regression.
