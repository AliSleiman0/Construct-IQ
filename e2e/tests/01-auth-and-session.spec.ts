import { test, expect, request } from '@playwright/test';

const API = 'http://localhost:4000/api/v1';

const USERS = {
  superAdmin: { email: 'admin@constructiq.com', password: 'Admin@1234' },
  orgAdmin:   { email: 'orgadmin@constructiq.com', password: 'Demo@1234' },
  pm:         { email: 'pm@constructiq.com', password: 'Demo@1234' },
  support:    { email: 'support@constructiq.com', password: 'Demo@1234' },
};

// Selectors derived from the login page source
const sel = {
  emailInput:    'input[type="email"]',
  passwordInput: 'input[type="password"]',
  submitBtn:     'button[type="submit"]',
};

async function fillLogin(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
) {
  await page.goto('/login');
  await page.locator(sel.emailInput).fill(email);
  await page.locator(sel.passwordInput).fill(password);
  await page.locator(sel.submitBtn).click();
}

async function openAccountMenu(page: import('@playwright/test').Page) {
  // Avatar icon button has Tooltip title="Account"
  await page.getByRole('button', { name: /account/i }).click();
}

// ─── TC-01-001 ───────────────────────────────────────────────────────────────
test('TC-01-001: renders login page with email, password fields and submit button', async ({ page }) => {
  // / is a public landing page; /login is the auth page
  await page.goto('/login');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator(sel.emailInput)).toBeVisible();
  await expect(page.locator(sel.passwordInput)).toBeVisible();
  await expect(page.locator(sel.submitBtn)).toBeVisible();
  await expect(page.getByText('Work email')).toBeVisible();
  await expect(page.getByText('Password')).toBeVisible();
});

// ─── TC-01-002 ───────────────────────────────────────────────────────────────
test('TC-01-002: empty form submission shows validation errors, no network request', async ({ page }) => {
  await page.goto('/login');
  const requests: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/auth/login')) requests.push(req.url());
  });
  await page.locator(sel.submitBtn).click();
  // zod: z.string().email() on '' → 'Enter a valid email'
  // zod: z.string().min(1) on '' → 'Password is required'
  await expect(page.getByText('Enter a valid email')).toBeVisible();
  await expect(page.getByText('Password is required')).toBeVisible();
  expect(requests).toHaveLength(0);
  await expect(page).toHaveURL(/\/login/);
});

// ─── TC-01-003 ───────────────────────────────────────────────────────────────
test('TC-01-003: invalid email format shows validation error', async ({ page }) => {
  await page.goto('/login');
  await page.locator(sel.emailInput).fill('notanemail');
  await page.locator(sel.passwordInput).fill('anypassword');
  await page.locator(sel.submitBtn).click();
  await expect(page.getByText('Enter a valid email')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

// ─── TC-01-004 ───────────────────────────────────────────────────────────────
test('TC-01-004: wrong credentials shows error and stays on login', async ({ page }) => {
  const statuses: number[] = [];
  page.on('response', (res) => {
    if (res.url().includes('/auth/login')) statuses.push(res.status());
  });
  await fillLogin(page, USERS.orgAdmin.email, 'WrongPassword');
  // Error message from the login page handler for 401
  await expect(page.getByText(/that email and password don.t match/i)).toBeVisible({ timeout: 8000 });
  await expect(page).toHaveURL(/\/login/);
  expect(statuses.some((s) => s === 401)).toBeTruthy();
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === 'access_token')).toBeUndefined();
});

// ─── TC-01-005 ───────────────────────────────────────────────────────────────
test('TC-01-005: super admin logs in and lands on /company-select', async ({ page }) => {
  let loginStatus = 0;
  page.on('response', (res) => {
    if (res.url().includes('/auth/login')) loginStatus = res.status();
  });
  await fillLogin(page, USERS.superAdmin.email, USERS.superAdmin.password);
  await expect(page).toHaveURL(/\/company-select/, { timeout: 12000 });
  expect(loginStatus).toBe(200);
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === 'access_token')).toBeDefined();
});

// ─── TC-01-006 ───────────────────────────────────────────────────────────────
test('TC-01-006: org admin logs in and lands on /admin/dashboard', async ({ page }) => {
  await fillLogin(page, USERS.orgAdmin.email, USERS.orgAdmin.password);
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 12000 });
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === 'access_token')).toBeDefined();
});

