import { test, expect } from '@playwright/test';
import {
  fillLogin, apiLogin, seedProject, addProjectMember, apiMeId,
  selectProject, USERS, API, type ApiSession,
} from './helpers';

// SE-8: site-engineer RFI module. The engineer raises an RFI (member-scoped,
// auto RFI-#### number, status OPEN) and cannot answer it (manager-only). A PM
// answers via the API; the engineer then sees the answer + ANSWERED status.

let pmS: ApiSession;
let engS: ApiSession;
let projectId = '';
const ts = Date.now();
const projName = `SE RFIs ${ts}`;
const subject = `Beam clash ${ts}`;

test.beforeAll(async () => {
  pmS = await apiLogin(USERS.pm.email, USERS.pm.password);
  engS = await apiLogin(USERS.engineer.email, USERS.engineer.password);
  const proj = await seedProject(pmS, { status: 'ACTIVE', name: projName });
  projectId = proj.id;
  const engId = await apiMeId(engS);
  await addProjectMember(pmS, projectId, engId, 'Site Engineer');
});

test.afterAll(async () => {
  if (projectId) await pmS.ctx.delete(`${API}/projects/${projectId}`, { headers: pmS.orgHeaders }).catch(() => null);
  await pmS.ctx.dispose();
  await engS.ctx.dispose();
});

test('TC-34-001: site-eng RFIs — raise, no answer button, manager answers, sees ANSWERED', async ({ page }, testInfo) => {
  await fillLogin(page, USERS.engineer.email, USERS.engineer.password);
  await page.goto('/site-eng/rfis', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'RFIs' })).toBeVisible({ timeout: 20000 });
  await selectProject(page, projName);

  // Raise an RFI via the modal.
  await page.getByRole('button', { name: /raise rfi/i }).click();
  await expect(page.getByRole('heading', { name: 'Raise RFI' })).toBeVisible();
  await page.getByLabel('RFI subject').fill(subject);
  await page.getByLabel('Question').fill('Which beam takes priority at grid C3?');
  await page.getByRole('button', { name: /^raise rfi$/i }).click();

  // Card appears with an RFI number + OPEN.
  await expect(page.getByText(subject)).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(/^RFI-\d{4}$/)).toBeVisible();
  await expect(page.getByText('Open')).toBeVisible();

  // Open the detail; the engineer must NOT see an Answer affordance (manager-only).
  await page.getByText(subject).click();
  await expect(page.getByRole('heading', { name: 'RFI detail' })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Awaiting a response.')).toBeVisible();
  await expect(page.getByRole('button', { name: /answer rfi/i })).toHaveCount(0);

  // The current RFI's id (from the URL) → PM answers it via API.
  const rfiId = page.url().split('/site-eng/rfis/')[1];
  const ans = await pmS.ctx.post(`${API}/rfis/${rfiId}/answer`, {
    headers: pmS.orgHeaders,
    data: { answer: 'Steel beam takes priority; see SK-12.' },
  });
  expect(ans.ok()).toBeTruthy();

  // Engineer reloads → answer + ANSWERED visible.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Steel beam takes priority; see SK-12.')).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Answered').first()).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath('site-eng-rfi-detail.png'), fullPage: true });
});
