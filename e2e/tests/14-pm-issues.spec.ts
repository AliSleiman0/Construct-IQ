import { test, expect } from '@playwright/test';
import { fillLogin, apiLogin, seedProject, USERS, API, type ApiSession } from './helpers';

// /pm/issues is the org-wide triage console: server-paged/sorted/filtered dense
// table (default) + card toggle + summary chips + bulk actions. Seeds real issues
// via API, then drives the console UI.

let s: ApiSession;
let projectId = '';
let issueId = '';
const TITLE = `E2E Issue ${Date.now()}`;
const PFX = `E2ETRIAGE${Date.now()}`; // unique prefix to isolate console-test issues via search
const seeded: string[] = [];

async function seedIssue(data: Record<string, unknown>): Promise<string> {
  const res = await s.ctx.post(`${API}/issues`, { headers: s.orgHeaders, data: { projectId, ...data } });
  const body = await res.json();
  return body?.data?.id ?? body?.data?._id;
}

test.beforeAll(async () => {
  s = await apiLogin(USERS.pm.email, USERS.pm.password);
  const proj = await seedProject(s, { status: 'ACTIVE' });
  projectId = proj.id;

  issueId = await seedIssue({
    title: TITLE, description: 'Seeded by e2e', type: 'QUALITY', severity: 'HIGH',
    location: 'Floor 9', trade: 'Structural',
  });

  // A prefixed set for the console test (search isolates them regardless of org volume).
  seeded.push(await seedIssue({ title: `${PFX} Scaffold unsafe`, type: 'SAFETY', severity: 'CRITICAL' }));
  seeded.push(await seedIssue({ title: `${PFX} Rebar spacing`, type: 'QUALITY', severity: 'MEDIUM' }));
  seeded.push(await seedIssue({ title: `${PFX} Paint touch-up`, type: 'GENERAL', severity: 'LOW' }));
});

test.afterAll(async () => {
  for (const id of [issueId, ...seeded]) {
    if (id) await s.ctx.delete(`${API}/issues/${id}`, { headers: s.orgHeaders }).catch(() => null);
  }
  if (projectId) await s.ctx.delete(`${API}/projects/${projectId}`, { headers: s.orgHeaders }).catch(() => null);
  await s.ctx.dispose();
});

const SEARCH = 'Search title, location, trade…';

// The search box is a controlled input; typing before React hydrates loses the
// value. Wait for the table to populate (⇒ hydrated) then retry-fill until it sticks.
async function searchFor(page: import('@playwright/test').Page, text: string) {
  const box = page.getByPlaceholder(SEARCH);
  await expect(box).toBeVisible({ timeout: 30000 });
  await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 30000 });
  await expect(async () => {
    await box.fill(text);
    await expect(box).toHaveValue(text, { timeout: 1000 });
  }).toPass({ timeout: 15000 });
}

test('triage console: table → detail → comment → resolve', async ({ page }) => {
  await fillLogin(page, USERS.pm.email, USERS.pm.password);
  await page.goto('/pm/issues', { waitUntil: 'domcontentloaded' });

  // Narrow to the seeded issue via search (org-wide list is paginated).
  await searchFor(page, TITLE);
  await expect(page.getByText(TITLE)).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: '/tmp/pm-issues-list.png', fullPage: true });

  // Row click → detail.
  await page.getByText(TITLE).click();
  await expect(page).toHaveURL(new RegExp(`/pm/issues/${issueId}`));
  await expect(page.getByText('Reported by')).toBeVisible();
  await expect(page.getByText('Comments (0)')).toBeVisible();

  const body = `e2e comment ${Date.now()}`;
  await page.getByPlaceholder('Add a comment…').fill(body);
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText(body)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Comments (1)')).toBeVisible();

  await page.getByRole('button', { name: 'Mark resolved' }).click();
  await expect(page.getByRole('button', { name: 'Reopen' })).toBeVisible({ timeout: 15000 });
});

test('triage console: dense table, sort, bulk resolve, card toggle', async ({ page }) => {
  await fillLogin(page, USERS.pm.email, USERS.pm.password);
  await page.goto('/pm/issues', { waitUntil: 'domcontentloaded' });

  // Isolate the prefixed set via search; toHaveCount retries until the debounced
  // fetch narrows the list to our 3 seeded issues.
  await searchFor(page, PFX);
  await expect(page.locator('tbody tr')).toHaveCount(3, { timeout: 15000 });

  // Dense table columns are present (exact: 'Age' would otherwise match "p[age]").
  await expect(page.getByRole('columnheader', { name: 'Sev', exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Assignee', exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Age', exact: true })).toBeVisible();

  // Smart default sort floats the CRITICAL issue to the first row.
  await expect(page.locator('tbody tr').first()).toContainText('Scaffold unsafe');
  await page.screenshot({ path: '/tmp/pm-issues-console.png', fullPage: true });

  // Sorting by Age re-queries with sort=createdAt.
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/issues?') && /sort=createdAt/.test(r.url())),
    page.getByRole('columnheader', { name: 'Age' }).getByRole('button').click(),
  ]);

  // Select all (the searched set) → bulk Resolve.
  await page.getByRole('checkbox', { name: 'Select all on page' }).check();
  await expect(page.getByText(/\d+ selected/)).toBeVisible();
  await page.getByRole('button', { name: 'Set status' }).click();
  await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/issues/bulk') && r.request().method() === 'PATCH'),
    page.getByRole('menuitem', { name: 'Resolved' }).click(),
  ]);
  // After bulk-resolve the rows render the Resolved status.
  await expect(page.getByText('Resolved').first()).toBeVisible({ timeout: 15000 });

  // Toggle to card view.
  await page.getByRole('button', { name: 'Card view' }).click();
  await expect(page.getByText(`${PFX} Scaffold unsafe`)).toBeVisible();
});
