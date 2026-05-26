import { test, expect } from '@playwright/test';
import {
  USERS, fillLogin, apiLogin, seedProject, seedTask, deleteProject,
  chooseDialogStatus, type ApiSession,
} from './helpers';

// Projects list + detail (real API) and admin-pages regression.
let api: ApiSession;
let project: { id: string; name: string };

test.beforeAll(async () => {
  api = await apiLogin(USERS.pm.email, USERS.pm.password);
  project = await seedProject(api, { name: `E2E Project ${Date.now()}`, code: 'E2EP', totalBudget: 1000000, currency: 'USD' });
  await seedTask(api, project.id, { title: 'Detail task 1' });
  await seedTask(api, project.id, { title: 'Detail task 2' });
});

test.afterAll(async () => {
  await deleteProject(api, project.id);
  await api.ctx.dispose();
});

test.beforeEach(() => {
  test.setTimeout(120000);
});

test('TC-13-001: PM projects list renders the real-data table', async ({ page }) => {
  await fillLogin(page, USERS.pm.email, USERS.pm.password);
  await page.goto('/pm/projects');
  await page.waitForSelector('.MuiSkeleton-root', { state: 'hidden', timeout: 15000 }).catch(() => null);
  await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 });
  // Real columns; no mock-only columns.
  await expect(page.getByRole('columnheader', { name: /members/i })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: /tasks/i })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: /manager/i })).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: /progress/i })).toHaveCount(0);
  await expect(page.getByText(project.name)).toBeVisible();
});

test('TC-13-002: project detail shows tabs with live counts', async ({ page }) => {
  await fillLogin(page, USERS.pm.email, USERS.pm.password);
  await page.goto(`/pm/projects/${project.id}`);
  await expect(page.getByRole('heading', { name: project.name })).toBeVisible({ timeout: 10000 });
  // Tasks tab count reflects the 2 seeded tasks.
  await expect(page.getByRole('tab', { name: /tasks \(2\)/i })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Detail task 1')).toBeVisible();
  // Members tab lists the hydrated creator.
  await page.getByRole('tab', { name: /members/i }).click();
  await expect(page.getByText(/@constructiq\.com/i).first()).toBeVisible({ timeout: 8000 });
});

test('TC-13-003: edit project persists', async ({ page }) => {
  await fillLogin(page, USERS.pm.email, USERS.pm.password);
  await page.goto(`/pm/projects/${project.id}`);
  // The project Edit button is the first "Edit" (header); the others are row icons.
  await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: /edit project/i })).toBeVisible();
  await chooseDialogStatus(page, 'Active');
  await page.getByRole('button', { name: /save|update/i }).click();
  await expect(page.getByText('Active').first()).toBeVisible({ timeout: 10000 });
});

test('TC-13-005: project-detail Issues tab creates an issue via the real API (regression)', async ({ page }) => {
  // Guards both shared-layer bugs fixed during the /pm/issues migration:
  // useIssues(projectId) (was calling a nonexistent issuesApi.listByProject, so
  // the tab never loaded) and useCreateIssue (was sending the wrong create
  // signature, dropping projectId). The "Report Issue" button also depends on
  // the FE hasPermission honoring manage:issues as a create:issues superset.
  await fillLogin(page, USERS.pm.email, USERS.pm.password);
  await page.goto(`/pm/projects/${project.id}`);
  await expect(page.getByRole('heading', { name: project.name })).toBeVisible({ timeout: 10000 });

  await page.getByRole('tab', { name: /issues/i }).click();
  // Open the Report Issue modal (the tab-panel button, before the modal exists).
  await page.getByRole('button', { name: /report issue/i }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  const title = `E2E tab issue ${Date.now()}`;
  await dialog.getByLabel(/issue title/i).fill(title);
  // type/severity default to GENERAL/MEDIUM — submit with the modal's button.
  await dialog.getByRole('button', { name: /report issue/i }).click();

  // The created issue appears in the IssueTable (proves create persisted + list refetched).
  await expect(page.getByText(title)).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('tab', { name: /issues \(1\)/i })).toBeVisible({ timeout: 10000 });
});

