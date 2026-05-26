import { test, expect } from '@playwright/test';
import { fillLogin, apiLogin, seedProject, deleteProject, USERS } from './helpers';

// /pm/projects gained a "New Project" button + client-side search / status filter / sort.
test('PM projects list: create + search + filter + sort', async ({ page }) => {
  const name = `E2E PM List ${Date.now()}`;

  await fillLogin(page, USERS.pm.email, USERS.pm.password);
  await page.goto('/pm/projects', { waitUntil: 'domcontentloaded' });

  // Wait for the table to populate — proves React hydrated and the projects query
  // resolved, so the New Project click below won't land in the pre-hydration gap.
  await expect(page.getByRole('table')).toBeVisible({ timeout: 30000 });

  // The gated "New Project" button shows for a PM (manage:projects ⊇ create:projects).
  const newBtn = page.getByRole('button', { name: 'New Project' });
  await expect(newBtn).toBeVisible();

  // Create a uniquely-named scratch project through the modal.
  const dialog = page.getByRole('dialog');
  for (let attempt = 0; attempt < 3; attempt++) {
    await newBtn.click();
    try {
      await expect(dialog).toBeVisible({ timeout: 4000 });
      break;
    } catch {
      /* handler may not have bound yet — retry */
    }
  }
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Project Name').fill(name);
  await dialog.getByRole('button', { name: 'Create Project' }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });

  // The new row appears in the table (name renders as a link to the detail page).
  const row = page.getByRole('link', { name });
  await expect(row).toBeVisible({ timeout: 15000 });

  // Search narrows to the created project; a gibberish query yields the empty state.
  const searchBox = page.getByPlaceholder('Search projects…');
  await searchBox.fill(name);
  await expect(row).toBeVisible();
  await searchBox.fill('zzz-no-such-project-zzz');
  await expect(page.getByText('No projects match your filters')).toBeVisible();
  await searchBox.fill('');

  // Status filter: the created project is PLANNING, so filtering to Cancelled hides it.
  await page.getByLabel('Status').selectOption('CANCELLED');
  await expect(row).toBeHidden();
  await page.getByLabel('Status').selectOption('PLANNING');
  await expect(row).toBeVisible();
  await page.getByLabel('Status').selectOption('');

  // Sort control: switch to Name and toggle direction — table stays rendered, row persists.
  await page.getByLabel('Sort by').selectOption('name');
  await page.getByRole('button', { name: 'Toggle sort direction' }).click();
  await expect(row).toBeVisible();

  await page.screenshot({ path: '/tmp/pm-projects-list.png', fullPage: true });

  // Best-effort teardown so scratch projects don't accumulate.
  const s = await apiLogin(USERS.pm.email, USERS.pm.password);
  const res = await s.ctx.get('http://localhost:4000/api/v1/projects', { headers: s.orgHeaders });
  const created = (await res.json())?.data?.find((p: any) => p.name === name);
  if (created) await deleteProject(s, created.id ?? created._id);
});

// TC-17-002: inline edit a project from the PM list via the pencil affordance.
test('PM projects list: inline edit (pencil → rename → persists)', async ({ page }) => {
  const s = await apiLogin(USERS.pm.email, USERS.pm.password);
  const orig = `E2E Edit ${Date.now()}`;
  const renamed = `${orig} RENAMED`;
  const proj = await seedProject(s, { name: orig, status: 'PLANNING' });

  try {
    await fillLogin(page, USERS.pm.email, USERS.pm.password);
    await page.goto('/pm/projects', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('table')).toBeVisible({ timeout: 30000 });

    // Narrow to the seeded row so the pencil is unambiguous.
    await page.getByPlaceholder('Search projects…').fill(orig);
    await expect(page.getByRole('link', { name: orig })).toBeVisible({ timeout: 15000 });

    // Click the pencil (aria-label `Edit <name>`); retry through the hydration gap.
    const editBtn = page.getByRole('button', { name: `Edit ${orig}` });
    const dialog = page.getByRole('dialog');
    await expect(async () => {
      await editBtn.click();
      await expect(dialog).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 20000 });

    // Modal is pre-filled with the project; rename + save.
    const nameField = dialog.getByLabel('Project Name');
    await expect(nameField).toHaveValue(orig);
    await nameField.fill(renamed);
    await dialog.getByRole('button', { name: 'Save Changes' }).click();
    await expect(dialog).toBeHidden({ timeout: 15000 });

    // Renamed row shows immediately and survives a reload (server persisted it).
    await page.getByPlaceholder('Search projects…').fill(renamed);
    await expect(page.getByRole('link', { name: renamed })).toBeVisible({ timeout: 15000 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('Search projects…').fill(renamed);
    await expect(page.getByRole('link', { name: renamed })).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: '/tmp/pm-projects-edit.png', fullPage: true });
  } finally {
    await deleteProject(s, proj.id);
  }
});
