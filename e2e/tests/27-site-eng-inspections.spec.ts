import { test, expect } from '@playwright/test';
import { fillLogin, apiLogin, seedProject, addProjectMember, apiMeId, USERS, API, type ApiSession } from './helpers';

// /site-eng/inspections greenfield (thin): schedule an inspection on a member
// project, see it in the list, record an outcome (status doubles as pass/fail).

let pmS: ApiSession;
let engS: ApiSession;
let projectId = '';
let proj: { id: string; name: string };

test.beforeAll(async () => {
  pmS = await apiLogin(USERS.pm.email, USERS.pm.password);
  proj = await seedProject(pmS, { status: 'ACTIVE', name: `SE Insp ${Date.now()}` });
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

test('TC-27-001: engineer schedules an inspection → card → records outcome', async ({ page }, testInfo) => {
  await fillLogin(page, USERS.engineer.email, USERS.engineer.password);
  await page.goto('/site-eng/inspections', { waitUntil: 'domcontentloaded' });

  // Scope to the scratch project (first MUI Select; re-click until open).
  const projectTrigger = page.locator('.MuiSelect-select').first();
  await projectTrigger.waitFor({ state: 'visible', timeout: 30000 });
  await expect(projectTrigger).toBeEnabled({ timeout: 30000 });
  await expect(async () => {
    await projectTrigger.click();
    await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30000 });
  await page.getByRole('listbox').getByRole('option', { name: proj.name }).click();

  // Schedule an inspection.
  const title = `Rebar check ${Date.now()}`;
  await page.getByRole('button', { name: /schedule inspection/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Inspection title').fill(title);
  await dialog.getByRole('button', { name: 'Schedule', exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });

  // The new inspection card appears (real data).
  const card = page.locator('.MuiPaper-root').filter({ hasText: title }).first();
  await expect(card).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: testInfo.outputPath('site-eng-inspections-list.png'), fullPage: true });

  // Record an outcome via the card's "Outcome" select.
  const outcome = card.locator('.MuiSelect-select');
  await expect(async () => {
    await outcome.click();
    await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30000 });
  const [resp] = await Promise.all([
    page.waitForResponse((r) => /\/api\/v1\/inspections\/[^/]+$/.test(r.url()) && r.request().method() === 'PATCH'),
    page.getByRole('listbox').getByRole('option', { name: 'Passed' }).click(),
  ]);
  expect(resp.ok()).toBeTruthy();
  await expect(page.getByText('Inspection updated.')).toBeVisible({ timeout: 10000 });
});
