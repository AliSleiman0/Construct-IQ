import { test, expect } from '@playwright/test';
import { USERS, fillLogin, apiLogin, seedProject, deleteProject, type ApiSession } from './helpers';

// PM Documents page (/pm/documents): upload a file (→ MinIO) and delete it.
let pm: ApiSession;
let project: { id: string; name: string };

test.beforeAll(async () => {
  pm = await apiLogin(USERS.pm.email, USERS.pm.password);
  project = await seedProject(pm, { name: `E2E Docs ${Date.now()}` });
});

test.afterAll(async () => {
  await deleteProject(pm, project.id);
  await pm.ctx.dispose();
});

test('TC-22-001: PM uploads a document via the UI and deletes it', async ({ page }) => {
  test.setTimeout(120000);
  page.on('dialog', (d) => d.accept()); // delete uses window.confirm

  await fillLogin(page, USERS.pm.email, USERS.pm.password);
  await page.goto('/pm/documents', { waitUntil: 'domcontentloaded' });

  // Pick our project (default may be another); the page auto-selects the first.
  const projectSelect = page.locator('.MuiSelect-select').first();
  await expect(projectSelect).toBeEnabled({ timeout: 30000 });
  await projectSelect.click();
  await page.getByRole('listbox').getByRole('option', { name: project.name }).click();

  // Open the upload modal (retry through the hydration race).
  const uploadBtn = page.getByRole('button', { name: 'Upload' });
  await expect(uploadBtn).toBeVisible({ timeout: 15000 });
  const dialog = page.getByRole('dialog');
  await expect(async () => {
    await uploadBtn.click();
    await expect(dialog).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 20000 });

  // Attach a file (hidden input) — name auto-fills from the filename.
  const fileName = `e2e-plan-${Date.now()}.txt`;
  await dialog.locator('[data-testid="doc-file-input"]').setInputFiles({
    name: fileName, mimeType: 'text/plain', buffer: Buffer.from('E2E document body'),
  });
  await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/documents/upload') && r.request().method() === 'POST'),
    dialog.getByRole('button', { name: 'Upload' }).click(),
  ]);

  // Row appears in the table.
  await expect(page.getByText(fileName)).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: '/tmp/pm-documents.png', fullPage: true });

  // Delete it → row disappears.
  await page.getByRole('button', { name: `Delete ${fileName}` }).click();
  await expect(page.getByText(fileName)).toBeHidden({ timeout: 15000 });
});
