import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { fetchMeServer } from '@/features/auth/api/auth.server';
import { ROLE_HOME, ROLE_PREFIX, roleFromUser } from '@/config/roles';
import { AuthHydrator } from '@/features/auth/components/AuthHydrator';
import { AppLayoutClient } from '@/components/shared/AppLayoutClient';

const SHARED_AUTHED_PATHS = ['/profile', '/settings', '/company-select'];

const isSharedAuthedPath = (pathname: string): boolean =>
  SHARED_AUTHED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/**
 * Authoritative authenticated layout. Runs on every full page load of any
 * (app)/* route. Validates the session against the backend, enforces role
 * prefix routing, and redirects super admins to /company-select if no org
 * is selected. The result is passed to AuthHydrator so client-side state
 * is correct on first paint with no async fetch on mount.
 *
 * Security: this layer trusts the backend's /auth/me response. The backend
 * is the only authoritative auth check — the redirects here are UX.
 */
export default async function AppRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const cookieHeader = cookieStore.toString();
  const pathname = headers().get('x-pathname') ?? '/';

  const user = await fetchMeServer(cookieHeader);
  if (!user) {
    redirect(`/login?from=${encodeURIComponent(pathname)}`);
  }

  const role = roleFromUser(user.roles);
  if (!role) {
    // User authenticated but has no role mapped to a frontend module.
    // Treat as an invalid session — back to login.
    redirect('/login');
  }

  // Super Admin must pick an organization context before browsing tenanted
  // routes. /company-select itself is the exception.
  const selectedOrgId = cookieStore.get('selected_org_id')?.value;
  if (user.isSuperAdmin && !selectedOrgId && pathname !== '/company-select') {
    redirect('/company-select');
  }

  // Role-prefix gating. Profile, settings, and company-select are shared.
  if (!isSharedAuthedPath(pathname) && !pathname.startsWith(ROLE_PREFIX[role])) {
    redirect(ROLE_HOME[role]);
  }

  return (
    <AuthHydrator user={user}>
      <AppLayoutClient>{children}</AppLayoutClient>
    </AuthHydrator>
  );
}

export const dynamic = 'force-dynamic';
