# QA Prompt 01 — Authentication & Session Management

## Scope
Login page, token lifecycle, redirect logic, role-based post-login routing, session expiry, and logout.

## Prerequisites
- Docker containers running: MongoDB (27017), Redis (6379)
- Backend running on port 4000
- Frontend running on port 3000
- Database seeded: `npm run seed` inside `backend/`

---

## TC-01-001: Render Login Page
**Steps:**
1. Open browser, navigate to `http://localhost:3000`.
2. Confirm redirect to `/login`.

**Expected:**
- `/login` renders with email field, password field, "Sign In" button.
- No console errors.
- No authenticated content visible.

---

## TC-01-002: Empty Form Submission
**Steps:**
1. On `/login`, click "Sign In" without entering credentials.

**Expected:**
- Client-side validation shows "Email is required" and/or "Password is required".
- No network request fired (or 400 returned if request fires).
- User stays on `/login`.

---

## TC-01-003: Invalid Email Format
**Steps:**
1. Enter `notanemail` in the email field.
2. Enter any password.
3. Click "Sign In".

**Expected:**
- Validation error: "Invalid email format" or similar.
- No login attempt.

---

## TC-01-004: Wrong Credentials
**Steps:**
1. Enter `orgadmin@constructiq.com` / `WrongPassword`.
2. Click "Sign In".

**Expected:**
- Error snackbar or inline message: "Invalid credentials" / "Unauthorized".
- User stays on `/login`.
- No JWT cookie set.

---

## TC-01-005: Super Admin Login
**Steps:**
1. Enter `admin@constructiq.com` / `Admin@1234`.
2. Click "Sign In".

**Expected:**
- POST `http://localhost:4000/api/v1/auth/login` returns 200.
- Response body contains `accessToken` (or cookies are set).
- Redirect to `/company-select` (not `/dashboard`).
- `isSuperAdmin: true` present in JWT payload (decode via DevTools → Application → Cookies).

---

## TC-01-006: Org Admin Login
**Steps:**
1. Enter `orgadmin@constructiq.com` / `Demo@1234`.
2. Click "Sign In".

**Expected:**
- Redirect to `/admin/dashboard` (or `/dashboard`).
- `isSuperAdmin` is absent or `false` in JWT.
- `organizationId` is present and non-empty.

---

## TC-01-007: Project Manager Login
**Steps:**
1. Enter `pm@constructiq.com` / `Demo@1234`.

**Expected:**
- Redirect to main app (non-admin route, e.g. `/dashboard`).
- `/admin/*` routes are inaccessible (redirect to 403 or back to dashboard if attempted).

---

## TC-01-008: Support Agent Login
**Steps:**
1. Enter `support@constructiq.com` / `Demo@1234`.

**Expected:**
- Redirect to main dashboard.
- Super admin pages and org admin pages inaccessible.

---

## TC-01-009: Access Token in Cookie
**Steps:**
1. Log in as any user.
2. Open DevTools → Application → Cookies → `localhost`.

**Expected:**
- `accessToken` cookie present, `HttpOnly: true`, `SameSite` set.
- `refreshToken` cookie present, `HttpOnly: true`.

---

## TC-01-010: Silent Token Refresh
**Steps:**
1. Log in as org admin.
2. Wait 15 minutes (or manually expire the access token by editing `accessToken` cookie value to something invalid).
3. Perform any API-backed action (e.g., navigate to `/admin/dashboard`).

**Expected:**
- Axios interceptor catches 401.
- Silent POST to `/api/v1/auth/refresh` succeeds.
- Original request retried automatically.
- User sees data without being redirected to `/login`.

---

## TC-01-011: Refresh Token Expired / Invalid
**Steps:**
1. Log in as any user.
2. Manually delete both `accessToken` and `refreshToken` cookies.
3. Navigate to a protected route.

**Expected:**
- Redirect to `/login`.
- No infinite loop.
- No unhandled error in console.

---

## TC-01-012: Logout
**Steps:**
1. Log in as org admin.
2. Find and click the logout button (user menu / avatar).

**Expected:**
- POST or GET to `/api/v1/auth/logout` (or equivalent).
- Both `accessToken` and `refreshToken` cookies cleared.
- Redirect to `/login`.
- Navigating back to `/admin/dashboard` redirects back to `/login`.

---

## TC-01-013: Direct URL Access Without Auth
**Steps:**
1. Ensure no cookies/session active (incognito or clear cookies).
2. Navigate directly to `http://localhost:3000/admin/dashboard`.

**Expected:**
- Redirect to `/login`.
- `/admin/dashboard` not rendered.

---

## TC-01-014: Direct URL Access — Super Admin Page Without Auth
**Steps:**
1. No active session.
2. Navigate to `http://localhost:3000/super-admin/organizations`.

**Expected:**
- Redirect to `/login`.

---

## TC-01-015: Direct URL Access — Org Admin Page as PM
**Steps:**
1. Log in as `pm@constructiq.com`.
2. Navigate to `http://localhost:3000/admin/settings`.

**Expected:**
- Either 403 error page or redirect to `/dashboard`.
- Settings content NOT visible.

---

## TC-01-016: Cross-Organization Header
**Steps:**
1. Log in as org admin.
2. Open DevTools → Network → any `/api/v1/*` request.

**Expected:**
- `X-Organization-Id` header present on every authenticated API request.
- Value matches the org admin's organization ID.

---

## TC-01-017: Password Field Masking
**Steps:**
1. On `/login`, type in the password field.

**Expected:**
- Characters shown as bullets/asterisks.
- Optional: toggle show/hide eye icon works.

---

## TC-01-018: Remember Me / Session Persistence
**Steps:**
1. Log in as org admin.
2. Close the browser tab, reopen, navigate to `http://localhost:3000/admin/dashboard`.

**Expected:**
- If cookies are persistent: user is still logged in, no re-login required.
- If session cookies: user must log in again.
- Document whichever behavior is implemented.

---

## TC-01-019: Concurrent Sessions
**Steps:**
1. Log in as org admin in Chrome.
2. Open Firefox, log in as the same user.

**Expected:**
- Both sessions work independently.
- Both receive valid tokens.
- No forced logout of the first session (unless single-session enforcement is intentional).

---

## TC-01-020: API Rate Limiting on Auth
**Steps:**
1. Send 11 rapid POST requests to `POST /api/v1/auth/login` with wrong credentials (use curl loop or Postman runner).

**Expected:**
- First 10 return 401.
- 11th returns 429 Too Many Requests.
- Response includes retry-after or error message.
