/**
 * Project-membership scoping helpers shared by the list endpoints
 * (issues / reports / tasks).
 *
 * Field roles (Site Engineer, Surveyor, Client, …) must only see data for the
 * projects they are a member of — not every project in the org. Privileged
 * callers (Super Admin, org admins with `manage:company`, and managers holding
 * `manage:<resource>`) keep the org-wide / cross-org view.
 *
 * The decision is permission-based so it works for any role: a caller "sees all
 * projects" iff they are a Super Admin or hold a `manage:*` permission broad
 * enough to cover the resource. Everyone else is restricted to their member
 * projects (mirrors `ProjectsService.findAll` and `DashboardService.getPmDashboard`).
 */
export function seesAllProjects(
  isSuperAdmin: boolean,
  permissions: string[] | undefined,
  resource: string,
): boolean {
  if (isSuperAdmin) return true;
  const p = permissions ?? [];
  return (
    p.includes('manage:all') ||
    p.includes('manage:company') ||
    p.includes(`manage:${resource}`)
  );
}