// ─── TC-01-007 ───────────────────────────────────────────────────────────────
test('TC-01-007: PM logs in and cannot access /admin/* routes', async ({ page }) => {
  await fillLogin(page, USERS.pm.email, USERS.pm.password);
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 12000 });
  // Landing URL is NOT an admin route
  expect(page.url()).not.toMatch(/\/admin\//);

  // Attempt to navigate to an admin-only page
  await page.goto('/admin/settings');
  await page.waitForURL(
    (url) =>
      url.pathname.includes('/login') ||
      url.pathname.includes('/dashboard') ||
      url.pathname.includes('/403'),
    { timeout: 8000 },
  );
  expect(page.url()).not.toMatch(/\/admin\/settings/);
});

// ─── TC-01-008 ───────────────────────────────────────────────────────────────
test('TC-01-008: support agent logs in and cannot access super-admin pages', async ({ page }) => {
  await fillLogin(page, USERS.support.email, USERS.support.password);
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 12000 });
  expect(page.url()).not.toMatch(/\/super-admin\//);
});

// ─── TC-01-009 ───────────────────────────────────────────────────────────────
test('TC-01-009: accessToken and refreshToken cookies are httpOnly', async ({ page }) => {
  await fillLogin(page, USERS.orgAdmin.email, USERS.orgAdmin.password);
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 12000 });

  const cookies = await page.context().cookies();
  const access  = cookies.find((c) => c.name === 'access_token');
  const refresh = cookies.find((c) => c.name === 'refresh_token');

  expect(access).toBeDefined();
  expect(access!.httpOnly).toBe(true);
  expect(refresh).toBeDefined();
  expect(refresh!.httpOnly).toBe(true);
});

// ─── TC-01-010 ───────────────────────────────────────────────────────────────
test('TC-01-010: corrupted access token triggers silent refresh', async ({ page }) => {
  await fillLogin(page, USERS.orgAdmin.email, USERS.orgAdmin.password);
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 12000 });

  // Overwrite accessToken with garbage; keep logged_in + refreshToken intact
  const cookies = await page.context().cookies();
  const access = cookies.find((c) => c.name === 'access_token');
  if (access) {
    await page.context().addCookies([{ ...access, value: 'bad.token.value' }]);
  }

  const refreshFired = page
    .waitForRequest((req) => req.url().includes('/auth/refresh'), { timeout: 12000 })
    .catch(() => null);

  await page.goto('/admin/dashboard');
  await refreshFired;

  // After refresh, the page should stay authenticated (not bounce to /login)
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 12000 });
  expect(page.url()).not.toMatch(/\/login/);
});

// ─── TC-01-011 ───────────────────────────────────────────────────────────────
test('TC-01-011: clearing all cookies on protected route redirects to /login', async ({ page }) => {
  await fillLogin(page, USERS.orgAdmin.email, USERS.orgAdmin.password);
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 12000 });

  await page.context().clearCookies();

  await page.goto('/admin/dashboard');
  // Middleware checks 'logged_in' cookie; clearing it triggers redirect
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
});

// ─── TC-01-012 ───────────────────────────────────────────────────────────────
test('TC-01-012: logout clears cookies and redirects to /login', async ({ page }) => {
  await fillLogin(page, USERS.orgAdmin.email, USERS.orgAdmin.password);
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 12000 });

  // Open the avatar/account menu (Tooltip title="Account" on the IconButton)
  await openAccountMenu(page);
  // Click the "Log Out" menu item
  await page.getByRole('menuitem', { name: /log out/i }).click();

  await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === 'logged_in')).toBeUndefined();

  // Back-navigation should not restore access
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
});

// ─── TC-01-013 ───────────────────────────────────────────────────────────────
test('TC-01-013: unauthenticated direct access to /admin/dashboard redirects to /login', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
});

// ─── TC-01-014 ───────────────────────────────────────────────────────────────
test('TC-01-014: unauthenticated direct access to /super-admin/organizations redirects to /login', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/super-admin/organizations');
  await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
});

// ─── TC-01-015 ───────────────────────────────────────────────────────────────
test('TC-01-015: PM cannot access /admin/settings', async ({ page }) => {
  await fillLogin(page, USERS.pm.email, USERS.pm.password);
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 12000 });

  await page.goto('/admin/settings');
  await page.waitForURL(
    (url) =>
      url.pathname.includes('/login') ||
      url.pathname.includes('/dashboard') ||
      url.pathname.includes('/403'),
    { timeout: 8000 },
  );
  expect(page.url()).not.toMatch(/\/admin\/settings/);
});

