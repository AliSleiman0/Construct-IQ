# frontend/CLAUDE.md

Frontend-specific guidance for Claude Code. Cross-cutting concerns live in the root `CLAUDE.md`.

## Stack

- Next.js 14 (App Router) on port 3000.
- React 18, TypeScript.
- TanStack Query 5 for server state, Zustand for client state.
- MUI v5 + Tailwind used together. Forms: React Hook Form + Zod.
- Axios client (`src/lib/api/client.ts`) with response unwrap + 401 refresh-and-retry.

## Route groups

```
src/app/
  (auth)/         # public — /login. Layout omits AuthHydrator.
  (app)/          # protected — /profile, /admin/settings, /company-select. Layout mounts AuthHydrator.
  (dashboard)/    # protected — feature pages (/projects, /tasks, /users, /reports, etc.). Layout also mounts AuthHydrator.
  _landing/       # marketing-style index.
  api/            # Next route handlers (rewrites to the NestJS backend via /api/v1).
```

Each group has its own `layout.tsx`. `AppProviders` (`src/providers/index.tsx`) wraps every group — including `(auth)` — so any hook used inside a provider runs on `/login` too. That's why query gating matters (see below).

## Providers — order matters

`src/providers/index.tsx` composes them in this order:

```
QueryProvider → ThemeProvider → SnackbarProvider → children
```

- `QueryProvider` must wrap `ThemeProvider` because `ThemeProvider` consumes `useOrgSettings()` to build a reactive theme.
- `ThemeProvider` reads brand color + light/dark/auto preference and rebuilds the MUI theme via `createAppTheme(brandColor, mode)` (`src/constants/theme.ts`). Dark mode swaps `background.default`, `background.paper`, `text.primary`, `text.secondary`. Auto mode uses `useMediaQuery('(prefers-color-scheme: dark)', { noSsr: true })`.
- A `'use client'` directive is on every provider file.

## Reactive theming

- Theme is **not** a static singleton — `createAppTheme(brandColor, mode)` is invoked on every settings change.
- Chrome that needs to respect brand color (Sidebar, etc.) must read from MUI's theme, **not** hardcode `#1976d2`. Use:
  ```tsx
  const theme = useTheme();
  const brand = theme.palette.primary.main;
  const brandLight = theme.palette.primary.light;
  // backgrounds: alpha(brand, 0.25)
  ```
- See `src/components/shared/Sidebar.tsx` for the canonical pattern.

## Auth + query gating

- Zustand store: `src/store/auth.store.ts`. Key flag: `isAuthenticated` (initial `false`).
- `AuthHydrator` (`src/features/auth/components/AuthHydrator.tsx`) calls `useAuthStore.getState().hydrateFromUser(user)` **synchronously during render** — only mounted on `(app)/*` and `(dashboard)/*` routes, never on `(auth)/*`.
- Any `useQuery` that mounts **inside a provider** (so it can run on `/login` before login completes) MUST be gated:

  ```ts
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [...],
    queryFn: ...,
    enabled: isAuthenticated,
  });
  ```

  Without this, an unauthenticated mount triggers `GET /api/v1/...` → 401 → axios interceptor attempts `/auth/refresh` → 401 → `window.location.href = '/login'` → page reloads → loop. This bit `useOrgSettings` once already. Established gated hooks: `useOrgSettings`, `useMe`.

- Axios `NO_REFRESH_ON_401` list in `src/lib/api/client.ts`: `['/auth/login', '/auth/refresh', '/auth/logout']`. Auth endpoints whose 401 means "wrong creds / no session", not "token expired".

## Profile page (`src/app/(app)/profile/page.tsx`)

Subnav-style tabbed layout (mirrors `/admin/settings`). Three tabs:

1. **Personal info** — firstName / lastName / phone / avatar. Currently writes to the auth store only (no `PATCH /users/me` wire-up yet — TODO comment in place).
2. **Localization** — language, timezone (with `'auto'` resolving via `Intl.DateTimeFormat().resolvedOptions().timeZone`), date format, week start, time format (12h/24h), measurement (imperial/metric). Reads from `useMe()`, saves via `useUpdateMe({ localization })`. Option lists + defaults centralized in `src/constants/localization.ts`.
3. **Notifications** — digest cadence + per-event opt-out toggles. Reads/saves via the same hooks (`useUpdateMe({ notifications })`). Constants in `src/constants/notifications.ts`. Security alerts intentionally absent (always deliver).

A shared dirty-state footer at page level handles Save / Discard for whichever of Localization / Notifications is active.

