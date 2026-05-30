import { test, expect } from '@playwright/test';
import {
  fillLogin, apiLogin, seedProject, addProjectMember, apiMeId, seedSupplier, seedPO,
  selectProject, USERS, API, type ApiSession,
} from './helpers';

// SE-7: site-engineer Deliveries page. Deliveries are member-scoped server-side
// (the engineer only sees deliveries for POs on their projects) and rows are
// PO-enriched. The engineer can CONFIRM receipt (status -> Delivered, recorded
// as them) but has no create/edit/cancel controls.

let pmS: ApiSession;
let proS: ApiSession;
let engS: ApiSession;
let projectId = '';
let poNumber = '';
const ts = Date.now();
const projName = `SE Deliveries ${ts}`;

test.beforeAll(async () => {
  pmS = await apiLogin(USERS.pm.email, USERS.pm.password);
  proS = await apiLogin(USERS.procurement.email, USERS.procurement.password);
  engS = await apiLogin(USERS.engineer.email, USERS.engineer.password);

  const proj = await seedProject(pmS, { status: 'ACTIVE', name: projName });
  projectId = proj.id;
  const engId = await apiMeId(engS);
  await addProjectMember(pmS, projectId, engId, 'Site Engineer');

  const supplierId = await seedSupplier(proS, `SE7 Supplier ${ts}`);
  const po = await seedPO(proS, { projectId, supplierId, status: 'APPROVED' });
  poNumber = po.poNumber;

  // A PENDING delivery on the engineer's member project.
  await proS.ctx.post(`${API}/deliveries`, {
    headers: proS.orgHeaders,
    data: { purchaseOrderId: po.id, status: 'PENDING' },
  });
});

test.afterAll(async () => {
  if (projectId) await pmS.ctx.delete(`${API}/projects/${projectId}`, { headers: pmS.orgHeaders }).catch(() => null);
  await pmS.ctx.dispose();
  await proS.ctx.dispose();
  await engS.ctx.dispose();
});

test('TC-33-001: site-eng deliveries — PO shown, confirm receipt, no create/edit', async ({ page }, testInfo) => {
  await fillLogin(page, USERS.engineer.email, USERS.engineer.password);
  await page.goto('/site-eng/deliveries', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Deliveries' })).toBeVisible({ timeout: 20000 });
  await selectProject(page, projName);

  // The member-project delivery shows, identified by its PO number, and PENDING.
  await expect(page.getByText(poNumber)).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Pending')).toBeVisible();

  // No procurement-style create/edit/cancel controls for the site engineer.
  await expect(page.getByRole('button', { name: /record delivery/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^edit/i })).toHaveCount(0);

  // Confirm receipt -> dialog -> confirm.
  await page.getByRole('button', { name: /confirm receipt/i }).click();
  await expect(page.getByRole('heading', { name: 'Confirm receipt' })).toBeVisible();
  await page.getByRole('button', { name: /confirm received/i }).click();

  // Row flips to Delivered and the confirm action disappears (status-gated).
  await expect(page.getByText('Delivered')).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('button', { name: /confirm receipt/i })).toHaveCount(0);

  await page.screenshot({ path: testInfo.outputPath('site-eng-deliveries.png'), fullPage: true });
});
