import { test, expect } from '@playwright/test';
import { fillLogin, apiLogin, seedProject, seedTask, addProjectMember, apiMeId, USERS, API, type ApiSession } from './helpers';

// /site-eng/tasks placeholder → real MyTasksBoard: the engineer's assigned tasks
// across their projects, grouped by status, with update-status only (no create/
// assign affordances — site-eng lacks create:tasks / assign:tasks).

let pmS: ApiSession;
let engS: ApiSession;
let projectId = '';
let taskId = '';

test.beforeAll(async () => {
  pmS = await apiLogin(USERS.pm.email, USERS.pm.password);
  const proj = await seedProject(pmS, { status: 'ACTIVE', name: `SE Tasks ${Date.now()}` });
  projectId = proj.id;
  engS = await apiLogin(USERS.engineer.email, USERS.engineer.password);
  const engId = await apiMeId(engS);
  await addProjectMember(pmS, projectId, engId, 'Site Engineer');
  // PM creates a task assigned to the engineer (site-eng can't create tasks).
  const t = await seedTask(pmS, projectId, { title: `SE task ${Date.now()}`, status: 'TODO', assignedToId: engId });
  taskId = t.id;
});

test.afterAll(async () => {
  if (projectId) await pmS.ctx.delete(`${API}/projects/${projectId}`, { headers: pmS.orgHeaders }).catch(() => null);
  await pmS.ctx.dispose();
  await engS.ctx.dispose();
});

test('TC-25-001: engineer sees an assigned task and updates its status', async ({ page }, testInfo) => {
  await fillLogin(page, USERS.engineer.email, USERS.engineer.password);
  await page.goto('/site-eng/tasks', { waitUntil: 'domcontentloaded' });

  // The assigned task card is visible (member-scoped + assignee = me).
  const card = page.locator('.MuiPaper-root').filter({ hasText: 'SE task' }).first();
  await expect(card).toBeVisible({ timeout: 20000 });
  await page.screenshot({ path: testInfo.outputPath('site-eng-tasks-board.png'), fullPage: true });

  // No create affordance for a field role.
  await expect(page.getByRole('button', { name: /new task|create task|add task/i })).toHaveCount(0);

  // Move the task to In Progress via the card's status select.
  const moveSelect = card.locator('.MuiSelect-select');
  await expect(async () => {
    await moveSelect.click();
    await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30000 });
  const [resp] = await Promise.all([
    page.waitForResponse((r) => /\/api\/v1\/tasks\/[^/]+$/.test(r.url()) && r.request().method() === 'PATCH'),
    page.getByRole('listbox').getByRole('option', { name: 'In Progress' }).click(),
  ]);
  expect(resp.ok()).toBeTruthy();
  await expect(page.getByText('Task updated.')).toBeVisible({ timeout: 10000 });
});
