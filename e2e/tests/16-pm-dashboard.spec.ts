import { test, expect } from '@playwright/test';
import { fillLogin, USERS } from './helpers';

// /pm/dashboard migrated from hardcoded values to the real /dashboard/pm endpoint.
test('PM dashboard renders real stat cards + charts', async ({ page }) => {
  await fillLogin(page, USERS.pm.email, USERS.pm.password);
  await page.goto('/pm/dashboard', { waitUntil: 'domcontentloaded' });

  // Stat cards.
  for (const label of ['My Projects', 'Open Tasks', 'Issues to Triage', 'Reports This Week']) {
    await expect(page.getByText(label, { exact: true })).toBeVisible({ timeout: 30000 });
  }
  // Chart panels (the budget-per-phase mock chart is gone; throughput + status remain/added).
  await expect(page.getByText('Task throughput', { exact: true })).toBeVisible();
  await expect(page.getByText('Open tasks by status', { exact: true })).toBeVisible();
  await expect(page.getByText('Completed per day, last 7 days')).toBeVisible();
  // The seeded PM has projects, so the count hint reflects real data.
  await expect(page.getByText(/\d+ active/)).toBeVisible();

  await page.screenshot({ path: '/tmp/pm-dashboard.png', fullPage: true });
});