test('TC-13-006: add and remove a project member via the Members tab', async ({ page }) => {
  // Isolated project (sole member = the PM creator) so the picker has other users
  // and we control the member count for the last-member guard.
  const proj = await seedProject(api, { name: `E2E Members ${Date.now()}` });
  page.on('dialog', (d) => d.accept()); // the remove flow uses window.confirm

  try {
    await fillLogin(page, USERS.pm.email, USERS.pm.password);
    await page.goto(`/pm/projects/${proj.id}`);
    await page.getByRole('tab', { name: /members/i }).click();

    // Open Add member, pick the first available org user, capture its label.
    await page.getByRole('button', { name: /add member/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('.MuiSelect-select').click();
    const firstOption = page.getByRole('option').first();
    const optionText = (await firstOption.textContent())?.trim() ?? '';
    const name = optionText.split('—')[0].trim();
    const email = optionText.split('—').pop()!.trim();
    await firstOption.click();
    await dialog.getByRole('button', { name: /add member/i }).click();

    // Modal closes on success, then the new member row appears (proven by its
    // labelled remove button, which only renders for a real member row).
    await expect(dialog).toBeHidden({ timeout: 10000 });
    await expect(page.getByRole('button', { name: `Remove ${name}` })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(email)).toBeVisible();
    await page.screenshot({ path: '/tmp/pm-members-tab.png', fullPage: true });

    // Edit that member's project role → a role chip appears.
    await page.getByRole('button', { name: `Edit role for ${name}` }).click();
    const editDialog = page.getByRole('dialog');
    await editDialog.getByLabel('Project role (optional)').fill('Site Engineer');
    await editDialog.getByRole('button', { name: /update role/i }).click();
    await expect(editDialog).toBeHidden({ timeout: 10000 });
    await expect(page.getByText('Site Engineer')).toBeVisible({ timeout: 10000 });

    // Remove that member via its labelled button → row disappears (2 → 1).
    await page.getByRole('button', { name: `Remove ${name}` }).click();
    await expect(page.getByText(email)).toBeHidden({ timeout: 10000 });
  } finally {
    await deleteProject(api, proj.id);
  }
});

test('TC-13-007: delete a project from the PM list', async ({ page }) => {
  const proj = await seedProject(api, { name: `E2E Delete ${Date.now()}` });
  page.on('dialog', (d) => d.accept()); // the delete flow uses window.confirm
  try {
    await fillLogin(page, USERS.pm.email, USERS.pm.password);
    await page.goto('/pm/projects', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('table')).toBeVisible({ timeout: 30000 });

    const delBtn = page.getByRole('button', { name: `Delete ${proj.name}` });
    await expect(delBtn).toBeVisible({ timeout: 15000 });
    await delBtn.click();

    // Row disappears once the soft-delete invalidates the list.
    await expect(page.getByRole('link', { name: proj.name })).toBeHidden({ timeout: 15000 });
  } finally {
    await deleteProject(api, proj.id);
  }
});

test('TC-13-004: admin projects list + detail load real data (regression)', async ({ page }) => {
  // Add the org admin to the project so the member-scoped list includes it.
  const admin = await apiLogin(USERS.orgAdmin.email, USERS.orgAdmin.password);
  const meRes = await admin.ctx.get(`${'http://localhost:4000/api/v1'}/auth/me`);
  const adminId = (await meRes.json())?.data?.sub ?? (await (await admin.ctx.get('http://localhost:4000/api/v1/users/me')).json())?.data?.id;
  await api.ctx.post(`http://localhost:4000/api/v1/projects/${project.id}/members`, {
    headers: api.orgHeaders, data: { userId: adminId, role: 'Admin' },
  }).catch(() => null);
  await admin.ctx.dispose();

  await fillLogin(page, USERS.orgAdmin.email, USERS.orgAdmin.password);
  await page.goto('/admin/projects');
  await page.waitForSelector('.MuiSkeleton-root', { state: 'hidden', timeout: 15000 }).catch(() => null);
  await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 });
  await page.goto(`/admin/projects/${project.id}`);
  // The pre-fix bug rendered "Project not found"; assert the real project name instead.
  await expect(page.getByRole('heading', { name: project.name })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/project not found/i)).toHaveCount(0);
});
