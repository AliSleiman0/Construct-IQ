import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The `logged_in` cookie is a non-httpOnly flag set by the backend.
  // It is never used to derive identity — it only gates route access.
  // The actual auth tokens (access_token, refresh_token) are httpOnly.
  const loggedIn = request.cookies.get('logged_in')?.value === 'true';

  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/'),
  );

  // Unauthenticated user trying to access protected route
  if (!loggedIn && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user trying to access auth pages
  if (loggedIn && isPublicPath) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Match all routes except Next.js internals, static files, and API proxy routes
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|images|api/).*)',
  ],
};
