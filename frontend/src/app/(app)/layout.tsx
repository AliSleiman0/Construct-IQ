import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { fetchMeServer } from '@/features/auth/api/auth.server';
import { ROLE_HOME, ROLE_PREFIX, roleFromUser } from '@/config/roles';
import { AuthHydrator } from '@/features/auth/components/AuthHydrator';
import { AppLayoutClient } from '@/components/shared/AppLayoutClient';
import { AppProviders } from '@/providers';

const SHARED_AUTHED_PATHS = ['/profile', '/settings'];

const isSharedAuthedPath = (pathname: string): boolean =>
  SHARED_AUTHED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/**
 * Authoritative authenticated layout. Runs on every full page load of any
 * (app)/* route. Validates the session against the backend and enforces
 * role-prefix routing. The result is passed to AuthHydrator so client-side
 * state is correct on first paint with no async fetch on mount.
 *
 * Security: this layer trusts the backend's /auth/me response. The backend
 * is the only authoritative auth check — the redirects here are UX.
 */
export default async function AppRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieHeader = cookies().toString();
  const pathname = headers().get('x-pathname') ?? '/';

  const user = await fetchMeServer(cookieHeader);
  if (!user) {
    // /api/auth/clear wipes stale auth cookies before bouncing to /login,
    // otherwise middleware would just send the user back to /post-login.
    redirect(`/api/auth/clear?from=${encodeURIComponent(pathname)}`);
  }

  const role = roleFromUser(user.roles);
  if (!role) {
    // Authenticated but no role mapped — invalid session. Clear and exit.
    redirect('/api/auth/clear');
  }

  // Role-prefix gating. Profile and settings are shared across all roles.
  if (!isSharedAuthedPath(pathname) && !pathname.startsWith(ROLE_PREFIX[role])) {
    redirect(ROLE_HOME[role]);
  }

  return (
    <AppProviders>
      <AuthHydrator user={user}>
        <AppLayoutClient>{children}</AppLayoutClient>
      </AuthHydrator>
    </AppProviders>
  );
}

export const dynamic = 'force-dynamic';
