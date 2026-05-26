import { expect, request, type Page, type APIRequestContext } from '@playwright/test';

// Defaults to :4001 (the backend the :3001 frontend proxies to via .env.local).
// Override with E2E_API for a different target.
export const API = process.env.E2E_API || 'http://localhost:4001/api/v1';

export const USERS = {
  superAdmin: { email: 'admin@constructiq.com', password: 'Admin@1234' },
  orgAdmin: { email: 'orgadmin@constructiq.com', password: 'Demo@1234' },
  pm: { email: 'pm@constructiq.com', password: 'Demo@1234' },
  qs: { email: 'qs@constructiq.com', password: 'Demo@1234' }, // SURVEYOR — manage:budget
  procurement: { email: 'procurement@constructiq.com', password: 'Demo@1234' }, // manage suppliers/POs/deliveries
  engineer: { email: 'engineer@constructiq.com', password: 'Demo@1234' }, // SITE_ENG — member-scoped reports/issues/tasks
  client: { email: 'client@constructiq.com', password: 'Demo@1234' },
};

export const sel = {
  emailInput: 'input[type="email"]',
  passwordInput: 'input[type="password"]',
  submitBtn: 'button[type="submit"]',
};

/** Log in through the UI and wait until we've left /login. */
export async function fillLogin(page: Page, email: string, password: string) {
  // Dev-mode first compile of a route can take tens of seconds — be generous and
  // don't block on the hero image ('load'); domcontentloaded is enough to interact.
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(30000);
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  // Clicking before React hydrates submits the form natively (GET ?email=&password=)
  // and reloads /login — which then arrives hydrated. Retry until the SPA handler runs.
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.locator(sel.emailInput).fill(email);
    await page.locator(sel.passwordInput).fill(password);
    await page.locator(sel.submitBtn).click();
    try {
      await expect(page).not.toHaveURL(/\/login/, { timeout: 12000 });
      return;
    } catch {
      await page.waitForLoadState('domcontentloaded').catch(() => null);
    }
  }
  await expect(page).not.toHaveURL(/\/login/, { timeout: 12000 });
}

export interface ApiSession {
  ctx: APIRequestContext;
  orgId: string;
  /** Headers carrying the multi-tenant org id for write calls. */
  orgHeaders: Record<string, string>;
}

/** Authenticated API context (httpOnly cookies are stored + resent by the context). */
export async function apiLogin(email: string, password: string): Promise<ApiSession> {
  const ctx = await request.newContext();
  const res = await ctx.post(`${API}/auth/login`, { data: { email, password } });
  const body = await res.json();
  const orgId: string = body?.data?.user?.organizationId ?? body?.data?.organizationId ?? '';
  return { ctx, orgId, orgHeaders: { 'X-Organization-Id': orgId } };
}

