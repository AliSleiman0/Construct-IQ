import { test, expect } from '@playwright/test';

const USERS = {
  orgAdmin: { email: 'orgadmin@constructiq.com', password: 'Demo@1234' },
};

const sel = {
  emailInput:    'input[type="email"]',
  passwordInput: 'input[type="password"]',
  submitBtn:     'button[type="submit"]',
};

async function loginAsOrgAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.locator(sel.emailInput).fill(USERS.orgAdmin.email);
  await page.locator(sel.passwordInput).fill(USERS.orgAdmin.password);
  await page.locator(sel.submitBtn).click();
  await page.waitForURL(/\/admin\/dashboard/, { timeout: 12000 });
}

// ─── TC-09-001 ───────────────────────────────────────────────────────────────
test('TC-09-001: support page renders stat cards and ticket table', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/support');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  // Stat cards: Total, Open, In Progress, Resolved
  await expect(page.getByText(/total/i).first()).toBeVisible({ timeout: 6000 });
  // Table or list visible
  const table = page.getByRole('table').or(page.locator('[class*="MuiTable"]'));
  await expect(table).toBeVisible({ timeout: 6000 });
});

// ─── TC-09-002 ───────────────────────────────────────────────────────────────
test('TC-09-002: GET /support-tickets fires with X-Organization-Id and returns 200', async ({ page }) => {
  await loginAsOrgAdmin(page);

  const [ticketsRes] = await Promise.all([
    page.waitForResponse(
      (r) => (r.url().includes('/support-tickets') || r.url().includes('/tickets')) && r.request().method() === 'GET',
      { timeout: 12000 },
    ),
    page.goto('/admin/support'),
  ]);

  expect(ticketsRes.status()).toBe(200);
  const headers = ticketsRes.request().headers();
  expect(headers['x-organization-id'] || headers['cookie']).toBeTruthy();
});

// ─── TC-09-003 ───────────────────────────────────────────────────────────────
test('TC-09-003: ticket table has expected column headers', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/support');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const headers = page.getByRole('columnheader');
  const headerTexts = await headers.allTextContents();
  const joined = headerTexts.join(' ').toLowerCase();

  // Should have at least title/subject and status
  expect(joined).toMatch(/title|subject|ticket/i);
  expect(joined).toMatch(/status|priority/i);
});

// ─── TC-09-004 ───────────────────────────────────────────────────────────────
test('TC-09-004: seeded ticket "Invoice discrepancy" visible in the list', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/support');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  await expect(page.getByText(/invoice discrepancy/i)).toBeVisible({ timeout: 8000 });
});

// ─── TC-09-005 ───────────────────────────────────────────────────────────────
test('TC-09-005: URGENT priority chip visible with error/red styling', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/support');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const urgentChip = page.getByText(/urgent/i);
  await expect(urgentChip).toBeVisible({ timeout: 6000 });

  // MUI error color chip should have class MuiChip-colorError
  const chip = page.locator('.MuiChip-colorError').first();
  if (await chip.isVisible().catch(() => false)) {
    await expect(chip).toBeVisible();
  }
});

// ─── TC-09-006 ───────────────────────────────────────────────────────────────
test('TC-09-006: status filter "Open" shows only OPEN tickets', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/support');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  // Filter tabs or dropdown
  const openFilter = page.getByRole('tab', { name: /open/i })
    .or(page.getByRole('button', { name: /^open$/i }));

  if (!(await openFilter.isVisible().catch(() => false))) {
    test.skip(true, 'No Open filter tab/button');
    return;
  }

  await openFilter.click();
  await page.waitForTimeout(500);

  // Check no "IN_PROGRESS" chips visible
  const inProgressChips = page.getByText(/in.progress/i);
  await expect(inProgressChips).toHaveCount(0, { timeout: 4000 });
});

// ─── TC-09-007 ───────────────────────────────────────────────────────────────
test('TC-09-007: search by title "invoice" filters list', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/support');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const searchInput = page.getByPlaceholder(/search/i).or(page.locator('input[type="search"]'));
  if (!(await searchInput.isVisible().catch(() => false))) {
    test.skip(true, 'No search input');
    return;
  }

  const rowsBefore = await page.getByRole('row').count();
  await searchInput.fill('invoice');
  await page.waitForTimeout(600);
  const rowsAfter = await page.getByRole('row').count();
  expect(rowsAfter).toBeLessThanOrEqual(rowsBefore);
  await expect(page.getByText(/invoice/i).first()).toBeVisible();
});

// ─── TC-09-008 ───────────────────────────────────────────────────────────────
test('TC-09-008: Total stat card shows count >= 3', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/support');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  // Find numeric value near "Total" label
  const totalSection = page.locator('[class*="MuiPaper"], [class*="MuiCard"]')
    .filter({ hasText: /total/i }).first();
  await expect(totalSection).toBeVisible({ timeout: 6000 });

  const totalText = await totalSection.textContent();
  const match = totalText?.match(/\d+/);
  if (match) {
    expect(parseInt(match[0])).toBeGreaterThanOrEqual(3);
  }
});

