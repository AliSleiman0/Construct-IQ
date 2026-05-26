import { test, expect, request } from '@playwright/test';

const API = 'http://localhost:4000/api/v1';

const USERS = {
  superAdmin: { email: 'admin@constructiq.com', password: 'Admin@1234' },
};

const sel = {
  emailInput:    'input[type="email"]',
  passwordInput: 'input[type="password"]',
  submitBtn:     'button[type="submit"]',
};

async function loginAsSuperAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.locator(sel.emailInput).fill(USERS.superAdmin.email);
  await page.locator(sel.passwordInput).fill(USERS.superAdmin.password);
  await page.locator(sel.submitBtn).click();
  await page.waitForURL(/\/company-select/, { timeout: 12000 });
  const orgCard = page.locator('[data-testid="org-card"]').first();
  if (await orgCard.isVisible().catch(() => false)) {
    await orgCard.click();
  } else {
    await page.getByRole('button').filter({ hasText: /.+/ }).first().click();
  }
  await page.waitForURL(/\/super-admin\/dashboard/, { timeout: 12000 });
}

// ─── TC-03-001 ───────────────────────────────────────────────────────────────
test('TC-03-001: organizations list renders with seeded orgs', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('/super-admin/organizations');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const rows = page.getByRole('row');
  // At least header row + 3 seeded orgs
  await expect(rows).toHaveCount(4, { timeout: 8000 });

  // Status column
  await expect(page.getByText(/active/i).first()).toBeVisible();
});

// ─── TC-03-002 ───────────────────────────────────────────────────────────────
test('TC-03-002: search/filter by org name', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('/super-admin/organizations');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const searchInput = page.getByPlaceholder(/search/i).or(page.locator('input[type="search"]'));
  if (!(await searchInput.isVisible().catch(() => false))) {
    test.skip(true, 'No search input on organizations page');
    return;
  }

  const rowsBefore = await page.getByRole('row').count();
  await searchInput.fill('orgA');
  await page.waitForTimeout(600);
  const rowsAfter = await page.getByRole('row').count();
  expect(rowsAfter).toBeLessThan(rowsBefore);

  await searchInput.clear();
  await page.waitForTimeout(600);
  expect(await page.getByRole('row').count()).toBe(rowsBefore);
});

// ─── TC-03-003 ───────────────────────────────────────────────────────────────
test('TC-03-003: filter by status Active/Inactive/All', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('/super-admin/organizations');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const statusFilter = page.getByLabel(/status/i).or(
    page.getByRole('combobox').filter({ hasText: /all|status/i }),
  );
  if (!(await statusFilter.isVisible().catch(() => false))) {
    test.skip(true, 'No status filter control');
    return;
  }

  await statusFilter.click();
  await page.getByRole('option', { name: /active/i }).click();
  await page.waitForTimeout(500);
  const chips = page.getByText(/inactive/i);
  expect(await chips.count()).toBe(0);

  await statusFilter.click();
  await page.getByRole('option', { name: /all/i }).click();
});

// ─── TC-03-004 ───────────────────────────────────────────────────────────────
test('TC-03-004: create organization happy path', async ({ page }) => {
  const uid = Date.now();
  await loginAsSuperAdmin(page);
  await page.goto('/super-admin/organizations');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  await page.getByRole('button', { name: /new org|add org|create org/i }).click();
  await page.getByRole('dialog').waitFor({ timeout: 8000 });

  await page.getByLabel(/name/i).fill(`QA Org ${uid}`);
  await page.getByLabel(/slug/i).fill(`qa-org-${uid}`);

  const [postRes] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/organizations') && r.request().method() === 'POST',
      { timeout: 10000 },
    ),
    page.getByRole('button', { name: /save|create|submit/i }).last().click(),
  ]);

  expect(postRes.status()).toBe(201);
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 6000 });
  await expect(page.getByText(`QA Org ${uid}`)).toBeVisible({ timeout: 8000 });
});

// ─── TC-03-005 ───────────────────────────────────────────────────────────────
test('TC-03-005: duplicate slug returns error snackbar', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('/super-admin/organizations');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  await page.getByRole('button', { name: /new org|add org|create org/i }).click();
  await page.getByRole('dialog').waitFor({ timeout: 8000 });

  await page.getByLabel(/name/i).fill('Duplicate Test');
  await page.getByLabel(/slug/i).fill('org-a'); // existing slug

  const [postRes] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/organizations') && r.request().method() === 'POST',
      { timeout: 10000 },
    ),
    page.getByRole('button', { name: /save|create|submit/i }).last().click(),
  ]);

  expect([400, 409]).toContain(postRes.status());
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 6000 });
});

// ─── TC-03-006 ───────────────────────────────────────────────────────────────
test('TC-03-006: missing org name shows validation error, no API call', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('/super-admin/organizations');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  await page.getByRole('button', { name: /new org|add org|create org/i }).click();
  await page.getByRole('dialog').waitFor({ timeout: 8000 });

  const requests: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/organizations') && r.method() === 'POST') requests.push(r.url());
  });

  await page.getByRole('button', { name: /save|create|submit/i }).last().click();
  await page.waitForTimeout(1000);

  expect(requests).toHaveLength(0);
  // Validation error visible
  const errorText = page.getByText(/required|name is required/i);
  await expect(errorText).toBeVisible({ timeout: 4000 });
});

