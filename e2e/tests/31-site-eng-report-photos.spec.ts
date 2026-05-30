import { test, expect } from '@playwright/test';
import { fillLogin, apiLogin, seedProject, addProjectMember, apiMeId, USERS, API, type ApiSession } from './helpers';

// SE-5: daily-report photos. A site engineer opens a report detail, the Photos
// section renders, uploads an image (multipart → Document linked by
// dailyReportId), the thumbnail appears + survives reload, and delete removes it.

let pmS: ApiSession;
let engS: ApiSession;
let projectId = '';
let reportId = '';
const ts = Date.now();

// 1x1 transparent PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

test.beforeAll(async () => {
  pmS = await apiLogin(USERS.pm.email, USERS.pm.password);
  const proj = await seedProject(pmS, { status: 'ACTIVE', name: `SE Photos ${ts}` });
  projectId = proj.id;
  engS = await apiLogin(USERS.engineer.email, USERS.engineer.password);
  const engId = await apiMeId(engS);
  await addProjectMember(pmS, projectId, engId, 'Site Engineer');
  const rr = await engS.ctx.post(`${API}/reports`, {
    headers: engS.orgHeaders,
    data: { projectId, reportDate: '2026-05-25', workCompleted: `Slab pour ${ts}` },
  });
  reportId = (await rr.json())?.data?.id ?? (await rr.json())?.data?._id;
});

test.afterAll(async () => {
  if (projectId) await pmS.ctx.delete(`${API}/projects/${projectId}`, { headers: pmS.orgHeaders }).catch(() => null);
  await pmS.ctx.dispose();
  await engS.ctx.dispose();
});

test('TC-31-001: report photos — engineer uploads + persists; delete is manager-only', async ({ page }, testInfo) => {
  await fillLogin(page, USERS.engineer.email, USERS.engineer.password);
  await page.goto(`/site-eng/reports/${reportId}`, { waitUntil: 'domcontentloaded' });

  // Photos section renders, empty to start.
  const photosHeading = page.getByText(/^Photos \(\d+\)$/);
  await expect(photosHeading).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(/Photos \(0\)/)).toBeVisible();

  // Upload an image via the hidden file input.
  await page.getByTestId('report-photo-input').setInputFiles({
    name: 'site.png',
    mimeType: 'image/png',
    buffer: PNG,
  });
  await expect(page.getByText('1 photo uploaded.')).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(/Photos \(1\)/)).toBeVisible();
  const thumb = page.locator('img[alt="site.png"]');
  await expect(thumb).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('report-photos.png'), fullPage: true });

  // Survives a reload.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/Photos \(1\)/)).toBeVisible({ timeout: 20000 });
  await expect(page.locator('img[alt="site.png"]')).toBeVisible();

  // SITE_ENG holds upload:documents but NOT delete:documents — no delete control.
  await expect(page.getByRole('button', { name: /delete site\.png/i })).toHaveCount(0);

  // A manager (manage:documents) removes it; the gallery reflects it on reload.
  const list = await pmS.ctx.get(`${API}/documents?dailyReportId=${reportId}`, { headers: pmS.orgHeaders });
  const listed = (await list.json())?.data?.[0];
  const docId = listed?.id ?? listed?._id;
  expect(docId).toBeTruthy();
  await pmS.ctx.delete(`${API}/documents/${docId}`, { headers: pmS.orgHeaders });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/Photos \(0\)/)).toBeVisible({ timeout: 20000 });
});