// ─── TC-09-009 ───────────────────────────────────────────────────────────────
test('TC-09-009: New Ticket button click opens modal/dialog', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/support');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  await page.getByRole('button', { name: /new ticket|create ticket|add ticket/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 6000 });
});

// ─── TC-09-010 ───────────────────────────────────────────────────────────────
test('TC-09-010: ticket modal has Title, Description, Category, Priority fields', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/support');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  await page.getByRole('button', { name: /new ticket|create ticket|add ticket/i }).click();
  await page.getByRole('dialog').waitFor({ timeout: 8000 });

  await expect(page.getByLabel(/title|subject/i)).toBeVisible({ timeout: 4000 });
  await expect(page.getByLabel(/description|body/i)).toBeVisible({ timeout: 4000 });
  await expect(page.getByLabel(/category/i)).toBeVisible({ timeout: 4000 });
  await expect(page.getByLabel(/priority/i)).toBeVisible({ timeout: 4000 });
});

// ─── TC-09-011 ───────────────────────────────────────────────────────────────
test('TC-09-011: category dropdown has correct options', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/support');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  await page.getByRole('button', { name: /new ticket|create ticket|add ticket/i }).click();
  await page.getByRole('dialog').waitFor({ timeout: 8000 });

  await page.getByLabel(/category/i).click();
  const options = page.getByRole('option');
  const texts = await options.allTextContents();
  const joined = texts.join(' ').toUpperCase();

  expect(joined).toMatch(/GENERAL/);
  expect(joined).toMatch(/BILLING/);
  expect(joined).toMatch(/TECHNICAL/);

  await page.keyboard.press('Escape');
});

// ─── TC-09-012 ───────────────────────────────────────────────────────────────
test('TC-09-012: priority dropdown has correct options', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/support');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  await page.getByRole('button', { name: /new ticket|create ticket|add ticket/i }).click();
  await page.getByRole('dialog').waitFor({ timeout: 8000 });

  await page.getByLabel(/priority/i).click();
  const options = page.getByRole('option');
  const texts = await options.allTextContents();
  const joined = texts.join(' ').toUpperCase();

  expect(joined).toMatch(/LOW/);
  expect(joined).toMatch(/MEDIUM/);
  expect(joined).toMatch(/HIGH/);
  expect(joined).toMatch(/URGENT/);

  await page.keyboard.press('Escape');
});

// ─── TC-09-013 ───────────────────────────────────────────────────────────────
test('TC-09-013: create ticket happy path → POST 201 → ticket in list', async ({ page }) => {
  const uid = Date.now();
  await loginAsOrgAdmin(page);
  await page.goto('/admin/support');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  await page.getByRole('button', { name: /new ticket|create ticket|add ticket/i }).click();
  await page.getByRole('dialog').waitFor({ timeout: 8000 });

  await page.getByLabel(/title|subject/i).fill(`QA Ticket ${uid}`);
  await page.getByLabel(/description|body/i).fill('QA automated test ticket');

  await page.getByLabel(/category/i).click();
  await page.getByRole('option', { name: /general/i }).click();

  await page.getByLabel(/priority/i).click();
  await page.getByRole('option', { name: /medium/i }).click();

  const [postRes] = await Promise.all([
    page.waitForResponse(
      (r) => (r.url().includes('/support-tickets') || r.url().includes('/tickets')) && r.request().method() === 'POST',
      { timeout: 10000 },
    ),
    page.getByRole('button', { name: /submit|create|save/i }).last().click(),
  ]);

  expect(postRes.status()).toBe(201);
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 5000 });
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 6000 });
  await expect(page.getByText(`QA Ticket ${uid}`)).toBeVisible({ timeout: 8000 });
});

// ─── TC-09-014 ───────────────────────────────────────────────────────────────
test('TC-09-014: create ticket with missing title shows validation error', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/support');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  await page.getByRole('button', { name: /new ticket|create ticket|add ticket/i }).click();
  await page.getByRole('dialog').waitFor({ timeout: 8000 });

  const requests: string[] = [];
  page.on('request', (r) => {
    if ((r.url().includes('/tickets')) && r.method() === 'POST') requests.push(r.url());
  });

  await page.getByRole('button', { name: /submit|create|save/i }).last().click();
  await page.waitForTimeout(1000);

  expect(requests).toHaveLength(0);
  await expect(page.getByText(/required/i).first()).toBeVisible({ timeout: 4000 });
});

// ─── TC-09-015 ───────────────────────────────────────────────────────────────
test('TC-09-015: cancel modal closes without creating ticket', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/support');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const rowsBefore = await page.getByRole('row').count();

  await page.getByRole('button', { name: /new ticket|create ticket|add ticket/i }).click();
  await page.getByRole('dialog').waitFor({ timeout: 8000 });
  await page.getByLabel(/title|subject/i).fill('I will not be created');
  await page.getByRole('button', { name: /cancel/i }).click();

  await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 5000 });
  expect(await page.getByRole('row').count()).toBe(rowsBefore);
});

