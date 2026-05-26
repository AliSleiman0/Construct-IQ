import { test, expect } from '@playwright/test';
import { fillLogin, apiLogin, seedProject, addProjectMember, apiMeId, USERS, API, type ApiSession } from './helpers';

// SE-2: the site-eng IssueListView gains a "Show" filter — All / Assigned to me /
// Raised by me — so a field engineer can focus on their own work. Client-side
// over the project-scoped list; no backend change.

let pmS: ApiSession;
let engS: ApiSession;
let projectId = '';
let proj: { id: string; name: string };
const ts = Date.now();
const assignedTitle = `Assigned ${ts}`; // raised by PM, assigned to engineer
const raisedTitle = `Raised ${ts}`; // raised by engineer, unassigned

test.beforeAll(async () => {
  pmS = await apiLogin(USERS.pm.email, USERS.pm.password);
  proj = await seedProject(pmS, { status: 'ACTIVE', name: `SE Filter ${ts}` });
  projectId = proj.id;
  engS = await apiLogin(USERS.engineer.email, USERS.engineer.password);
  const engId = await apiMeId(engS);
  await addProjectMember(pmS, projectId, engId, 'Site Engineer');
  // PM raises an issue assigned to the engineer (engineer can't self-assign).
  await pmS.ctx.post(`${API}/issues`, {
    headers: pmS.orgHeaders,
    data: { projectId, title: assignedTitle, type: 'QUALITY', severity: 'HIGH', assignedToId: engId },
  });
});

test.afterAll(async () => {
  if (projectId) await pmS.ctx.delete(`${API}/projects/${projectId}`, { headers: pmS.orgHeaders }).catch(() => null);
  await pmS.ctx.dispose();
  await engS.ctx.dispose();
});

async function setScope(page: import('@playwright/test').Page, optionName: string) {
  const trigger = page.locator('[data-testid="issue-scope"] .MuiSelect-select');
  await expect(async () => {
    await trigger.click();
    await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30000 });
  await page.getByRole('listbox').getByRole('option', { name: optionName }).click();
  await page.getByRole('listbox').waitFor({ state: 'hidden', timeout: 10000 });
}

test('TC-28-001: "Assigned to me" / "Raised by me" narrow the issue list', async ({ page }, testInfo) => {
  await fillLogin(page, USERS.engineer.email, USERS.engineer.password);
  await page.goto('/site-eng/issues', { waitUntil: 'domcontentloaded' });

  // Scope to the scratch project (first MUI Select; re-click until open).
  const projectTrigger = page.locator('.MuiSelect-select').first();
  await projectTrigger.waitFor({ state: 'visible', timeout: 30000 });
  await expect(projectTrigger).toBeEnabled({ timeout: 30000 });
  await expect(async () => {
    await projectTrigger.click();
    await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30000 });
  await page.getByRole('listbox').getByRole('option', { name: proj.name }).click();

  // Engineer raises their own issue (unassigned).
  await page.getByRole('button', { name: /report issue/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Issue Title').fill(raisedTitle);
  await dialog.getByRole('button', { name: /report issue/i }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });

  // Default "All issues" → both visible.
  await expect(page.getByText(assignedTitle)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(raisedTitle)).toBeVisible();

  // "Assigned to me" → the PM-assigned issue only.
  await setScope(page, 'Assigned to me');
  await expect(page.getByText(assignedTitle)).toBeVisible();
  await expect(page.getByText(raisedTitle)).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('site-eng-issues-assigned-to-me.png'), fullPage: true });

  // "Raised by me" → the engineer-created issue only.
  await setScope(page, 'Raised by me');
  await expect(page.getByText(raisedTitle)).toBeVisible();
  await expect(page.getByText(assignedTitle)).toHaveCount(0);
});
