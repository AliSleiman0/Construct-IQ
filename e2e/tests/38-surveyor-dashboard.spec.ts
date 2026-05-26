import { test, expect } from '@playwright/test';

// Self-contained: targets the live dev servers (:3000 / :4000) with absolute URLs
// so it doesn't depend on the :3001/:4001 QA env baseURL. Verifies the QS
// dashboard renders REAL data (not the old static 412 / -2.4% literals).
const WEB = process.env.WEB_BASE || 'http://localhost:3000';

test('QS dashboard renders real cost data', async ({ page }) => {
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(30000);

  await page.goto(`${WEB}/login`, { waitUntil: 'domcontentloaded' });
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.locator('input[type="email"]').fill('qs@constructiq.com');
    await page.locator('input[type="password"]').fill('Demo@1234');
    await page.locator('button[type="submit"]').click();
    try {
      await expect(page).not.toHaveURL(/\/login/, { timeout: 12000 });
      break;
    } catch {
      await page.waitForLoadState('domcontentloaded').catch(() => null);
    }
  }

  await page.goto(`${WEB}/surveyor/dashboard`, { waitUntil: 'domcontentloaded' });

  // Real StatCards present (new labels), old static literals gone.
  await expect(page.getByText('BOQ Value', { exact: true })).toBeVisible();
  await expect(page.getByText('Awaiting Certification', { exact: true })).toBeVisible();
  await expect(page.getByText('412')).toHaveCount(0); // old static BOQ count
  await expect(page.getByText('-2.4%')).toHaveCount(0); // old static variance

  // Both chart panels render.
  await expect(page.getByText('Variations by status', { exact: true })).toBeVisible();
  await expect(page.getByText('Valuation value by status', { exact: true })).toBeVisible();

  await page.screenshot({ path: 'test-results/surveyor-dashboard.png', fullPage: true });
});