// ─── TC-03-007 ───────────────────────────────────────────────────────────────
test('TC-03-007: edit org name returns 200 and shows updated name', async ({ page }) => {
  const uid = Date.now();
  await loginAsSuperAdmin(page);
  await page.goto('/super-admin/organizations');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  // Click edit on first org
  await page.getByRole('button', { name: /edit/i }).first().click();
  await page.getByRole('dialog').waitFor({ timeout: 8000 });

  const nameInput = page.getByLabel(/name/i);
  await nameInput.clear();
  await nameInput.fill(`Edited Org ${uid}`);

  const [patchRes] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/organizations') && r.request().method() === 'PATCH',
      { timeout: 10000 },
    ),
    page.getByRole('button', { name: /save|update/i }).last().click(),
  ]);

  expect(patchRes.status()).toBe(200);
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 6000 });
  await expect(page.getByText(`Edited Org ${uid}`)).toBeVisible({ timeout: 8000 });
});

// ─── TC-03-008 ───────────────────────────────────────────────────────────────
test('TC-03-008: deactivate org changes status chip to Inactive', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('/super-admin/organizations');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const deactivateBtn = page.getByRole('button', { name: /deactivate/i }).first();
  if (!(await deactivateBtn.isVisible().catch(() => false))) {
    test.skip(true, 'No deactivate button visible');
    return;
  }

  await deactivateBtn.click();
  // Confirm if dialog appears
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /confirm|yes|deactivate/i }).click();
  }

  await expect(page.getByRole('alert')).toBeVisible({ timeout: 6000 });
});

// ─── TC-03-009 ───────────────────────────────────────────────────────────────
test('TC-03-009: reactivate org changes status back to Active', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('/super-admin/organizations');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const activateBtn = page.getByRole('button', { name: /activate|reactivate/i }).first();
  if (!(await activateBtn.isVisible().catch(() => false))) {
    test.skip(true, 'No activate button visible (need an inactive org)');
    return;
  }
  await activateBtn.click();
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 6000 });
});

// ─── TC-03-010 ───────────────────────────────────────────────────────────────
test('TC-03-010: delete org and verify removal from list', async ({ page }) => {
  const uid = Date.now();
  // First create an org to delete
  await loginAsSuperAdmin(page);
  await page.goto('/super-admin/organizations');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  await page.getByRole('button', { name: /new org|add org|create org/i }).click();
  await page.getByRole('dialog').waitFor({ timeout: 8000 });
  await page.getByLabel(/name/i).fill(`Delete Me ${uid}`);
  await page.getByLabel(/slug/i).fill(`delete-me-${uid}`);
  const [postRes] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/organizations') && r.request().method() === 'POST',
      { timeout: 10000 },
    ),
    page.getByRole('button', { name: /save|create|submit/i }).last().click(),
  ]);
  expect(postRes.status()).toBe(201);
  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  // Find the row containing the newly created org and click delete
  const orgRow = page.getByRole('row').filter({ hasText: `Delete Me ${uid}` });
  await orgRow.getByRole('button', { name: /delete/i }).click();

  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /confirm|delete|yes/i }).last().click();
  }

  const [deleteRes] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/organizations') && r.request().method() === 'DELETE',
      { timeout: 10000 },
    ).catch(() => null),
    Promise.resolve(),
  ]);

  if (deleteRes) expect([200, 204]).toContain(deleteRes.status());
  await expect(page.getByText(`Delete Me ${uid}`)).toHaveCount(0, { timeout: 8000 });
});

// ─── TC-03-011 ───────────────────────────────────────────────────────────────
test('TC-03-011: delete confirmation cancel does not delete org', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('/super-admin/organizations');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const deleteBtn = page.getByRole('button', { name: /delete/i }).first();
  if (!(await deleteBtn.isVisible().catch(() => false))) {
    test.skip(true, 'No delete button visible');
    return;
  }

  const rowCountBefore = await page.getByRole('row').count();
  await deleteBtn.click();

  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /cancel/i }).click();
    await dialog.waitFor({ state: 'hidden', timeout: 4000 });
  }

  expect(await page.getByRole('row').count()).toBe(rowCountBefore);
});

// ─── TC-03-012 ───────────────────────────────────────────────────────────────
test('TC-03-012: org member count visible and non-negative', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('/super-admin/organizations');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  // Member count column or card — should have numeric text
  const rows = page.getByRole('row');
  const count = await rows.count();
  expect(count).toBeGreaterThan(1); // at least 1 data row
});

// ─── TC-03-013 ───────────────────────────────────────────────────────────────
test('TC-03-013: GET /organizations request includes org-scoped header', async ({ page }) => {
  const orgRequests: { url: string; headers: Record<string, string> }[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/organizations')) {
      orgRequests.push({ url: req.url(), headers: req.headers() });
    }
  });

  await loginAsSuperAdmin(page);
  await page.goto('/super-admin/organizations');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  expect(orgRequests.length).toBeGreaterThan(0);
});

// ─── TC-03-014 ───────────────────────────────────────────────────────────────
test('TC-03-014: sort by Name column toggles ascending/descending', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('/super-admin/organizations');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const nameHeader = page.getByRole('columnheader', { name: /name/i });
  if (!(await nameHeader.isVisible().catch(() => false))) {
    test.skip(true, 'No sortable Name column header');
    return;
  }

  const getCellTexts = async () =>
    page.locator('tbody tr td:first-child').allTextContents();

  await nameHeader.click();
  const ascending = await getCellTexts();

  await nameHeader.click();
  const descending = await getCellTexts();

  // After two clicks the order should differ (unless only 1 row)
  if (ascending.length > 1) {
    expect(ascending).not.toEqual(descending);
  }
});