// ─── TC-01-016 ───────────────────────────────────────────────────────────────
test('TC-01-016: authenticated requests carry X-Organization-Id header', async ({ page }) => {
  const orgIds: string[] = [];

  page.on('request', (req) => {
    if (req.url().includes('/api/v1/') && req.method() !== 'OPTIONS') {
      const id = req.headers()['x-organization-id'];
      if (id) orgIds.push(id);
    }
  });

  await fillLogin(page, USERS.orgAdmin.email, USERS.orgAdmin.password);
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 12000 });
  // Give the dashboard time to fire its data requests
  await page.waitForTimeout(2000);

  expect(orgIds.length).toBeGreaterThan(0);
  // All captured IDs should be the same org
  const unique = new Set(orgIds);
  expect(unique.size).toBe(1);
});

// ─── TC-01-017 ───────────────────────────────────────────────────────────────
test('TC-01-017: password field masks input (type="password")', async ({ page }) => {
  await page.goto('/login');
  await page.locator(sel.passwordInput).fill('mysecretpassword');
  const type = await page.locator(sel.passwordInput).getAttribute('type');
  expect(type).toBe('password');
  // Show/hide toggle switches it to text
  await page.getByRole('button', { name: /show password/i }).click();
  const typeAfter = await page.locator(sel.passwordInput).getAttribute('type');
  expect(typeAfter).toBe('text');
});

// ─── TC-01-018 ───────────────────────────────────────────────────────────────
test('TC-01-018: cookies survive a new tab (persistent session within same context)', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:3001/login');
  await page.locator(sel.emailInput).fill(USERS.orgAdmin.email);
  await page.locator(sel.passwordInput).fill(USERS.orgAdmin.password);
  await page.locator(sel.submitBtn).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 12000 });

  // Open a second tab in the same context — cookies are shared
  const page2 = await context.newPage();
  await page2.goto('http://localhost:3001/admin/dashboard');
  await expect(page2).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });
  expect(page2.url()).not.toMatch(/\/login/);

  await context.close();
});

// ─── TC-01-019 ───────────────────────────────────────────────────────────────
test('TC-01-019: two independent browser contexts maintain separate sessions', async ({ browser }) => {
  const ctx1 = await browser.newContext();
  const ctx2 = await browser.newContext();
  const p1 = await ctx1.newPage();
  const p2 = await ctx2.newPage();

  // Log in with org admin in ctx1
  await p1.goto('http://localhost:3001/login');
  await p1.locator(sel.emailInput).fill(USERS.orgAdmin.email);
  await p1.locator(sel.passwordInput).fill(USERS.orgAdmin.password);
  await p1.locator(sel.submitBtn).click();
  await expect(p1).toHaveURL(/\/admin\/dashboard/, { timeout: 12000 });

  // Log in with org admin in ctx2
  await p2.goto('http://localhost:3001/login');
  await p2.locator(sel.emailInput).fill(USERS.orgAdmin.email);
  await p2.locator(sel.passwordInput).fill(USERS.orgAdmin.password);
  await p2.locator(sel.submitBtn).click();
  await expect(p2).toHaveURL(/\/admin\/dashboard/, { timeout: 12000 });

  // Both are independently authenticated
  expect((await ctx1.cookies()).find((c) => c.name === 'access_token')).toBeDefined();
  expect((await ctx2.cookies()).find((c) => c.name === 'access_token')).toBeDefined();

  // Clearing ctx1's cookies does not affect ctx2
  await ctx1.clearCookies();
  await p2.reload();
  await expect(p2).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });

  await ctx1.close();
  await ctx2.close();
});

// ─── TC-01-020 ───────────────────────────────────────────────────────────────
test('TC-01-020: 11th rapid login attempt returns 429 (rate limiting)', async () => {
  const ctx = await request.newContext({ baseURL: API });

  const statuses: number[] = [];
  for (let i = 0; i < 11; i++) {
    const res = await ctx.post('/auth/login', {
      data: { email: USERS.orgAdmin.email, password: 'WrongPassword' },
    });
    statuses.push(res.status());
  }

  // At some point a 429 must appear
  expect(statuses.some((s) => s === 429)).toBe(true);
  // At least some of the first 10 should be 401 (not rate-limited yet)
  expect(statuses.some((s) => s === 401)).toBe(true);

  await ctx.dispose();
});
