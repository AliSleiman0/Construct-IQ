import { test, expect } from '@playwright/test';
import { fillLogin, apiLogin, seedProject, addProjectMember, apiMeId, selectProject, USERS, API, type ApiSession } from './helpers';

// SE-6: site-engineer Documents page. The engineer browses project documents
// member-scoped to their projects; report photos (SE-5 IMAGE docs with a
// dailyReportId) are excluded from the table; upload is allowed, delete is not.

let pmS: ApiSession;
let engS: ApiSession;
let projectId = '';
const ts = Date.now();
const drawingName = `GA Drawing ${ts}`;
const photoName = `Report photo ${ts}`;
const projName = `SE Docs ${ts}`;

test.beforeAll(async () => {
  pmS = await apiLogin(USERS.pm.email, USERS.pm.password);
  const proj = await seedProject(pmS, { status: 'ACTIVE', name: projName });
  projectId = proj.id;
  engS = await apiLogin(USERS.engineer.email, USERS.engineer.password);
  const engId = await apiMeId(engS);
  await addProjectMember(pmS, projectId, engId, 'Site Engineer');

  // A real project document (no dailyReportId) — should show in the table.
  await engS.ctx.post(`${API}/documents`, {
    headers: engS.orgHeaders,
    data: { projectId, type: 'DRAWING', name: drawingName, fileKey: `se6/${ts}-drawing.pdf`, fileUrl: 'https://example.test/drawing.pdf', mimeType: 'application/pdf' },
  });
  // A report photo (IMAGE + dailyReportId) — should be EXCLUDED from the table.
  const rr = await engS.ctx.post(`${API}/reports`, {
    headers: engS.orgHeaders,
    data: { projectId, reportDate: '2026-05-25', workCompleted: `Pour ${ts}` },
  });
  const rb = (await rr.json())?.data;
  const reportId = rb?.id ?? rb?._id;
  await engS.ctx.post(`${API}/documents`, {
    headers: engS.orgHeaders,
    data: { projectId, dailyReportId: reportId, type: 'IMAGE', name: photoName, fileKey: `se6/${ts}-photo.jpg`, fileUrl: 'https://example.test/photo.jpg', mimeType: 'image/jpeg' },
  });
});

test.afterAll(async () => {
  if (projectId) await pmS.ctx.delete(`${API}/projects/${projectId}`, { headers: pmS.orgHeaders }).catch(() => null);
  await pmS.ctx.dispose();
  await engS.ctx.dispose();
});

test('TC-32-001: site-eng documents — drawing shown, report photo excluded, upload yes / delete no', async ({ page }, testInfo) => {
  await fillLogin(page, USERS.engineer.email, USERS.engineer.password);
  await page.goto('/site-eng/documents', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible({ timeout: 20000 });
  await selectProject(page, projName);

  // Real project document shows; the report photo is filtered out.
  await expect(page.getByText(drawingName)).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(photoName)).toHaveCount(0);

  // Site engineers can upload (upload:documents) but cannot delete (no delete:documents).
  await expect(page.getByRole('button', { name: /upload/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /delete/i })).toHaveCount(0);

  await page.screenshot({ path: testInfo.outputPath('site-eng-documents.png'), fullPage: true });
});
