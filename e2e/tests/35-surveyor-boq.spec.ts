import { test, expect } from '@playwright/test';
import {
  USERS, fillLogin, apiLogin, seedProject, deleteProject, selectProject,
  apiMeId, addProjectMember, type ApiSession,
} from './helpers';

// Surveyor BOQ page (/surveyor/boq): QS (manage:budget) real CRUD on a member project.
// Verifies the placeholder is gone (real table renders), add via modal, totals,
// and the one-way lock that removes edit affordances.
let pm: ApiSession;
let qs: ApiSession;
let project: { id: string; name: string };
const CODE = `E2E.${Date.now() % 100000}`;

test.beforeAll(async () => {
  pm = await apiLogin(USERS.pm.email, USERS.pm.password);
  qs = await apiLogin(USERS.qs.email, USERS.qs.password);
  const qsId = await apiMeId(qs);
  // PM owns the project; QS is added as a member so it appears in QS's member-scoped picker.
  project = await seedProject(pm, { name: `E2E BOQ ${Date.now()}` });
  await addProjectMember(pm, project.id, qsId, 'Surveyor');
});

test.afterAll(async () => {
  await deleteProject(pm, project.id);
  await pm.ctx.dispose();
  await qs.ctx.dispose();
});

test.beforeEach(() => test.setTimeout(120000));

test('TC-35-001: QS adds a BOQ item via the real page, then locks it', async ({ page }) => {
  await fillLogin(page, USERS.qs.email, USERS.qs.password);
  await page.goto('/surveyor/boq', { waitUntil: 'domcontentloaded' });
  await selectProject(page, project.name);

  // Real page, not the ModulePreview placeholder.
  await expect(page.getByTestId('boq-add')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Phase 5 — Quantity Surveyor')).toHaveCount(0);
  await expect(page.getByText('BOQ total')).toBeVisible();

  // Add an item via the modal.
  await page.getByTestId('boq-add').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Add BOQ item' })).toBeVisible({ timeout: 10000 });
  await dialog.getByLabel('Code').fill(CODE);
  await dialog.getByLabel('Description').fill('Concrete grade 30');
  await dialog.getByLabel('Unit', { exact: true }).fill('m³');
  await dialog.getByLabel('Quantity').fill('10');
  await dialog.getByLabel('Unit rate').fill('250');
  await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/boq') && r.request().method() === 'POST'),
    dialog.getByTestId('boq-submit').click(),
  ]);

  // Row renders with the code + computed line total ($2,500).
  await expect(page.getByText(CODE)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('$2,500').first()).toBeVisible();
  await page.screenshot({ path: '/tmp/surveyor-boq-list.png', fullPage: true });

  // Lock the item (one-way) → confirm() prompt → PATCH; the Locked chip shows and edit disappears.
  page.once('dialog', (d) => d.accept());
  await Promise.all([
    page.waitForResponse((r) => /\/boq\/.+$/.test(r.url()) && r.request().method() === 'PATCH'),
    page.getByRole('button', { name: `Lock ${CODE}` }).click(),
  ]);
  await expect(page.getByText('Locked')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: `Edit ${CODE}` })).toHaveCount(0);
  await expect(page.getByRole('button', { name: `Lock ${CODE}` })).toHaveCount(0);
  await page.screenshot({ path: '/tmp/surveyor-boq-locked.png', fullPage: true });
});
