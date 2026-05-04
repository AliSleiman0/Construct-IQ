import { NextResponse } from 'next/server';

const AUTH_COOKIES = [
  'logged_in',
  'is_super_admin',
  'access_token',
  'refresh_token',
  'selected_org_id',
];

/**
 * Clears all auth cookies and redirects to /login. Exists to break the
 * /login → /post-login → /login loop that occurs when `logged_in` is set
 * but the access + refresh tokens are dead — Server Components can read
 * cookies but not delete them, so the cleanup happens in this route
 * handler instead.
 *
 * The middleware matcher excludes /api/* so this path is never gated.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const from = requestUrl.searchParams.get('from');

  const loginUrl = new URL('/login', requestUrl.origin);
  if (from) loginUrl.searchParams.set('from', from);

  const response = NextResponse.redirect(loginUrl);
  for (const name of AUTH_COOKIES) {
    response.cookies.delete(name);
  }
  return response;
}
