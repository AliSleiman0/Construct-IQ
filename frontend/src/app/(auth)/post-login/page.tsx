import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { fetchMeServer } from '@/features/auth/api/auth.server';
import { ROLE_HOME, roleFromUser } from '@/config/roles';

/**
 * Lands here when middleware sees a `logged_in` cookie on /login. Resolves
 * the user's role server-side and redirects to the right home. If the cookie
 * is stale and /auth/me returns 401, send the user back to /login.
 */
export default async function PostLoginPage() {
  const cookieHeader = cookies().toString();

  const user = await fetchMeServer(cookieHeader);
  // Stale `logged_in` cookie + dead tokens would loop /login → /post-login
  // forever. Route through /api/auth/clear so the cookies get wiped before
  // we hand the user back to /login.
  if (!user) redirect('/api/auth/clear');

  const role = roleFromUser(user.roles);
  if (!role) redirect('/api/auth/clear');

  redirect(ROLE_HOME[role]);
}

export const dynamic = 'force-dynamic';