## Settings page (`src/app/(app)/admin/settings/page.tsx`)

Sections (sidebar nav, controlled by `active` state):
- `profile` — name/short-name/industry/size/description (writes to the Organization doc).
- `address` — address + contact (Organization doc).
- `branding` — `brandColor`, `theme`, `emailSender` (OrgSettings). Brand color repaints the live theme immediately on save (Sidebar + everything reading `theme.palette.primary.main`).
- `localization` — org defaults: `timezone`, `currency`, `dateFormat`, `weekStart`, `measurement`.
- `notifications` — org-wide notification policy.
- `security` — `twoFactorRequired`, `passwordPolicy`, `sessionTimeoutMin`, `lockoutMaxAttempts` + `lockoutDurationMin`, `allowedIps` (textarea, split + dedupe at save). Password-policy and lockout are actually enforced by the backend; session-timeout drives the access-token TTL. Real SSO and per-device session listing are deferred.
- `danger` — danger zone (destructive org operations).

The page collects two parallel payloads (`orgPayload` for the Organization update, `settingsPayload` for the OrgSettings update) and dispatches both via `Promise.allSettled()`.

## Hooks

- `useMe()` / `useUpdateMe()` — `src/features/users/hooks/`. `useMe` is gated on `isAuthenticated`; `useUpdateMe` seeds the `['me']` cache from the mutation response so consumers paint immediately.
- `useOrgSettings()` / `useUpdateOrgSettings()` — `src/features/settings/hooks/`. Same gating pattern.
- `useCurrentOrg()` / `useUpdateOrganization()` / `useUploadOrgLogo()` — `src/features/organizations/hooks/`.
- `useAiChat()` — `src/features/ai/`. Auto-navigates on `action.type === 'navigate'`.
- `useNotifications()` / `useMarkNotificationRead()` / `useMarkAllNotificationsRead()` — `src/features/notifications/hooks/`. Gated on `isAuthenticated`, polls hourly; drives the header bell (`components/shared/Header.tsx`) off the real `/notifications` API. Backend rows are `{ _id, title, message, type, isRead, createdAt }`; `type` ∈ `success|error|warning|info` maps to the chip colour.

When adding a new "current user / current org" hook, follow the gating pattern verbatim — drop the `enabled: isAuthenticated` line and the `/login` redirect loop comes back immediately.

## Stores

- `auth.store.ts` — `user`, `role`, `isAuthenticated`, `isLoading`, plus `setUser`, `clearAuth`, `loginWithEmail`, `hydrateFromUser`, `refreshMe`, `logout`. `hasPermission()` / `hasRole()` helpers wrap the user's role/permission arrays.
- `company.store.ts` — Super Admin's currently-selected company. Mirrors to a non-httpOnly cookie + localStorage so the axios request interceptor can inject `X-Organization-Id` synchronously.
- `mock-state.store.ts` — toggle for mock mode (used by `src/lib/mock/`).

## Features directory

`src/features/` — one subdir per feature area (ai, audit, auth, billing, construction-progress, dashboard, issues, notifications, org-features, organizations, payments, placeholders, plans, platform-features, projects, reports, settings, site-issues, site-reports, tasks, tickets, units, users). Each typically has `components/`, `hooks/`, sometimes `utils/`. Cross-feature shared chrome lives under `src/components/shared/` (PageHeader, Sidebar, AppLayout, …).

Note: `PaymentStatus` (`src/mocks/payments.mock.ts`) now includes `PARTIAL` (part-paid installments) — keep the `PaymentCard` colour/label maps in sync if the union changes.

## Common pitfalls

- **Hardcoded theme colors.** Anything in app chrome that uses `#1976d2` or a literal blue will not repaint when the brand color changes. Read from `useTheme()` and use `alpha()` for rgba derivations.
- **Query without `enabled: isAuthenticated`** mounted inside a provider → infinite `/login` redirect.
- **Forgetting that the response interceptor already unwraps `.data.data`** — call sites should write `const res = await api.get(...); return res.data;` (the User itself), not `res.data.data`.
- **AuthHydrator vs AuthGuard ordering**: the first render of an `(app)/*` page sees `isAuthenticated: false` until `AuthHydrator` runs in the same tick. This is why themes/sidebars take one extra paint to reflect the real values — accepted trade-off.
- **Mock mode**: `MOCK_MODE` (in `src/lib/mock/mode.ts`) swaps the axios adapter for `mockAdapter`. Auth endpoints always hit the real backend regardless.