/** Create a scratch project owned by the session's org. */
export async function seedProject(
  s: ApiSession,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; name: string }> {
  const name = `E2E ${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
  const res = await s.ctx.post(`${API}/projects`, {
    headers: s.orgHeaders,
    data: { name, code: 'E2E', status: 'PLANNING', ...overrides },
  });
  const body = await res.json();
  const id = body?.data?.id ?? body?.data?._id;
  return { id, name: (overrides.name as string) ?? name };
}

export async function seedTask(
  s: ApiSession,
  projectId: string,
  overrides: Record<string, unknown> = {},
): Promise<{ id: string; title: string }> {
  const title = (overrides.title as string) ?? `E2E task ${Date.now()}`;
  const res = await s.ctx.post(`${API}/tasks`, {
    headers: s.orgHeaders,
    data: { title, projectId, status: 'TODO', priority: 'MEDIUM', ...overrides },
  });
  const body = await res.json();
  return { id: body?.data?.id ?? body?.data?._id, title };
}

export async function deleteProject(s: ApiSession, id: string) {
  if (!id) return;
  await s.ctx.delete(`${API}/projects/${id}`, { headers: s.orgHeaders }).catch(() => null);
}

/** Create a milestone on a project. Returns its id. */
export async function seedMilestone(
  s: ApiSession,
  projectId: string,
  data: { name: string; targetDate: string; isMajor?: boolean },
): Promise<string> {
  const res = await s.ctx.post(`${API}/projects/${projectId}/milestones`, {
    headers: s.orgHeaders,
    data: { status: 'PENDING', ...data },
  });
  const body = await res.json();
  return body?.data?.id ?? body?.data?._id;
}

/** Create a phase with dates on a project. Returns its id. */
export async function seedPhase(
  s: ApiSession,
  projectId: string,
  data: { name: string; startDate: string; endDate: string; dependsOnPhaseIds?: string[] },
): Promise<string> {
  const res = await s.ctx.post(`${API}/projects/${projectId}/phases`, { headers: s.orgHeaders, data });
  const body = await res.json();
  return body?.data?.id ?? body?.data?._id;
}

/** The logged-in user's own id (GET /users/me). */
export async function apiMeId(s: ApiSession): Promise<string> {
  const res = await s.ctx.get(`${API}/users/me`, { headers: s.orgHeaders });
  const body = await res.json();
  return body?.data?.id ?? body?.data?._id;
}

/** Add a user to a project (needs assign:project_members). */
export async function addProjectMember(s: ApiSession, projectId: string, userId: string, role = 'Member') {
  await s.ctx.post(`${API}/projects/${projectId}/members`, {
    headers: s.orgHeaders,
    data: { userId, role },
  }).catch(() => null);
}

/** Create a budget for a project (needs manage:budget). Returns the budget id. */
export async function seedBudget(s: ApiSession, projectId: string, totalAmount: number): Promise<string> {
  const res = await s.ctx.post(`${API}/budget`, {
    headers: s.orgHeaders,
    data: { projectId, totalAmount, currency: 'USD' },
  });
  const body = await res.json();
  return body?.data?.id ?? body?.data?._id;
}

export async function addBudgetLine(s: ApiSession, budgetId: string, category: string, plannedAmount: number) {
  await s.ctx.post(`${API}/budget/${budgetId}/lines`, {
    headers: s.orgHeaders,
    data: { category, plannedAmount },
  });
}

/** Create a supplier (needs manage:suppliers). Returns its id. */
export async function seedSupplier(s: ApiSession, name: string): Promise<string> {
  const res = await s.ctx.post(`${API}/suppliers`, { headers: s.orgHeaders, data: { name } });
  const body = await res.json();
  return body?.data?.id ?? body?.data?._id;
}

/** Create a purchase order (needs create/manage:purchase_orders). Returns { id, poNumber }. */
export async function seedPO(
  s: ApiSession,
  data: { projectId: string; supplierId: string; status?: string },
): Promise<{ id: string; poNumber: string }> {
  const poNumber = `PO-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
  const res = await s.ctx.post(`${API}/purchase-orders`, {
    headers: s.orgHeaders,
    data: { poNumber, orderDate: '2026-05-01', totalAmount: 50000, ...data },
  });
  const body = await res.json();
  return { id: body?.data?.id ?? body?.data?._id, poNumber };
}

/** Choose a project in the board/timeline MUI Select by visible name. */
export async function selectProject(page: Page, name: string) {
  // The visible, clickable element of a MUI Select is `.MuiSelect-select`
  // (getByRole('combobox') can resolve to the hidden input and never open the menu).
  const trigger = page.locator('.MuiSelect-select').first();
  await trigger.waitFor({ state: 'visible', timeout: 30000 });
  // The Select is disabled={noProjects} until useProjects() resolves and it
  // auto-selects the first project — wait for that, else the click is a no-op.
  await expect(trigger).toBeEnabled({ timeout: 30000 });
  await expect(trigger).not.toHaveText('', { timeout: 30000 });
  await trigger.click();
  const listbox = page.getByRole('listbox');
  await listbox.waitFor({ state: 'visible', timeout: 10000 });
  await listbox.getByRole('option', { name }).click();
  await listbox.waitFor({ state: 'hidden', timeout: 10000 });
}

/**
 * Choose an option in the FIRST MUI Select inside the open dialog (the Status
 * field in the task/project edit modals). The modal selects expose no reliable
 * accessible name, so target by position + the visible `.MuiSelect-select`.
 */
export async function chooseDialogStatus(page: Page, optionName: string) {
  const dialog = page.getByRole('dialog');
  await dialog.locator('.MuiSelect-select').first().click();
  const listbox = page.getByRole('listbox');
  await listbox.waitFor({ state: 'visible', timeout: 10000 });
  await listbox.getByRole('option', { name: optionName }).click();
  await listbox.waitFor({ state: 'hidden', timeout: 10000 });
}
