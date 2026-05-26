import { test, expect } from '@playwright/test';
import { fillLogin, USERS } from './helpers';

// /site-eng/dashboard migrated from static placeholder values to the real
// member-scoped GET /dashboard/site-eng (StatCards + throughput / status charts).

test('TC-26-001: engineer dashboard renders real stat cards', async ({ page }, testInfo) => {
  await fillLogin(page, USERS.engineer.email, USERS.engineer.password);
  await page.goto('/site-eng/dashboard', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('My Projects', { exact: true })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('My Open Tasks', { exact: true })).toBeVisible();
  await expect(page.getByText('Open Issues', { exact: true })).toBeVisible();
  await expect(page.getByText('My Reports', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'My task throughput' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'My open tasks by status' })).toBeVisible();
  // The "My Projects" card shows the member-scoped project count (≥ 1 for the seeded engineer).
  await expect(page.getByText('Assigned to you')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('site-eng-dashboard.png'), fullPage: true });
});
