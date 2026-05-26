import { test, expect } from '@playwright/test';
import { fillLogin, apiLogin, seedProject, addProjectMember, apiMeId, USERS, API, type ApiSession } from './helpers';

// SE-4: inspection detail/edit page + the SE-3 reverse-link follow-ups.
// Detail renders, edits persist, the "Issues raised" section lists linked
// issues, and the issue↔inspection deep-link works both ways.

let pmS: ApiSession;
let engS: ApiSession;
let projectId = '';
let inspId = '';
const ts = Date.now();
const inspTitle = `Rebar ${ts}`;
const issueTitle = `Deficiency: ${inspTitle}`;

test.beforeAll(async () => {
  pmS = await apiLogin(USERS.pm.email, USERS.pm.password);
  const proj = await seedProject(pmS, { status: 'ACTIVE', name: `SE Insp4 ${ts}` });
  projectId = proj.id;
  engS = await apiLogin(USERS.engineer.email, USERS.engineer.password);
  const engId = await apiMeId(engS);
  await addProjectMember(pmS, projectId, engId, 'Site Engineer');
  // Failed inspection + an issue linked to it.
  const ir = await engS.ctx.post(`${API}/inspections`, {
    headers: engS.orgHeaders,
    data: { projectId, title: inspTitle, type: 'STRUCTURAL', status: 'FAILED' },
  });
  inspId = (await ir.json())?.data?.id ?? (await ir.json())?.data?._id;
  await engS.ctx.post(`${API}/issues`, {
    headers: engS.orgHeaders,
    data: { projectId, title: issueTitle, type: 'QUALITY', severity: 'HIGH', inspectionId: inspId },
  });
});

test.afterAll(async () => {
  if (projectId) await pmS.ctx.delete(`${API}/projects/${projectId}`, { headers: pmS.orgHeaders }).catch(() => null);
  await pmS.ctx.dispose();
  await engS.ctx.dispose();
});

test('TC-30-001: inspection detail — edit, linked issues, two-way deep-link', async ({ page }, testInfo) => {
  await fillLogin(page, USERS.engineer.email, USERS.engineer.password);
  await page.goto(`/site-eng/inspections/${inspId}`, { waitUntil: 'domcontentloaded' });

  // Detail renders + the linked issue shows in "Issues raised".
  await expect(page.getByRole('heading', { name: inspTitle })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Issues raised from this inspection')).toBeVisible();
  await expect(page.getByText(issueTitle)).toBeVisible();

  // Edit → change notes → persists.
  const notes = `Edited ${ts}`;
  await page.getByRole('button', { name: /edit inspection/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Notes').fill(notes);
  await dialog.getByRole('button', { name: /save/i }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });
  await expect(page.getByText('Inspection updated.')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(notes)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('inspection-detail.png'), fullPage: true });

  // Deep-link: inspection → its issue.
  await page.getByText(issueTitle).click();
  await expect(page).toHaveURL(/\/site-eng\/issues\/[^/]+$/, { timeout: 20000 });
  // Deep-link back: issue "From inspection" → the inspection detail.
  // (Target the link specifically — the issue title "Deficiency: <inspTitle>"
  // also contains inspTitle but is not a link.)
  const fromInspectionLink = page.getByRole('link', { name: inspTitle, exact: true });
  await expect(fromInspectionLink).toBeVisible({ timeout: 15000 });
  await fromInspectionLink.click();
  await expect(page).toHaveURL(new RegExp(`/site-eng/inspections/${inspId}$`), { timeout: 20000 });
  await page.screenshot({ path: testInfo.outputPath('deep-link-back.png'), fullPage: true });
});
