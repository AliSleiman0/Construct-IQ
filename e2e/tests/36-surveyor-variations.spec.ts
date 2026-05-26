import { test, expect } from '@playwright/test';
import {
  USERS, fillLogin, apiLogin, seedProject, deleteProject, selectProject,
  apiMeId, addProjectMember, type ApiSession,
} from './helpers';

// Surveyor Variations page (/surveyor/variations): QS (manage:budget) raises a
// change order, then approves it. Verifies the placeholder is gone, the signed
// impact renders, and approval flips the status + removes the pending-only actions.
let pm: ApiSession;
let qs: ApiSession;
let project: { id: string; name: string };
const TITLE = `E2E Variation ${Date.now() % 100000}`;

test.beforeAll(async () => {
  pm = await apiLogin(USERS.pm.email, USERS.pm.password);
  qs = await apiLogin(USERS.qs.email, USERS.qs.password);
  const qsId = await apiMeId(qs);
  project = await seedProject(pm, { name: `E2E Var ${Date.now()}` });
  await addProjectMember(pm, project.id, qsId, 'Surveyor');
});

test.afterAll(async () => {
  await deleteProject(pm, project.id);
  await pm.ctx.dispose();
  await qs.ctx.dispose();
});

test.beforeEach(() => test.setTimeout(120000));

test('TC-36-001: QS raises a variation (negative impact), then approves it', async ({ page }) => {
  await fillLogin(page, USERS.qs.email, USERS.qs.password);
  await page.goto('/surveyor/variations', { waitUntil: 'domcontentloaded' });
  await selectProject(page, project.name);

  // Real page, not the ModulePreview placeholder.
  await expect(page.getByTestId('variation-add')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Phase 5 — Quantity Surveyor')).toHaveCount(0);
  await expect(page.getByText('Net approved impact')).toBeVisible();

  // Raise a variation with a negative (deduction) impact.
  await page.getByTestId('variation-add').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Raise variation' })).toBeVisible({ timeout: 10000 });
  await dialog.getByLabel('Title').fill(TITLE);
  await dialog.getByLabel('Impact amount (± USD)').fill('-5000');
  await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/variations') && r.request().method() === 'POST'),
    dialog.getByTestId('variation-submit').click(),
  ]);
  await expect(dialog).toBeHidden({ timeout: 10000 });

  // Row renders PENDING with a signed, negative impact (scope to the table — the
  // summary strip also says "PENDING"/"approved", and getByText is case-insensitive).
  const table = page.getByTestId('variations-table');
  await expect(table.getByText(TITLE)).toBeVisible({ timeout: 15000 });
  await expect(table.getByText('Pending', { exact: true })).toBeVisible();
  await expect(table.getByText('−$5,000')).toBeVisible();
  await page.screenshot({ path: '/tmp/surveyor-variations-pending.png', fullPage: true });

  // Approve it (confirm prompt) → status flips and the pending-only actions vanish.
  page.once('dialog', (d) => d.accept());
  await Promise.all([
    page.waitForResponse((r) => /\/variations\/.+\/approve$/.test(r.url()) && r.request().method() === 'POST'),
    page.getByRole('button', { name: `Approve ${TITLE}` }).click(),
  ]);
  await expect(table.getByText('Approved', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: `Approve ${TITLE}` })).toHaveCount(0);
  await expect(page.getByRole('button', { name: `Reject ${TITLE}` })).toHaveCount(0);
  await expect(page.getByRole('button', { name: `Edit ${TITLE}` })).toHaveCount(0);
  await page.screenshot({ path: '/tmp/surveyor-variations-approved.png', fullPage: true });
});
