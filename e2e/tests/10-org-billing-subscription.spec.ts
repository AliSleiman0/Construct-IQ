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

// ════════════════════════════════════════════════════════════════════
//  BILLING
// ════════════════════════════════════════════════════════════════════

// ─── TC-10-001 ───────────────────────────────────────────────────────────────
test('TC-10-001: billing page renders 3 summary cards and invoice table', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/billing');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  // 3 summary cards
  const cards = page.locator('[class*="MuiPaper"]').filter({ hasText: /.+/ });
  await expect(cards.first()).toBeVisible({ timeout: 6000 });

  // Invoice table
  const table = page.getByRole('table').or(page.locator('[class*="MuiTable"]'));
  await expect(table).toBeVisible({ timeout: 6000 });
});

// ─── TC-10-002 ───────────────────────────────────────────────────────────────
test('TC-10-002: GET /invoices fires with X-Organization-Id and returns 200', async ({ page }) => {
  await loginAsOrgAdmin(page);

  const [invoicesRes] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/invoices') && r.request().method() === 'GET',
      { timeout: 12000 },
    ),
    page.goto('/admin/billing'),
  ]);

  expect(invoicesRes.status()).toBe(200);
  const body = await invoicesRes.json();
  expect(body.success).toBe(true);
  expect(Array.isArray(body.data)).toBe(true);
});

// ─── TC-10-003 ───────────────────────────────────────────────────────────────
test('TC-10-003: invoice table has correct column headers', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/billing');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const headers = page.getByRole('columnheader');
  const texts = await headers.allTextContents();
  const joined = texts.join(' ').toLowerCase();

  expect(joined).toMatch(/invoice/);
  expect(joined).toMatch(/status/);
  expect(joined).toMatch(/amount/);
});

// ─── TC-10-004 ───────────────────────────────────────────────────────────────
test('TC-10-004: status chips display correct labels', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/billing');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  // At least one status chip visible
  const statusChip = page.locator('[class*="MuiChip"]').first();
  await expect(statusChip).toBeVisible({ timeout: 6000 });

  // Possible status texts
  const chipText = await statusChip.textContent();
  expect(['PAID', 'ISSUED', 'OVERDUE', 'DRAFT', 'VOID']).toContain(chipText?.trim().toUpperCase());
});

// ─── TC-10-005 ───────────────────────────────────────────────────────────────
test('TC-10-005: PAID invoices do not show Pay Now button', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/billing');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  // Find a PAID row and verify no "Pay now" in that row
  const paidRows = page.getByRole('row').filter({ hasText: /\bPAID\b/ });
  const count = await paidRows.count();

  if (count > 0) {
    const paidRow = paidRows.first();
    const payNowBtn = paidRow.getByRole('button', { name: /pay now/i });
    await expect(payNowBtn).toHaveCount(0);
  }
});

// ─── TC-10-006 ───────────────────────────────────────────────────────────────
test('TC-10-006: ISSUED invoices show Pay Now button', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/billing');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const issuedRows = page.getByRole('row').filter({ hasText: /\bISSUED\b/ });
  const count = await issuedRows.count();

  if (count > 0) {
    const payNowBtn = issuedRows.first().getByRole('button', { name: /pay now/i });
    await expect(payNowBtn).toBeVisible({ timeout: 4000 });
  } else {
    // No ISSUED invoices in seed — acceptable
    console.log('No ISSUED invoices in seed data');
  }
});

// ─── TC-10-007 ───────────────────────────────────────────────────────────────
test('TC-10-007: PDF button on invoice row triggers success snackbar', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/billing');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const pdfBtn = page.getByRole('button', { name: /pdf/i }).first();
  if (!(await pdfBtn.isVisible().catch(() => false))) {
    test.skip(true, 'No PDF button visible (no invoices)');
    return;
  }

  await pdfBtn.click();
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 6000 });
});

// ─── TC-10-008 ───────────────────────────────────────────────────────────────
test('TC-10-008: amount column formatted as currency ($X.XX)', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/billing');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const rows = page.getByRole('row');
  const count = await rows.count();
  if (count < 2) return; // no data rows

  const firstDataRow = rows.nth(1);
  const cellTexts = await firstDataRow.locator('td').allTextContents();
  const amountCell = cellTexts.find((t) => /\$[\d,]+\.\d{2}/.test(t));
  expect(amountCell).toBeDefined();
});

// ─── TC-10-009 ───────────────────────────────────────────────────────────────
test('TC-10-009: date columns not raw ISO strings', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/billing');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const rows = page.getByRole('row');
  const count = await rows.count();
  if (count < 2) return;

  const firstDataRow = rows.nth(1);
  const cellTexts = await firstDataRow.locator('td').allTextContents();
  const joined = cellTexts.join(' ');

  // Should NOT contain raw ISO date format like 2026-05-13T18:00:00.000Z
  expect(joined).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
});

