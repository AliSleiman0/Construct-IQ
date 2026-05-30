import { test, expect } from '@playwright/test';
import {
  USERS, fillLogin, apiLogin, seedProject, deleteProject, selectProject,
  apiMeId, addProjectMember, seedBudget, addBudgetLine, type ApiSession,
} from './helpers';

// PM Budget page (/pm/budget): PM read-only view + QS (manage:budget) create/edit flow.
let pm: ApiSession;
let qs: ApiSession;
let readProject: { id: string; name: string };  // PM views read-only (QS pre-seeds the budget)
let editProject: { id: string; name: string };  // QS builds the budget via the UI

test.beforeAll(async () => {
  pm = await apiLogin(USERS.pm.email, USERS.pm.password);
  qs = await apiLogin(USERS.qs.email, USERS.qs.password);
  const qsId = await apiMeId(qs);

  // Read-only fixture: PM owns the project, QS seeds a budget + line on it.
  readProject = await seedProject(pm, { name: `E2E Budget RO ${Date.now()}`, totalBudget: 1000000, currency: 'USD' });
  const bid = await seedBudget(qs, readProject.id, 1000000);
  await addBudgetLine(qs, bid, 'Concrete', 400000);

  // Edit fixture: PM owns it, QS is added as a member so it appears in QS's picker.
  editProject = await seedProject(pm, { name: `E2E Budget Edit ${Date.now()}` });
  await addProjectMember(pm, editProject.id, qsId, 'Surveyor');
});

test.afterAll(async () => {
  await deleteProject(pm, readProject.id);
  await deleteProject(pm, editProject.id);
  await pm.ctx.dispose();
  await qs.ctx.dispose();
});

test.beforeEach(() => test.setTimeout(120000));

test('TC-20-001: PM sees a read-only budget (totals + lines, no edit affordances)', async ({ page }) => {
  await fillLogin(page, USERS.pm.email, USERS.pm.password);
  await page.goto('/pm/budget', { waitUntil: 'domcontentloaded' });
  await selectProject(page, readProject.name);

  // Summary metrics + the seeded line render.
  await expect(page.getByText('Total budget')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Allocated')).toBeVisible();
  await expect(page.getByText('Concrete')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('$400,000').first()).toBeVisible(); // the line's planned amount
  // Read-only: PM has read:budget only — no manage affordances.
  await expect(page.getByRole('button', { name: 'Add line' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add expense' })).toHaveCount(0);
  // The Expenses history section renders for PM (read-only) — no delete affordances.
  await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
  await page.screenshot({ path: '/tmp/pm-budget-readonly.png', fullPage: true });
});

test('TC-20-002: QS creates a budget and adds a line via the UI (/surveyor/budget)', async ({ page }) => {
  // Budget management lives in the SURVEYOR section (QS owns budgets); /pm/budget is PM read-only.
  await fillLogin(page, USERS.qs.email, USERS.qs.password);
  await page.goto('/surveyor/budget', { waitUntil: 'domcontentloaded' });
  await selectProject(page, editProject.name);

  // No budget yet → create it.
  await expect(page.getByText('No budget yet')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Create budget' }).click();
  const createDialog = page.getByRole('dialog');
  await createDialog.getByLabel('Total budget').fill('2000000');
  await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/budget') && r.request().method() === 'POST'),
    createDialog.getByRole('button', { name: 'Create budget' }).click(),
  ]);

  // Budget renders; add a line.
  await expect(page.getByRole('heading', { name: 'Line items' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Add line' }).click();
  const lineDialog = page.getByRole('dialog');
  await lineDialog.getByLabel('Category').fill('Steelwork');
  await lineDialog.getByLabel('Planned amount').fill('500000');
  await Promise.all([
    page.waitForResponse((r) => /\/budget\/.+\/lines$/.test(r.url()) && r.request().method() === 'POST'),
    lineDialog.getByRole('button', { name: 'Add line' }).click(),
  ]);

  await expect(page.getByText('Steelwork')).toBeVisible({ timeout: 15000 });

  // Add an expense → it appears in the Expenses history table.
  await page.getByRole('button', { name: 'Add expense' }).click();
  const expDialog = page.getByRole('dialog');
  await expDialog.getByLabel('Description').fill('Crane hire');
  await expDialog.getByLabel('Amount').fill('75000');
  await Promise.all([
    page.waitForResponse((r) => /\/budget\/.+\/expenses$/.test(r.url()) && r.request().method() === 'POST'),
    expDialog.getByRole('button', { name: 'Add expense' }).click(),
  ]);
  await expect(page.getByText('Crane hire')).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: '/tmp/pm-budget-edit.png', fullPage: true });

  // Edit the expense: bump amount + attribute it to the Steelwork line.
  await page.getByRole('button', { name: 'Edit expense Crane hire' }).click();
  const editDialog = page.getByRole('dialog');
  await expect(editDialog.getByRole('heading', { name: 'Edit expense' })).toBeVisible({ timeout: 10000 });
  await editDialog.getByLabel('Amount').fill('90000');
  await editDialog.locator('.MuiSelect-select').first().click();
  await page.getByRole('option', { name: 'Steelwork' }).click();
  await Promise.all([
    page.waitForResponse((r) => /\/budget\/.+\/expenses\/.+$/.test(r.url()) && r.request().method() === 'PATCH'),
    editDialog.getByRole('button', { name: 'Save changes' }).click(),
  ]);
  // The edited amount now shows on the line's Spent cell ($90,000).
  await expect(page.getByText('$90,000').first()).toBeVisible({ timeout: 15000 });

  // Delete the expense → row disappears (spend recomputes on the next budget refetch).
  page.once('dialog', (d) => d.accept()); // confirm() prompt
  await Promise.all([
    page.waitForResponse((r) => /\/budget\/.+\/expenses\/.+$/.test(r.url()) && r.request().method() === 'DELETE'),
    page.getByRole('button', { name: 'Delete expense Crane hire' }).click(),
  ]);
  await expect(page.getByText('Crane hire')).toHaveCount(0, { timeout: 15000 });
});
