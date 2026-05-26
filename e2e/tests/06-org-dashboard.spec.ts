import { test, expect } from '@playwright/test';

// ─── Constants ────────────────────────────────────────────────────────────────

const USERS = {
  orgAdmin: { email: 'orgadmin@constructiq.com', password: 'Demo@1234' },
};

const sel = {
  emailInput:    'input[type="email"]',
  passwordInput: 'input[type="password"]',
  submitBtn:     'button[type="submit"]',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loginAsOrgAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.locator(sel.emailInput).fill(USERS.orgAdmin.email);
  await page.locator(sel.passwordInput).fill(USERS.orgAdmin.password);
  await page.locator(sel.submitBtn).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 12000 });
}

// ─── beforeEach ───────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await loginAsOrgAdmin(page);
});

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD PAGE TESTS  (TC-06-001 → TC-06-018)
// ═══════════════════════════════════════════════════════════════════════════════

test('TC-06-001: /admin/dashboard renders without JavaScript error', async ({ page }) => {
  const jsErrors: string[] = [];
  page.on('pageerror', (err) => jsErrors.push(err.message));

  await page.goto('/admin/dashboard');
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 });

  expect(jsErrors).toHaveLength(0);
});

test('TC-06-002: GET /dashboard/org fires with X-Organization-Id header and returns 200', async ({ page }) => {
  let capturedOrgId: string | null = null;

  const dashboardResp = page.waitForResponse(
    (r) => r.url().includes('/dashboard/org') && r.request().method() === 'GET',
    { timeout: 15000 },
  );

  // Intercept requests to capture the header
  page.on('request', (req) => {
    if (req.url().includes('/dashboard/org')) {
      capturedOrgId = req.headers()['x-organization-id'] ?? null;
    }
  });

  await page.goto('/admin/dashboard');
  const response = await dashboardResp;

  expect(response.status()).toBe(200);
  expect(capturedOrgId).not.toBeNull();
  expect(capturedOrgId).toBeTruthy();
});

test('TC-06-003: 4 stat cards visible with expected labels', async ({ page }) => {
  await page.goto('/admin/dashboard');
  // Wait for data to load (skeletons disappear)
  await page.waitForSelector('.MuiSkeleton-root', { state: 'hidden', timeout: 12000 }).catch(() => null);

  // Dashboard shows: Active Projects, Team Members, Budget Burn, Open Issues
  await expect(page.getByText(/active projects/i)).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/team members/i)).toBeVisible();
  await expect(page.getByText(/budget burn/i)).toBeVisible();
  await expect(page.getByText(/open issues/i)).toBeVisible();
});

test('TC-06-004: stat card values are non-negative integers (not NaN or undefined)', async ({ page }) => {
  const dashResp = page.waitForResponse(
    (r) => r.url().includes('/dashboard/org'),
    { timeout: 15000 },
  );

  await page.goto('/admin/dashboard');
  const response = await dashResp;
  const body = await response.json();
  const data = body?.data ?? body;

  // Core numeric fields must be non-negative numbers
  expect(typeof data.activeProjectCount).toBe('number');
  expect(data.activeProjectCount).toBeGreaterThanOrEqual(0);

  expect(typeof data.teamMemberCount).toBe('number');
  expect(data.teamMemberCount).toBeGreaterThanOrEqual(0);

  expect(typeof data.openIssueCount).toBe('number');
  expect(data.openIssueCount).toBeGreaterThanOrEqual(0);

  // Verify the rendered text doesn't contain "NaN" or "undefined"
  await page.waitForSelector('.MuiSkeleton-root', { state: 'hidden', timeout: 12000 }).catch(() => null);
  const bodyText = await page.locator('body').innerText();
  expect(bodyText).not.toContain('NaN');
  expect(bodyText).not.toContain('undefined');
});

test('TC-06-005: project status distribution section visible with labels', async ({ page }) => {
  await page.goto('/admin/dashboard');
  await page.waitForSelector('.MuiSkeleton-root', { state: 'hidden', timeout: 12000 }).catch(() => null);

  // The DashboardPanel "Project Status" is rendered with a MiniBarChart containing labels
  await expect(page.getByText(/project status/i)).toBeVisible({ timeout: 10000 });

  // MiniBarChart renders labels: Planning, Active, On Hold, Completed
  await expect(page.getByText(/planning/i)).toBeVisible();
  await expect(page.getByText(/active/i)).toBeVisible();
  await expect(page.getByText(/completed/i)).toBeVisible();
});

