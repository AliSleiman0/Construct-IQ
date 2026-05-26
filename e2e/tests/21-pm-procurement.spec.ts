import { test, expect } from '@playwright/test';
import {
  USERS, fillLogin, apiLogin, seedProject, deleteProject,
  seedSupplier, seedPO, type ApiSession,
} from './helpers';

// Procurement: PM read + approve (/pm/procurement tabs) vs PROCUREMENT manage (/procurement/*).
let pm: ApiSession;
let proc: ApiSession;
let project: { id: string; name: string };
let supplierName = '';
let po: { id: string; poNumber: string };

test.beforeAll(async () => {
  pm = await apiLogin(USERS.pm.email, USERS.pm.password);
  proc = await apiLogin(USERS.procurement.email, USERS.procurement.password);

  project = await seedProject(pm, { name: `E2E Proc ${Date.now()}` });
  supplierName = `E2E Supplier ${Date.now()}`;
  const supplierId = await seedSupplier(proc, supplierName);
  po = await seedPO(proc, { projectId: project.id, supplierId, status: 'SUBMITTED' });
});

test.afterAll(async () => {
  await deleteProject(pm, project.id);
  await pm.ctx.dispose();
  await proc.ctx.dispose();
});

test.beforeEach(() => test.setTimeout(120000));

test('TC-21-001: PM views procurement read-only and approves a submitted PO', async ({ page }) => {
  await fillLogin(page, USERS.pm.email, USERS.pm.password);
  await page.goto('/pm/procurement', { waitUntil: 'domcontentloaded' });

  // Suppliers tab (default): read-only — no Add supplier button.
  await expect(page.getByText(supplierName)).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Add supplier' })).toHaveCount(0);

  // Purchase Orders tab: the SUBMITTED PO is listed; PM can't create but can approve.
  await page.getByRole('tab', { name: 'Purchase Orders' }).click();
  await expect(page.getByText(po.poNumber)).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Create PO' })).toHaveCount(0);

  await Promise.all([
    page.waitForResponse((r) => /\/purchase-orders\/.+\/approve$/.test(r.url()) && r.request().method() === 'POST'),
    page.getByRole('button', { name: `Approve ${po.poNumber}` }).click(),
  ]);
  // Status chip flips to Approved (and the approve button disappears).
  await expect(page.getByText('Approved')).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: '/tmp/pm-procurement.png', fullPage: true });
});

test('TC-21-002: PROCUREMENT creates a supplier via the UI (/procurement/suppliers)', async ({ page }) => {
  await fillLogin(page, USERS.procurement.email, USERS.procurement.password);
  await page.goto('/procurement/suppliers', { waitUntil: 'domcontentloaded' });

  const addBtn = page.getByRole('button', { name: 'Add supplier' });
  await expect(addBtn).toBeVisible({ timeout: 15000 });
  const dialog = page.getByRole('dialog');
  // Re-click until the modal opens (clicking before React hydrates is a no-op).
  await expect(async () => {
    await addBtn.click();
    await expect(dialog).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 20000 });
  const name = `E2E UI Supplier ${Date.now()}`;
  await dialog.getByLabel('Supplier name').fill(name);
  await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/suppliers') && r.request().method() === 'POST'),
    dialog.getByRole('button', { name: 'Add supplier' }).click(),
  ]);
  await expect(page.getByText(name)).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: '/tmp/proc-suppliers.png', fullPage: true });
});