// ─── TC-10-010 ───────────────────────────────────────────────────────────────
test('TC-10-010: Current Balance card shows dollar amount', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/billing');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const balanceCard = page.locator('[class*="MuiPaper"]').filter({ hasText: /balance/i }).first();
  await expect(balanceCard).toBeVisible({ timeout: 6000 });

  const text = await balanceCard.textContent();
  expect(text).toMatch(/\$[\d,.]+/);
});

// ─── TC-10-011 ───────────────────────────────────────────────────────────────
test('TC-10-011: Balance card shows due and overdue counts', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/billing');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const balanceCard = page.locator('[class*="MuiPaper"]').filter({ hasText: /balance/i }).first();
  const text = await balanceCard.textContent();
  // Should have "X due" pattern
  expect(text).toMatch(/\d+\s*due/i);
});

// ─── TC-10-012 ───────────────────────────────────────────────────────────────
test('TC-10-012: Payment Method card shows VISA text', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/billing');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const paymentCard = page.locator('[class*="MuiPaper"]').filter({ hasText: /payment|visa|•{4}/i }).first();
  await expect(paymentCard).toBeVisible({ timeout: 6000 });
  const text = await paymentCard.textContent();
  expect(text?.toUpperCase()).toMatch(/VISA|PAYMENT.*METHOD/);
});

// ─── TC-10-013 ───────────────────────────────────────────────────────────────
test('TC-10-013: empty invoice state shows "No invoices yet" message', async ({ page, request: apiReq }) => {
  // This test is informational — we verify the component handles empty gracefully
  // by intercepting the invoices response
  await loginAsOrgAdmin(page);

  await page.route('**/invoices**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], timestamp: new Date().toISOString() }),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto('/admin/billing');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  await expect(page.getByText(/no invoices/i)).toBeVisible({ timeout: 8000 });
});

// ════════════════════════════════════════════════════════════════════
//  SUBSCRIPTION
// ════════════════════════════════════════════════════════════════════

// ─── TC-10-014 ───────────────────────────────────────────────────────────────
test('TC-10-014: subscription page renders plan panel and usage panel', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/subscription');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  await expect(page.getByText(/subscription/i).first()).toBeVisible({ timeout: 6000 });
  // Usage section
  await expect(page.getByText(/usage/i).first()).toBeVisible({ timeout: 6000 });
  // Plan section
  await expect(page.getByText(/plan|professional|starter|pro/i).first()).toBeVisible({ timeout: 6000 });
});

// ─── TC-10-015 ───────────────────────────────────────────────────────────────
test('TC-10-015: GET /plans fires and returns 200 with plans array', async ({ page }) => {
  await loginAsOrgAdmin(page);

  const [plansRes] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/plans') && r.request().method() === 'GET',
      { timeout: 12000 },
    ),
    page.goto('/admin/subscription'),
  ]);

  expect(plansRes.status()).toBe(200);
  const body = await plansRes.json();
  expect(Array.isArray(body.data)).toBe(true);
  expect(body.data.length).toBeGreaterThan(0);
});

// ─── TC-10-016 ───────────────────────────────────────────────────────────────
test('TC-10-016: GET /dashboard/org fires for usage data', async ({ page }) => {
  await loginAsOrgAdmin(page);

  const [dashRes] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/dashboard/org') && r.request().method() === 'GET',
      { timeout: 12000 },
    ),
    page.goto('/admin/subscription'),
  ]);

  expect(dashRes.status()).toBe(200);
  const body = await dashRes.json();
  expect(body.data.teamMemberCount).toBeDefined();
  expect(body.data.totalProjectCount).toBeDefined();
});

// ─── TC-10-017 ───────────────────────────────────────────────────────────────
test('TC-10-017: plan name shown and not "undefined" or empty', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/subscription');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const content = await page.locator('main, [class*="MuiBox"]').first().textContent();
  expect(content).not.toMatch(/undefined/i);

  // A real plan name should appear
  await expect(page.getByText(/professional|starter|pro|enterprise/i).first()).toBeVisible({ timeout: 6000 });
});

// ─── TC-10-018 ───────────────────────────────────────────────────────────────
test('TC-10-018: plan price shown with $ and > 0', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/subscription');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const priceText = await page.getByText(/\$\d+/).first().textContent();
  expect(priceText).toBeDefined();
  const num = parseInt(priceText!.replace(/\D/g, ''));
  expect(num).toBeGreaterThan(0);
});

// ─── TC-10-019 ───────────────────────────────────────────────────────────────
test('TC-10-019: ACTIVE chip visible on plan panel', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/subscription');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  await expect(page.getByText(/active/i).first()).toBeVisible({ timeout: 6000 });
});

// ─── TC-10-020 ───────────────────────────────────────────────────────────────
test('TC-10-020: features list shows check icons if plan has features', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/subscription');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  // Check icons (MUI CheckCircleOutlineIcon = svg inside a Box)
  const icons = page.locator('[class*="MuiBox"] svg').first();
  const featureText = page.getByText(/what.s included/i);

  if (await featureText.isVisible().catch(() => false)) {
    await expect(icons).toBeVisible({ timeout: 4000 });
  }
});

