import { test, expect } from '@playwright/test';
import { fillLogin, apiLogin, seedProject, addProjectMember, apiMeId, USERS, API, type ApiSession } from './helpers';

// /site-eng/issues migrated from the MOCK @/features/site-issues to the real
// @/features/issues — a focused project-scoped IssueListView (NOT the PM triage
// console) + IssueDetailView. A site engineer reports an issue on a member
// project, sees it in the card list, and opens its detail.

let pmS: ApiSession;
let engS: ApiSession;
let projectId = '';
let proj: { id: string; name: string };

test.beforeAll(async () => {
  pmS = await apiLogin(USERS.pm.email, USERS.pm.password);
  proj = await seedProject(pmS, { status: 'ACTIVE', name: `SE Issues ${Date.now()}` });
  projectId = proj.id;
  engS = await apiLogin(USERS.engineer.email, USERS.engineer.password);
  const engId = await apiMeId(engS);
  await addProjectMember(pmS, projectId, engId, 'Site Engineer');
});

test.afterAll(async () => {
  if (projectId) await pmS.ctx.delete(`${API}/projects/${projectId}`, { headers: pmS.orgHeaders }).catch(() => null);
  await pmS.ctx.dispose();
  await engS.ctx.dispose();
});

test('TC-24-001: engineer reports an issue (real modal) → card → detail', async ({ page }, testInfo) => {
  await fillLogin(page, USERS.engineer.email, USERS.engineer.password);
  await page.goto('/site-eng/issues', { waitUntil: 'domcontentloaded' });

  // Scope to the scratch project via the first MUI Select (re-click until open).
  const projectTrigger = page.locator('.MuiSelect-select').first();
  await projectTrigger.waitFor({ state: 'visible', timeout: 30000 });
  await expect(projectTrigger).toBeEnabled({ timeout: 30000 });
  await expect(async () => {
    await projectTrigger.click();
    await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30000 });
  await page.getByRole('listbox').getByRole('option', { name: proj.name }).click();

  // Report an issue via the real CreateIssueModal.
  const title = `SE crack ${Date.now()}`;
  await page.getByRole('button', { name: /report issue/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Issue Title').fill(title);
  // type/severity keep their defaults (General / Medium).
  await dialog.getByRole('button', { name: /report issue/i }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });

  // The new issue card appears in the list.
  const card = page.getByText(title);
  await expect(card).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: testInfo.outputPath('site-eng-issues-list.png'), fullPage: true });

  // Open detail.
  await card.click();
  await expect(page).toHaveURL(/\/site-eng\/issues\/[^/]+$/, { timeout: 20000 });
  await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: testInfo.outputPath('site-eng-issue-detail.png'), fullPage: true });
});
