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
- `AuditModule` is globally registered (`app.module.ts`). Other modules just import it and inject the service.

## AI module (`src/modules/ai/`)

**Endpoints**:
- `POST /ai/chat` — main entry. Body `{ message, projectId?, sessionId? }`, returns `{ reply, action?, sessionId }`.
- `POST /ai/summarize-report/:reportId` — direct report summarization.

**Pattern**: `OrchestratorService` classifies user intent via OpenAI and dispatches to a specialized `@Injectable()` agent under `agents/`.

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
- **Audit writes must not throw**: wrap the `AuditService.log()` call in `.catch(() => {})` from the consumer side so an audit failure doesn't break the user-facing operation.
