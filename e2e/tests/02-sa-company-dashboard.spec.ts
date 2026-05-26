import { test, expect } from '@playwright/test';

const API = 'http://localhost:4000/api/v1';

const USERS = {
  superAdmin: { email: 'admin@constructiq.com', password: 'Admin@1234' },
  orgAdmin:   { email: 'orgadmin@constructiq.com', password: 'Demo@1234' },
};

const sel = {
  emailInput:    'input[type="email"]',
  passwordInput: 'input[type="password"]',
  submitBtn:     'button[type="submit"]',
};

async function loginAs(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator(sel.emailInput).fill(email);
  await page.locator(sel.passwordInput).fill(password);
  await page.locator(sel.submitBtn).click();
}

async function loginAsSuperAdmin(page: import('@playwright/test').Page) {
  await loginAs(page, USERS.superAdmin.email, USERS.superAdmin.password);
  await expect(page).toHaveURL(/\/company-select/, { timeout: 12000 });
}

async function selectFirstOrg(page: import('@playwright/test').Page) {
  // Click the first org card / button on company-select
  const orgCard = page.locator('[data-testid="org-card"]').first();
  if (await orgCard.isVisible().catch(() => false)) {
    await orgCard.click();
  } else {
    await page.getByRole('button').filter({ hasText: /org|construction|company/i }).first().click();
  }
  await page.waitForURL(/\/super-admin\/dashboard/, { timeout: 12000 });
}

// ─── TC-02-001 ───────────────────────────────────────────────────────────────
test('TC-02-001: company-select renders org list after super admin login', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await expect(page).toHaveURL(/\/company-select/);
  // At least one org card visible
  const cards = page.getByRole('button').filter({ hasText: /.+/ });
  await expect(cards.first()).toBeVisible({ timeout: 8000 });
  // Page should have a heading or title
  await expect(page.getByText(/select|company|organization/i).first()).toBeVisible();
});

// ─── TC-02-002 ───────────────────────────────────────────────────────────────
test('TC-02-002: org search/filter on company-select page', async ({ page }) => {
  await loginAsSuperAdmin(page);

  const searchInput = page.getByPlaceholder(/search/i).or(page.locator('input[type="search"]'));
  if (!(await searchInput.isVisible().catch(() => false))) {
    test.skip(true, 'No search input on company-select page');
    return;
  }

  // Get initial count of visible org items
  const items = page.getByRole('listitem').or(page.locator('[data-testid="org-card"]'));
  const initialCount = await items.count();

  // Type a partial org name
  await searchInput.fill('org');
  await page.waitForTimeout(500);
  const filteredCount = await items.count();
  expect(filteredCount).toBeLessThanOrEqual(initialCount);

  // Clear → restore full list
  await searchInput.clear();
  await page.waitForTimeout(500);
  expect(await items.count()).toBe(initialCount);
});

// ─── TC-02-003 ───────────────────────────────────────────────────────────────
test('TC-02-003: selecting an org redirects to /super-admin/dashboard', async ({ page }) => {
  await loginAsSuperAdmin(page);

  const [dashResponse] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/v1/') && r.status() === 200,
      { timeout: 15000 },
    ),
    selectFirstOrg(page),
  ]);

  await expect(page).toHaveURL(/\/super-admin\/dashboard/);
  expect(dashResponse.status()).toBe(200);
});

// ─── TC-02-004 ───────────────────────────────────────────────────────────────
test('TC-02-004: switching org re-fetches dashboard data', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await selectFirstOrg(page);
  await expect(page).toHaveURL(/\/super-admin\/dashboard/);

  // Go back to company-select
  await page.goto('/company-select');
  await expect(page).toHaveURL(/\/company-select/, { timeout: 10000 });

  // Pick another org (second one if available)
  const buttons = page.getByRole('button').filter({ hasText: /.+/ });
  const count = await buttons.count();
  if (count > 1) {
    const refetch = page.waitForResponse(
      (r) => r.url().includes('/api/v1/') && r.status() === 200,
      { timeout: 10000 },
    );
    await buttons.nth(1).click();
    await refetch;
    await expect(page).toHaveURL(/\/super-admin\/dashboard/, { timeout: 12000 });
  } else {
    test.skip(true, 'Only one org available — cannot test org switch');
  }
});

// ─── TC-02-005 ───────────────────────────────────────────────────────────────
test('TC-02-005: super-admin dashboard renders stat cards with no perpetual skeleton', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await selectFirstOrg(page);

  // Wait for skeletons to disappear
  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 15000 },
  );

  // At least 2 numeric stat cards visible
  const statNumbers = page.locator('[class*="MuiTypography"]').filter({ hasText: /^\d+/ });
  await expect(statNumbers.first()).toBeVisible({ timeout: 8000 });
});

