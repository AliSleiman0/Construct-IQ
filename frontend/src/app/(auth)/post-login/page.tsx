import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { fetchMeServer } from '@/features/auth/api/auth.server';
import { ROLE_HOME, roleFromUser } from '@/config/roles';

/**
 * Lands here when middleware sees a `logged_in` cookie on /login. Resolves
 * the user's role server-side and redirects to the right home (or
 * /company-select for super admins without a selected org). If the cookie
 * is stale and /auth/me returns 401, send the user back to /login.
 */
export default async function PostLoginPage() {
  const cookieStore = cookies();
  const cookieHeader = cookieStore.toString();

  const user = await fetchMeServer(cookieHeader);
  if (!user) redirect('/login');

  if (user.isSuperAdmin) {
    const selectedOrgId = cookieStore.get('selected_org_id')?.value;
    redirect(selectedOrgId ? ROLE_HOME.SUPER_ADMIN : '/company-select');
  }

  const role = roleFromUser(user.roles);
  if (!role) redirect('/login');

  redirect(ROLE_HOME[role]);
}

export const dynamic = 'force-dynamic';
