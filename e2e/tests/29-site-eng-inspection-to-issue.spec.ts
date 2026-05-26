import { test, expect } from '@playwright/test';
import { fillLogin, apiLogin, seedProject, addProjectMember, apiMeId, USERS, API, type ApiSession } from './helpers';

// SE-3: a FAILED inspection offers "Raise issue", which opens the create-issue
// modal prefilled (type=Quality, title references the inspection) and links the
// new issue back to the inspection (shown on the issue detail as "From inspection").

let pmS: ApiSession;
let engS: ApiSession;
let projectId = '';
let proj: { id: string; name: string };
const ts = Date.now();
const inspTitle = `Rebar ${ts}`;

test.beforeAll(async () => {
  pmS = await apiLogin(USERS.pm.email, USERS.pm.password);
  proj = await seedProject(pmS, { status: 'ACTIVE', name: `SE Insp2Issue ${ts}` });
  projectId = proj.id;
  engS = await apiLogin(USERS.engineer.email, USERS.engineer.password);
  const engId = await apiMeId(engS);
  await addProjectMember(pmS, projectId, engId, 'Site Engineer');
  // Engineer schedules an inspection that's already FAILED.
  await engS.ctx.post(`${API}/inspections`, {
    headers: engS.orgHeaders,
    data: { projectId, title: inspTitle, type: 'STRUCTURAL', status: 'FAILED' },
  });
});

test.afterAll(async () => {
  if (projectId) await pmS.ctx.delete(`${API}/projects/${projectId}`, { headers: pmS.orgHeaders }).catch(() => null);
  await pmS.ctx.dispose();
  await engS.ctx.dispose();
});

async function pickProject(page: import('@playwright/test').Page, name: string) {
  const trigger = page.locator('.MuiSelect-select').first();
  await trigger.waitFor({ state: 'visible', timeout: 30000 });
  await expect(trigger).toBeEnabled({ timeout: 30000 });
  await expect(async () => {
    await trigger.click();
    await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30000 });
  await page.getByRole('listbox').getByRole('option', { name }).click();
}

test('TC-29-001: raise a linked QUALITY issue from a failed inspection', async ({ page }, testInfo) => {
  await fillLogin(page, USERS.engineer.email, USERS.engineer.password);
  await page.goto('/site-eng/inspections', { waitUntil: 'domcontentloaded' });
  await pickProject(page, proj.name);

  // The failed inspection card offers "Raise issue".
  const card = page.locator('.MuiPaper-root').filter({ hasText: inspTitle }).first();
  await expect(card).toBeVisible({ timeout: 15000 });
  await card.getByRole('button', { name: /raise issue/i }).click();

  // Modal is prefilled from the inspection.
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Issue Title')).toHaveValue(new RegExp(`Deficiency: ${inspTitle}`));
  await page.screenshot({ path: testInfo.outputPath('raise-issue-prefilled.png'), fullPage: true });
  await dialog.getByRole('button', { name: /report issue/i }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });
  await expect(page.getByText('Issue raised from inspection.')).toBeVisible({ timeout: 10000 });

  // The linked issue shows up in Issues, and its detail records the inspection.
  await page.goto('/site-eng/issues', { waitUntil: 'domcontentloaded' });
  await pickProject(page, proj.name);
  const issueCard = page.getByText(`Deficiency: ${inspTitle}`);
  await expect(issueCard).toBeVisible({ timeout: 15000 });
  await issueCard.click();
  await expect(page).toHaveURL(/\/site-eng\/issues\/[^/]+$/, { timeout: 20000 });
  await expect(page.getByText('From inspection')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(inspTitle).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('issue-from-inspection.png'), fullPage: true });
});
