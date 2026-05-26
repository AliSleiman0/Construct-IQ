import { test, expect } from '@playwright/test';
import { fillLogin, apiLogin, seedProject, USERS, API, type ApiSession } from './helpers';

// /pm/reports migrated from the mock store to the real @/features/reports API.
// Drives the rich create form (project selector + manpower/equipment) → detail → list.

let s: ApiSession;
let projectId = '';
let proj: { id: string; name: string };

test.beforeAll(async () => {
  s = await apiLogin(USERS.pm.email, USERS.pm.password);
  proj = await seedProject(s, { status: 'ACTIVE' });
  projectId = proj.id;
});

test.afterAll(async () => {
  // Reports have no DELETE endpoint; dropping the scratch project is enough.
  if (projectId) await s.ctx.delete(`${API}/projects/${projectId}`, { headers: s.orgHeaders }).catch(() => null);
  await s.ctx.dispose();
});

test('create report (rich form) → detail → appears in list', async ({ page }) => {
  await fillLogin(page, USERS.pm.email, USERS.pm.password);

  await page.goto('/pm/reports/new', { waitUntil: 'domcontentloaded' });

  // Project selector is the first MUI Select (drive via .MuiSelect-select + listbox).
  await page.locator('.MuiSelect-select').first().click();
  await page.getByRole('option', { name: proj.name }).click();

  const work = `E2E deck pour ${Date.now()}`;
  await page.getByLabel('Work completed').fill(work);
  await page.getByRole('button', { name: /file report/i }).click();

  // Lands on the new report's detail page.
  await expect(page).toHaveURL(/\/pm\/reports\/[^/]+$/, { timeout: 20000 });
  await expect(page.getByRole('heading', { name: /Daily report —/ })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(work)).toBeVisible();
  await expect(page.getByText(/Manpower \(/)).toBeVisible();
  // Conditions sidebar shows the populated project name.
  await expect(page.getByText(proj.name).first()).toBeVisible();
  await page.screenshot({ path: '/tmp/pm-reports-detail.png', fullPage: true });

  // The report shows up in the org-wide triage list.
  await page.goto('/pm/reports', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(work)).toBeVisible({ timeout: 20000 });
  await page.screenshot({ path: '/tmp/pm-reports-list.png', fullPage: true });
});