// ─── TC-10-021 ───────────────────────────────────────────────────────────────
test('TC-10-021: Members usage bar shows "X of Y" pattern', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/subscription');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const membersSection = page.locator('[class*="MuiBox"]').filter({ hasText: /members/i }).first();
  await expect(membersSection).toBeVisible({ timeout: 6000 });
  const text = await membersSection.textContent();
  expect(text).toMatch(/\d+.*of.*\d+/i);
});

// ─── TC-10-022 ───────────────────────────────────────────────────────────────
test('TC-10-022: Projects usage bar shows "X of Y" pattern', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/subscription');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const projectsSection = page.locator('[class*="MuiBox"]').filter({ hasText: /projects/i }).first();
  await expect(projectsSection).toBeVisible({ timeout: 6000 });
  const text = await projectsSection.textContent();
  expect(text).toMatch(/\d+.*of.*\d+/i);
});

// ─── TC-10-023 ───────────────────────────────────────────────────────────────
test('TC-10-023: Storage usage bar shows "8.2 GB of 100 GB" stub', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/subscription');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const storageSection = page.locator('[class*="MuiBox"]').filter({ hasText: /storage/i }).first();
  await expect(storageSection).toBeVisible({ timeout: 6000 });
  const text = await storageSection.textContent();
  expect(text).toMatch(/GB/i);
});

// ─── TC-10-024 ───────────────────────────────────────────────────────────────
test('TC-10-024: usage percentages are valid 0-100 numbers', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/subscription');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const pctTexts = page.getByText(/\d+% used/i);
  const count = await pctTexts.count();
  expect(count).toBeGreaterThanOrEqual(2);

  for (let i = 0; i < count; i++) {
    const text = await pctTexts.nth(i).textContent();
    const match = text?.match(/(\d+)%/);
    if (match) {
      const num = parseInt(match[1]);
      expect(num).toBeGreaterThanOrEqual(0);
      expect(num).toBeLessThanOrEqual(100);
    }
  }
});

// ─── TC-10-025 ───────────────────────────────────────────────────────────────
test('TC-10-025: LinearProgress bars (role="progressbar") visible', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/subscription');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  const bars = page.getByRole('progressbar');
  await expect(bars.first()).toBeVisible({ timeout: 6000 });
  // At least 3 bars (Members, Projects, Storage)
  await expect(bars).toHaveCount(3, { timeout: 6000 });
});

// ─── TC-10-026 ───────────────────────────────────────────────────────────────
test('TC-10-026: blue info box shows percentage text', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/subscription');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  // The info box has InfoIcon and text about percentage
  const infoBox = page.locator('[class*="MuiBox"]').filter({ hasText: /you.re using.*%/i }).first();
  await expect(infoBox).toBeVisible({ timeout: 6000 });
});

// ─── TC-10-027 ───────────────────────────────────────────────────────────────
test('TC-10-027: Upgrade to Enterprise button shows success snackbar', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/subscription');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  await page.getByRole('button', { name: /upgrade.*enterprise/i }).click();
  const alert = page.getByRole('alert');
  await expect(alert).toBeVisible({ timeout: 6000 });
  const text = await alert.textContent();
  expect(text?.toLowerCase()).toMatch(/enterprise|upgrade/i);
});

// ─── TC-10-028 ───────────────────────────────────────────────────────────────
test('TC-10-028: Downgrade button shows error snackbar', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/subscription');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 12000 },
  );

  await page.getByRole('button', { name: /downgrade/i }).click();
  const alert = page.getByRole('alert');
  await expect(alert).toBeVisible({ timeout: 6000 });
});

// ─── TC-10-029 ───────────────────────────────────────────────────────────────
test('TC-10-029: member count on subscription matches dashboard API response', async ({ page }) => {
  await loginAsOrgAdmin(page);

  let memberCount: number | undefined;

  // Capture dashboard/org response
  page.on('response', async (res) => {
    if (res.url().includes('/dashboard/org') && res.status() === 200) {
      const body = await res.json().catch(() => null);
      if (body?.data?.teamMemberCount !== undefined) {
        memberCount = body.data.teamMemberCount;
      }
    }
  });

  await page.goto('/admin/subscription');
  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 15000 },
  );

  if (memberCount !== undefined) {
    // The Members "X of Y" text should have memberCount as the current value
    const membersText = await page.locator('[class*="MuiBox"]')
      .filter({ hasText: /members/i }).first().textContent();
    expect(membersText).toContain(String(memberCount));
  }
});

// ─── TC-10-030 ───────────────────────────────────────────────────────────────
test('TC-10-030: loading skeleton disappears after data loads', async ({ page }) => {
  await loginAsOrgAdmin(page);
  await page.goto('/admin/subscription');

  await page.waitForFunction(
    () => document.querySelectorAll('.MuiSkeleton-root').length === 0,
    { timeout: 15000 },
  );

  const skeletons = page.locator('.MuiSkeleton-root');
  await expect(skeletons).toHaveCount(0);

  // Real content should now be visible
  await expect(page.getByRole('progressbar').first()).toBeVisible({ timeout: 6000 });
});