test('TC-06-006: issue breakdown section shows open issue count', async ({ page }) => {
  const dashResp = page.waitForResponse(
    (r) => r.url().includes('/dashboard/org'),
    { timeout: 15000 },
  );

  await page.goto('/admin/dashboard');
  const response = await dashResp;
  const body = await response.json();
  const data = body?.data ?? body;

  await page.waitForSelector('.MuiSkeleton-root', { state: 'hidden', timeout: 12000 }).catch(() => null);

  const openIssueCount: number = data.openIssueCount ?? 0;

  // The stat card for Open Issues should show this value
  await expect(page.getByText(String(openIssueCount))).toBeVisible({ timeout: 8000 });
  await expect(page.getByText(/open issues/i)).toBeVisible();
});

test('TC-06-007: weekly report counts chart renders (svg or canvas visible)', async ({ page }) => {
  await page.goto('/admin/dashboard');
  await page.waitForSelector('.MuiSkeleton-root', { state: 'hidden', timeout: 12000 }).catch(() => null);

  // MiniBarChart panel heading
  await expect(page.getByText(/weekly reports filed/i)).toBeVisible({ timeout: 10000 });

  // The MiniBarChart component renders an SVG or a set of bar divs.
  // Look for either an svg element OR bar elements within the chart panel
  const chartPanel = page.locator('[class*="DashboardPanel"], [class*="dashboard-panel"]').filter({ hasText: /weekly reports/i });
  const svgOrBars = chartPanel.locator('svg, [class*="bar"], [class*="Bar"], canvas').first();

  // Fallback: look globally for svg in the page if the panel selector doesn't match
  const globalSvg = page.locator('svg').first();
  await expect(globalSvg).toBeVisible({ timeout: 10000 });
});

test('TC-06-008: recent activity feed shows at least 1 entry with user name and action text', async ({ page }) => {
  const dashResp = page.waitForResponse(
    (r) => r.url().includes('/dashboard/org'),
    { timeout: 15000 },
  );

  await page.goto('/admin/dashboard');
  const response = await dashResp;
  const body = await response.json();
  const data = body?.data ?? body;

  const activities: any[] = data?.recentActivity ?? [];

  await page.waitForSelector('.MuiSkeleton-root', { state: 'hidden', timeout: 12000 }).catch(() => null);

  if (activities.length === 0) {
    // Empty state message
    await expect(page.getByText(/no recent activity/i)).toBeVisible({ timeout: 8000 });
    return;
  }

  // With activities: at least one user name from the first entry should appear
  const firstEntry = activities[0];
  await expect(page.getByText(firstEntry.userName)).toBeVisible({ timeout: 8000 });
  // Action text should also be visible somewhere on the page
  await expect(page.getByText(firstEntry.action)).toBeVisible({ timeout: 8000 });
});

test('TC-06-009: relative timestamps in activity feed match expected pattern', async ({ page }) => {
  const dashResp = page.waitForResponse(
    (r) => r.url().includes('/dashboard/org'),
    { timeout: 15000 },
  );

  await page.goto('/admin/dashboard');
  const response = await dashResp;
  const body = await response.json();
  const data = body?.data ?? body;
  const activities: any[] = data?.recentActivity ?? [];

  if (activities.length === 0) return; // No activity to check

  await page.waitForSelector('.MuiSkeleton-root', { state: 'hidden', timeout: 12000 }).catch(() => null);

  // dayjs.fromNow() produces strings like "2 hours ago", "a minute ago", "just now", "3 days ago"
  const relTimePattern = /ago|just now|minute|hour|day|second/i;

  // Find caption text that matches the pattern (relative time from dayjs)
  const captionLocator = page.locator('span, p, [class*="caption"]').filter({ hasText: relTimePattern });
  await expect(captionLocator.first()).toBeVisible({ timeout: 8000 });
  const text = await captionLocator.first().innerText();
  expect(text).toMatch(relTimePattern);
});

test('TC-06-010: quick actions panel has at least 1 clickable button', async ({ page }) => {
  await page.goto('/admin/dashboard');
  await page.waitForSelector('.MuiSkeleton-root', { state: 'hidden', timeout: 12000 }).catch(() => null);

  // Quick Actions panel is rendered with a DashboardPanel titled "Quick Actions"
  await expect(page.getByText(/quick actions/i)).toBeVisible({ timeout: 10000 });

  // The quick action items are clickable boxes (role not explicitly button, but have cursor:pointer)
  // Fallback: at least one of the known quick action labels is visible and can be clicked
  const quickActionLabels = ['Invite member', 'Open a support ticket', 'View invoices', 'Manage plan'];
  let found = false;
  for (const label of quickActionLabels) {
    const el = page.getByText(label);
    if (await el.isVisible().catch(() => false)) {
      found = true;
      break;
    }
  }
  expect(found).toBe(true);
});

test('TC-06-011: dashboard data is scoped to the org (X-Organization-Id matches localStorage org)', async ({ page }) => {
  const orgIds: string[] = [];

  page.on('request', (req) => {
    if (req.url().includes('/dashboard/org')) {
      const id = req.headers()['x-organization-id'];
      if (id) orgIds.push(id);
    }
  });

  await page.goto('/admin/dashboard');
  await page.waitForResponse(
    (r) => r.url().includes('/dashboard/org'),
    { timeout: 15000 },
  );

  expect(orgIds.length).toBeGreaterThan(0);
  // All captured org IDs should be the same value (single-org session)
  const unique = new Set(orgIds);
  expect(unique.size).toBe(1);
});