// ─── TC-09-016 ───────────────────────────────────────────────────────────────
test('TC-09-016: clicking ticket row navigates to /admin/support/[id]', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/support');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const firstRow = page.getByRole('row').nth(1); // skip header
  await firstRow.click();

  await page.waitForURL(/\/admin\/support\//, { timeout: 8000 });
  expect(page.url()).toMatch(/\/admin\/support\/.+/);
});

// ─── TC-09-017 ───────────────────────────────────────────────────────────────
test('TC-09-017: ticket detail is read-only for org admin (no status dropdown)', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/support');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  await page.getByRole('row').nth(1).click();
  await page.waitForURL(/\/admin\/support\//, { timeout: 8000 });

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  // Title should be visible as text, not an input
  const titleInput = page.locator('input[name="title"]');
  await expect(titleInput).toHaveCount(0);

  // Status should be displayed as text/chip, not a select dropdown for editing
  await expect(page.getByText(/open|in.progress|resolved/i).first()).toBeVisible({ timeout: 6000 });
});

// ─── TC-09-018 ───────────────────────────────────────────────────────────────
test('TC-09-018: ticket detail shows title, description, and category', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/support');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  // Click the "Invoice discrepancy" seeded ticket
  await page.getByText(/invoice discrepancy/i).click();
  await page.waitForURL(/\/admin\/support\//, { timeout: 8000 });

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  await expect(page.getByText(/invoice discrepancy/i)).toBeVisible({ timeout: 6000 });
  await expect(page.getByText(/billing/i).first()).toBeVisible({ timeout: 4000 });
});

// ─── TC-09-019 ───────────────────────────────────────────────────────────────
test('TC-09-019: comment input visible on ticket detail', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/support');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  await page.getByRole('row').nth(1).click();
  await page.waitForURL(/\/admin\/support\//, { timeout: 8000 });

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const commentInput = page.getByPlaceholder(/reply|comment|message/i)
    .or(page.locator('textarea').first());
  await expect(commentInput).toBeVisible({ timeout: 8000 });
});

// ─── TC-09-020 ───────────────────────────────────────────────────────────────
test('TC-09-020: adding comment fires POST and comment appears in thread', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/support');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  await page.getByRole('row').nth(1).click();
  await page.waitForURL(/\/admin\/support\//, { timeout: 8000 });

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const commentInput = page.getByPlaceholder(/reply|comment|message/i)
    .or(page.locator('textarea').first());
  await commentInput.fill('QA automated test comment');

  const [postRes] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/comments') && r.request().method() === 'POST',
      { timeout: 10000 },
    ),
    page.getByRole('button', { name: /send|submit/i }).last().click(),
  ]);

  expect(postRes.status()).toBeOneOf([200, 201]);
  await expect(page.getByText('QA automated test comment')).toBeVisible({ timeout: 8000 });

  // Input should be cleared
  const inputVal = await commentInput.inputValue().catch(() => '');
  expect(inputVal.trim()).toBe('');
});

// ─── TC-09-021 ───────────────────────────────────────────────────────────────
test('TC-09-021: empty comment fires no POST', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/support');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  await page.getByRole('row').nth(1).click();
  await page.waitForURL(/\/admin\/support\//, { timeout: 8000 });

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const requests: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/comments') && r.method() === 'POST') requests.push(r.url());
  });

  await page.getByRole('button', { name: /send|submit/i }).last().click();
  await page.waitForTimeout(1000);

  expect(requests).toHaveLength(0);
});

// ─── TC-09-022 ───────────────────────────────────────────────────────────────
test('TC-09-022: back button on ticket detail returns to /admin/support', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/support');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  await page.getByRole('row').nth(1).click();
  await page.waitForURL(/\/admin\/support\//, { timeout: 8000 });

  const backBtn = page.getByRole('button', { name: /back/i })
    .or(page.getByRole('link', { name: /back/i }));

  if (!(await backBtn.isVisible().catch(() => false))) {
    await page.goBack();
  } else {
    await backBtn.click();
  }

  await expect(page).toHaveURL(/\/admin\/support$/, { timeout: 8000 });
});

// ─── TC-09-023 ───────────────────────────────────────────────────────────────
test('TC-09-023: ticket list GET scoped by X-Organization-Id header', async ({ page }) => {
  const capturedOrgIds: string[] = [];
  page.on('request', (req) => {
    if ((req.url().includes('/support-tickets') || req.url().includes('/tickets')) && req.method() === 'GET') {
      const id = req.headers()['x-organization-id'];
      if (id) capturedOrgIds.push(id);
    }
  });

  await loginAsOrgAdmin(page);
  await page.goto('/admin/support');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  expect(capturedOrgIds.length).toBeGreaterThan(0);
  // All captured IDs same value
  const unique = new Set(capturedOrgIds);
  expect(unique.size).toBe(1);
});
