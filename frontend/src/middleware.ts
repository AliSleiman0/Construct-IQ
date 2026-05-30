import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Single-responsibility auth gate. NOT a security boundary — that's the
 * NestJS JwtAuthGuard. This is just a fast Edge-runtime redirect for
 * unauthenticated visitors so they don't see a flash of protected chrome.
 *
 * Responsibilities:
 *   1. Forward the current pathname as `x-pathname` so the (app)/layout.tsx
 *      Server Component can do role-prefix gating.
 *   2. If not on a public path and `logged_in` cookie is missing, redirect
 *      to /login?from=<pathname>.
 *   3. Anything else (role checks, SA org-select, permission checks) is
 *      handled downstream — middleware does NOT decode JWTs.
 */

const PUBLIC_PATHS = new Set(['/', '/login', '/post-login']);

const isPublicPath = (pathname: string): boolean =>
  PUBLIC_PATHS.has(pathname) || pathname.startsWith('/portal/');

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  const loggedIn = request.cookies.get('logged_in')?.value === 'true';

  // Already authenticated visitor on /login: bounce to /post-login, which
  // resolves the user's role server-side and redirects to the right home.
  if (pathname === '/login' && loggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = '/post-login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (!loggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|images|api/).*)'],
};