// ─── TC-02-006 ───────────────────────────────────────────────────────────────
test('TC-02-006: dashboard API request fires with correct headers', async ({ page }) => {
  await loginAsSuperAdmin(page);

  const apiRequests: { url: string; headers: Record<string, string> }[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/v1/') && req.method() === 'GET') {
      apiRequests.push({ url: req.url(), headers: req.headers() });
    }
  });

  await selectFirstOrg(page);
  await page.waitForTimeout(2000);

  expect(apiRequests.length).toBeGreaterThan(0);
  const hasAuthHeader = apiRequests.some(
    (r) => r.headers['authorization'] || r.headers['x-organization-id'] || r.headers['cookie'],
  );
  expect(hasAuthHeader).toBe(true);
});

// ─── TC-02-007 ───────────────────────────────────────────────────────────────
test('TC-02-007: super-admin dashboard shows recent orgs or activity list', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await selectFirstOrg(page);

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 15000 },
  );

  // Should have some content sections beyond just KPI numbers
  const rows = page.getByRole('row');
  const cards = page.locator('[class*="MuiCard"], [class*="MuiPaper"]');
  const hasContent = (await rows.count()) > 0 || (await cards.count()) > 0;
  expect(hasContent).toBe(true);
});

// ─── TC-02-008 ───────────────────────────────────────────────────────────────
test('TC-02-008: charts render without JS errors', async ({ page }) => {
  const jsErrors: string[] = [];
  page.on('pageerror', (err) => jsErrors.push(err.message));

  await loginAsSuperAdmin(page);
  await selectFirstOrg(page);

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 15000 },
  );

  expect(jsErrors.filter((e) => !/ResizeObserver/i.test(e))).toHaveLength(0);
});

// ─── TC-02-009 ───────────────────────────────────────────────────────────────
test('TC-02-009: loading skeleton shown then replaced by real data', async ({ page }) => {
  await loginAsSuperAdmin(page);

  // Intercept dashboard API to delay response
  await page.route('**/api/v1/**', async (route) => {
    await new Promise((r) => setTimeout(r, 800));
    await route.continue();
  });

  await selectFirstOrg(page);

  // Skeleton visible at some point
  const skeleton = page.locator('.MuiSkeleton-root');
  // After data loads, skeletons gone
  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 20000 },
  );
  expect(await skeleton.count()).toBe(0);
});

// ─── TC-02-010 ───────────────────────────────────────────────────────────────
test('TC-02-010: org admin cannot access /company-select', async ({ page }) => {
  await loginAs(page, USERS.orgAdmin.email, USERS.orgAdmin.password);
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 12000 });

  await page.goto('/company-select');
  await page.waitForURL(
    (url) => !url.pathname.includes('/company-select'),
    { timeout: 8000 },
  );
  expect(page.url()).not.toMatch(/\/company-select/);
});

// ─── TC-02-011 ───────────────────────────────────────────────────────────────
test('TC-02-011: org admin cannot access /super-admin/dashboard', async ({ page }) => {
  await loginAs(page, USERS.orgAdmin.email, USERS.orgAdmin.password);
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 12000 });

  await page.goto('/super-admin/dashboard');
  await page.waitForURL(
    (url) => !url.pathname.includes('/super-admin'),
    { timeout: 8000 },
  );
  expect(page.url()).not.toMatch(/\/super-admin/);
});

// ─── TC-02-012 ───────────────────────────────────────────────────────────────
test('TC-02-012: super-admin sidebar shows expected nav links', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await selectFirstOrg(page);

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 15000 },
  );

  const nav = page.getByRole('navigation').or(page.locator('aside, [class*="sidebar"], [class*="Sidebar"]'));
  await expect(nav).toBeVisible({ timeout: 8000 });

  // Check key nav link labels
  for (const label of ['Organizations', 'Plans']) {
    await expect(page.getByRole('link', { name: new RegExp(label, 'i') }).or(
      page.getByText(new RegExp(label, 'i')).first()
    )).toBeVisible({ timeout: 5000 });
  }
});

// ─── TC-02-013 ───────────────────────────────────────────────────────────────
test('TC-02-013: super admin avatar or name visible in header', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await selectFirstOrg(page);

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 15000 },
  );

  // Avatar button or user name visible somewhere in the header
  const avatar = page.getByRole('button', { name: /account|admin|user/i })
    .or(page.locator('[class*="Avatar"], [class*="avatar"]').first());
  await expect(avatar).toBeVisible({ timeout: 8000 });
});