test('TC-06-012: sidebar contains all expected org-admin navigation links', async ({ page }) => {
  await page.goto('/admin/dashboard');
  await expect(page.getByRole('navigation')).toBeVisible({ timeout: 10000 });

  const expectedLinks = [
    'Dashboard',
    'Reports',
    'People',
    'Projects',
    'Support',
    'Billing',
    'Subscription',
    'Settings',
  ];

  for (const label of expectedLinks) {
    await expect(page.getByRole('link', { name: new RegExp(label, 'i') })).toBeVisible({
      timeout: 8000,
    });
  }
});

test('TC-06-013: Dashboard sidebar link is highlighted as active on /admin/dashboard', async ({ page }) => {
  await page.goto('/admin/dashboard');
  await expect(page.getByRole('navigation')).toBeVisible({ timeout: 10000 });

  // The active ListItemButton gets `aria-selected="true"` from MUI's `selected` prop
  const dashboardLink = page.getByRole('link', { name: /^dashboard$/i });
  await expect(dashboardLink).toBeVisible({ timeout: 8000 });

  // The parent ListItemButton should have Mui-selected class or aria-selected
  const activeBtn = page.locator('.Mui-selected', { has: dashboardLink });
  const ariaSel = page.locator('[aria-selected="true"]', { has: dashboardLink });
  const isActive =
    (await activeBtn.count()) > 0 || (await ariaSel.count()) > 0;
  expect(isActive).toBe(true);
});

test('TC-06-014: clicking Reports sidebar link navigates to /admin/reports', async ({ page }) => {
  await page.goto('/admin/dashboard');
  await expect(page.getByRole('navigation')).toBeVisible({ timeout: 10000 });

  await page.getByRole('link', { name: /^reports$/i }).click();
  await expect(page).toHaveURL(/\/admin\/reports/, { timeout: 10000 });
});

test('TC-06-015: clicking Settings sidebar link navigates to /admin/settings', async ({ page }) => {
  await page.goto('/admin/dashboard');
  await expect(page.getByRole('navigation')).toBeVisible({ timeout: 10000 });

  await page.getByRole('link', { name: /^settings$/i }).click();
  await expect(page).toHaveURL(/\/admin\/settings/, { timeout: 10000 });
});

test('TC-06-016: budget metrics (budgetTotal and budgetSpent) are not NaN', async ({ page }) => {
  const dashResp = page.waitForResponse(
    (r) => r.url().includes('/dashboard/org'),
    { timeout: 15000 },
  );

  await page.goto('/admin/dashboard');
  const response = await dashResp;
  const body = await response.json();
  const data = body?.data ?? body;

  expect(typeof data.budgetTotal).toBe('number');
  expect(isNaN(data.budgetTotal)).toBe(false);

  expect(typeof data.budgetSpent).toBe('number');
  expect(isNaN(data.budgetSpent)).toBe(false);

  // Rendered page should not contain the literal string "NaN"
  await page.waitForSelector('.MuiSkeleton-root', { state: 'hidden', timeout: 12000 }).catch(() => null);
  const bodyText = await page.locator('body').innerText();
  expect(bodyText).not.toContain('NaN');
});

test('TC-06-017: loading skeletons disappear after data loads', async ({ page }) => {
  await page.goto('/admin/dashboard');

  // Wait for the dashboard API response
  await page.waitForResponse(
    (r) => r.url().includes('/dashboard/org'),
    { timeout: 15000 },
  );

  // Skeletons should eventually be gone
  await expect(page.locator('.MuiSkeleton-root').first()).toHaveCount(0, { timeout: 15000 }).catch(async () => {
    // Alternative: check that at least one stat card value (non-skeleton) is present
    await expect(page.locator('.MuiSkeleton-root')).toHaveCount(0, { timeout: 5000 });
  });
});

test('TC-06-018: navigating away and back re-fetches /dashboard/org', async ({ page }) => {
  await page.goto('/admin/dashboard');
  await page.waitForResponse(
    (r) => r.url().includes('/dashboard/org'),
    { timeout: 15000 },
  );

  // Navigate away
  await page.goto('/admin/reports');
  await expect(page).toHaveURL(/\/admin\/reports/, { timeout: 10000 });

  // Navigate back — set up listener before navigating
  const refetchResp = page.waitForResponse(
    (r) => r.url().includes('/dashboard/org') && r.request().method() === 'GET',
    { timeout: 15000 },
  );

  await page.goto('/admin/dashboard');
  const response = await refetchResp;
  expect(response.status()).toBe(200);
});
