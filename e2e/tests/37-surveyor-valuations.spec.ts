import { test, expect } from '@playwright/test';
import {
  USERS, fillLogin, apiLogin, seedProject, deleteProject, selectProject,
  apiMeId, addProjectMember, type ApiSession,
} from './helpers';

// Surveyor Valuations page (/surveyor/valuations): QS (manage:budget) raises a
// progress claim, submits it, then certifies it. Verifies the placeholder is gone
// and the DRAFT → SUBMITTED → CERTIFIED lifecycle flips status + retires the
// stage-only actions at each step.
let pm: ApiSession;
let qs: ApiSession;
let project: { id: string; name: string };
const PERIOD = `E2E ${Date.now() % 100000}`;

test.beforeAll(async () => {
  pm = await apiLogin(USERS.pm.email, USERS.pm.password);
  qs = await apiLogin(USERS.qs.email, USERS.qs.password);
  const qsId = await apiMeId(qs);
  project = await seedProject(pm, { name: `E2E Val ${Date.now()}` });
  await addProjectMember(pm, project.id, qsId, 'Surveyor');
});

test.afterAll(async () => {
  await deleteProject(pm, project.id);
  await pm.ctx.dispose();
  await qs.ctx.dispose();
});

test.beforeEach(() => test.setTimeout(120000));

test('TC-37-001: QS raises a valuation, submits it, then certifies it', async ({ page }) => {
  await fillLogin(page, USERS.qs.email, USERS.qs.password);
  await page.goto('/surveyor/valuations', { waitUntil: 'domcontentloaded' });
  await selectProject(page, project.name);

  // Real page, not the ModulePreview placeholder.
  await expect(page.getByTestId('valuation-add')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Phase 5 — Quantity Surveyor')).toHaveCount(0);
  await expect(page.getByText('Awaiting certification')).toBeVisible();

  // Raise a valuation for the period.
  await page.getByTestId('valuation-add').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Raise valuation' })).toBeVisible({ timeout: 10000 });
  await dialog.getByLabel('Period').fill(PERIOD);
  await dialog.getByLabel('Amount (USD)').fill('138000');
  await dialog.getByLabel('Retention withheld (USD)').fill('6900');
  await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/valuations') && r.request().method() === 'POST'),
    dialog.getByTestId('valuation-submit').click(),
  ]);
  await expect(dialog).toBeHidden({ timeout: 10000 });

  // Row renders DRAFT with the gross amount (scope to the table — the summary
  // strip says "Awaiting certification"/"Certified value", and getByText is
  // case-insensitive substring).
  const table = page.getByTestId('valuations-table');
  await expect(table.getByText(PERIOD)).toBeVisible({ timeout: 15000 });
  await expect(table.getByText('Draft', { exact: true })).toBeVisible();
  await expect(table.getByText('$138,000')).toBeVisible();
  await page.screenshot({ path: '/tmp/surveyor-valuations-draft.png', fullPage: true });

  // Submit for certification (confirm prompt) → SUBMITTED, certify action appears.
  page.once('dialog', (d) => d.accept());
  await Promise.all([
    page.waitForResponse((r) => /\/valuations\/[^/]+$/.test(r.url()) && r.request().method() === 'PATCH'),
    page.getByRole('button', { name: `Submit ${PERIOD}` }).click(),
  ]);
  await expect(table.getByText('Submitted', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: `Submit ${PERIOD}` })).toHaveCount(0);
  await expect(page.getByRole('button', { name: `Edit ${PERIOD}` })).toHaveCount(0);

  // Certify it → CERTIFIED and the certify action vanishes (terminal).
  page.once('dialog', (d) => d.accept());
  await Promise.all([
    page.waitForResponse((r) => /\/valuations\/.+\/certify$/.test(r.url()) && r.request().method() === 'POST'),
    page.getByRole('button', { name: `Certify ${PERIOD}` }).click(),
  ]);
  await expect(table.getByText('Certified', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: `Certify ${PERIOD}` })).toHaveCount(0);
  await page.screenshot({ path: '/tmp/surveyor-valuations-certified.png', fullPage: true });
});
