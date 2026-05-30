import { test, expect, type Page } from '@playwright/test';
import {
  USERS, fillLogin, apiLogin, seedProject, seedTask, deleteProject, selectProject,
  API, type ApiSession,
} from './helpers';

// Task detail page (/pm/tasks/[id]) + board filter/search bar.
let api: ApiSession;
let project: { id: string; name: string };
let assigned: { id: string; title: string };
let unassigned: { id: string; title: string };
let assigneeName = '';

test.beforeAll(async () => {
  api = await apiLogin(USERS.pm.email, USERS.pm.password);
  project = await seedProject(api, { name: `E2E Detail ${Date.now()}` });

  // Pick a real org user to assign one task to (so the assignee filter has a target).
  const users = (await (await api.ctx.get(`${API}/users`, { headers: api.orgHeaders })).json())?.data ?? [];
  const u = users[0];
  assigneeName = `${u.firstName} ${u.lastName}`;

  assigned = await seedTask(api, project.id, { title: `Assigned ${Date.now()}`, status: 'TODO', assignedToId: u.id });
  unassigned = await seedTask(api, project.id, { title: `Unassigned ${Date.now()}`, status: 'TODO' });
});

test.afterAll(async () => {
  await deleteProject(api, project.id);
  await api.ctx.dispose();
});

async function pickAssignee(page: Page, name: string) {
  // The 2nd MUI Select on the board is the Assignee filter (1st is the Project selector).
  await page.locator('.MuiSelect-select').nth(1).click();
  const listbox = page.getByRole('listbox');
  await listbox.waitFor({ state: 'visible', timeout: 10000 });
  await listbox.getByRole('option', { name }).click();
  await listbox.waitFor({ state: 'hidden', timeout: 10000 });
}

test('TC-19-001: clicking a card opens the routed task detail page', async ({ page }) => {
  test.setTimeout(120000);
  await fillLogin(page, USERS.pm.email, USERS.pm.password);
  await page.goto('/pm/tasks', { waitUntil: 'domcontentloaded' });
  await selectProject(page, project.name);

  const card = page.getByText(assigned.title, { exact: true });
  await expect(card).toBeVisible({ timeout: 15000 });
  await card.click();

  await expect(page).toHaveURL(new RegExp(`/pm/tasks/${assigned.id}$`), { timeout: 15000 });
  await expect(page.getByRole('heading', { name: assigned.title })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('To Do').first()).toBeVisible(); // TaskStatusChip
  await expect(page.getByText(assigneeName).first()).toBeVisible(); // client-side resolved assignee
  await page.screenshot({ path: '/tmp/pm-task-detail.png', fullPage: true });

  // Back returns to the board.
  await page.getByRole('link', { name: /back/i }).click();
  await expect(page).toHaveURL(/\/pm\/tasks$/, { timeout: 15000 });
});

test('TC-19-002: search + assignee filter narrow the board and disable reordering', async ({ page }) => {
  test.setTimeout(120000);
  await fillLogin(page, USERS.pm.email, USERS.pm.password);
  await page.goto('/pm/tasks', { waitUntil: 'domcontentloaded' });
  await selectProject(page, project.name);
  await expect(page.getByText(assigned.title, { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(unassigned.title, { exact: true })).toBeVisible();

  // Title search.
  const search = page.getByPlaceholder('Search tasks…');
  await search.fill(assigned.title);
  await expect(page.getByText(assigned.title, { exact: true })).toBeVisible();
  await expect(page.getByText(unassigned.title, { exact: true })).toBeHidden();
  await expect(page.getByText('Reordering disabled while filtered')).toBeVisible();
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByText(unassigned.title, { exact: true })).toBeVisible();

  // Assignee filter.
  await pickAssignee(page, assigneeName);
  await expect(page.getByText(assigned.title, { exact: true })).toBeVisible();
  await expect(page.getByText(unassigned.title, { exact: true })).toBeHidden();
  await page.screenshot({ path: '/tmp/pm-task-filter.png', fullPage: true });
});

test('TC-19-003: add a comment on the task detail page (persists with author name)', async ({ page }) => {
  test.setTimeout(120000);
  await fillLogin(page, USERS.pm.email, USERS.pm.password);
  await page.goto(`/pm/tasks/${assigned.id}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: assigned.title })).toBeVisible({ timeout: 15000 });

  await expect(page.getByText(/comments \(0\)/i)).toBeVisible({ timeout: 10000 });
  const body = `E2E comment ${Date.now()}`;
  await page.getByPlaceholder('Add a comment…').fill(body);
  const [res] = await Promise.all([
    page.waitForResponse((r) => /\/tasks\/.+\/comments$/.test(r.url()) && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Send' }).click(),
  ]);
  expect(res.ok()).toBeTruthy();

  // The comment renders with its body and the counter increments (refetch hydrated author).
  await expect(page.getByText(body)).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/comments \(1\)/i)).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: '/tmp/pm-task-comment.png', fullPage: true });
});

test('TC-19-004: set a task dependency via the edit modal (persists dependsOnTaskIds)', async ({ page }) => {
  test.setTimeout(120000);
  await fillLogin(page, USERS.pm.email, USERS.pm.password);
  await page.goto(`/pm/tasks/${assigned.id}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: assigned.title })).toBeVisible({ timeout: 15000 });

  // Open the edit modal (retry through the hydration race).
  const editBtn = page.getByRole('button', { name: 'Edit task' });
  const dialog = page.getByRole('dialog');
  await expect(async () => {
    await editBtn.click();
    await expect(dialog).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 20000 });

  // The "Depends on" multiselect is the last MUI select in the dialog.
  await dialog.locator('.MuiSelect-select').last().click();
  const listbox = page.getByRole('listbox');
  await listbox.waitFor({ state: 'visible', timeout: 10000 });
  await listbox.getByRole('option', { name: unassigned.title }).click();
  await page.keyboard.press('Escape'); // close the multiselect popup

  const [res] = await Promise.all([
    page.waitForResponse((r) => new RegExp(`/tasks/${assigned.id}$`).test(r.url()) && r.request().method() === 'PATCH'),
    dialog.getByRole('button', { name: /save changes/i }).click(),
  ]);
  const body = res.request().postDataJSON();
  expect(body.dependsOnTaskIds).toContain(unassigned.id);
});
