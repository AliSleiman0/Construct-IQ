import { test, expect } from '@playwright/test';
import { fillLogin, apiLogin, seedProject, addProjectMember, apiMeId, USERS, API, type ApiSession } from './helpers';

// /site-eng/reports migrated from the MOCK @/features/site-reports to the real
// @/features/reports (ReportBoardList / ReportFormView / ReportDetailView),
// member-scoped by the Cycle 1 backend change. A site engineer files a report
// on a project they belong to → detail → it shows in their list.

let pmS: ApiSession;
let engS: ApiSession;
let projectId = '';
let proj: { id: string; name: string };

test.beforeAll(async () => {
  // PM seeds a scratch project, then adds the engineer as a member so it
  // appears in the engineer's member-scoped project picker.
  pmS = await apiLogin(USERS.pm.email, USERS.pm.password);
  proj = await seedProject(pmS, { status: 'ACTIVE', name: `SE Reports ${Date.now()}` });
  projectId = proj.id;
  engS = await apiLogin(USERS.engineer.email, USERS.engineer.password);
  const engId = await apiMeId(engS);
  await addProjectMember(pmS, projectId, engId, 'Site Engineer');
});

test.afterAll(async () => {
  // Reports have no DELETE endpoint; dropping the scratch project is enough.
  if (projectId) await pmS.ctx.delete(`${API}/projects/${projectId}`, { headers: pmS.orgHeaders }).catch(() => null);
  await pmS.ctx.dispose();
  await engS.ctx.dispose();
});

test('TC-23-001: engineer files a report (real form) → detail → list', async ({ page }, testInfo) => {
  await fillLogin(page, USERS.engineer.email, USERS.engineer.password);

  await page.goto('/site-eng/reports/new', { waitUntil: 'domcontentloaded' });

  // Project selector is the first MUI Select (a TextField select; no auto-select,
  // disabled while useProjects() loads). Wait for it to be ENABLED before opening,
  // else the click is a no-op. Member-scoped → the scratch project is selectable.
  const projectTrigger = page.locator('.MuiSelect-select').first();
  await projectTrigger.waitFor({ state: 'visible', timeout: 30000 });
  await expect(projectTrigger).toBeEnabled({ timeout: 30000 });
  // Hydration race: the first click can focus the Select without opening it.
  // Re-click until the listbox appears.
  await expect(async () => {
    await projectTrigger.click();
    await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30000 });
  const listbox = page.getByRole('listbox');
  await listbox.getByRole('option', { name: proj.name }).click();
  await listbox.waitFor({ state: 'hidden', timeout: 10000 });

  const work = `SE deck pour ${Date.now()}`;
  await page.getByLabel('Work completed').fill(work);
  await page.getByRole('button', { name: /file report/i }).click();

  // Lands on the new report's detail page under the site-eng route.
  await expect(page).toHaveURL(/\/site-eng\/reports\/[^/]+$/, { timeout: 20000 });
  await expect(page.getByText(work)).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: testInfo.outputPath('site-eng-report-detail.png'), fullPage: true });

  // Back to the list — the new report appears (real data, not the mock store).
  await page.goto('/site-eng/reports', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(work)).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: testInfo.outputPath('site-eng-reports-list.png'), fullPage: true });
});
