import { test, expect } from '@playwright/test';
import {
  USERS, fillLogin, apiLogin, seedProject, deleteProject, selectProject, seedPhase, seedTask,
  type ApiSession,
} from './helpers';

// Gantt task lane: task bars grouped under a phase + a rendered dependency arrow.
let api: ApiSession;
let project: { id: string; name: string };
let taskA: { id: string; title: string };
let taskB: { id: string; title: string };

test.beforeAll(async () => {
  api = await apiLogin(USERS.pm.email, USERS.pm.password);
  project = await seedProject(api, { name: `E2E Gantt ${Date.now()}`, startDate: '2026-03-01', endDate: '2026-12-31' });
  const phaseId = await seedPhase(api, project.id, { name: 'Structure', startDate: '2026-03-01', endDate: '2026-09-30' });
  taskA = await seedTask(api, project.id, { title: `Excavate ${Date.now()}`, phaseId, startDate: '2026-03-05', dueDate: '2026-04-05' });
  taskB = await seedTask(api, project.id, {
    title: `Pour footings ${Date.now()}`, phaseId, startDate: '2026-04-10', dueDate: '2026-05-10',
    dependsOnTaskIds: [taskA.id],
  });
});

test.afterAll(async () => {
  await deleteProject(api, project.id);
  await api.ctx.dispose();
});

test('TC-23-001: task bars render in the Gantt lane with a dependency arrow', async ({ page }) => {
  test.setTimeout(120000);
  await fillLogin(page, USERS.pm.email, USERS.pm.password);
  await page.goto('/pm/schedule', { waitUntil: 'domcontentloaded' });
  await selectProject(page, project.name);

  // Both task bars render in the Gantt lane.
  await expect(page.getByText(taskA.title)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(taskB.title)).toBeVisible();

  // The dependency arrow (FS) is drawn in the SVG overlay.
  await expect(page.locator('svg path[marker-end="url(#dep-arrow)"]').first()).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: '/tmp/pm-gantt-tasks.png', fullPage: true });

  // Clicking a task bar opens its detail page.
  await page.getByText(taskA.title).click();
  await expect(page).toHaveURL(new RegExp(`/pm/tasks/${taskA.id}$`), { timeout: 15000 });
});
