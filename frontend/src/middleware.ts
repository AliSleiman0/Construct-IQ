import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/'];
const AUTH_PATHS = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const loggedIn = request.cookies.get('logged_in')?.value === 'true';
  const isSuperAdmin = request.cookies.get('is_super_admin')?.value === 'true';
  const selectedCompany = request.cookies.get('selected_company')?.value;

  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/'),
  );
  const isAuthPath = AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/'),
  );
  const isCompanySelectPath = pathname === '/company-select';

  // Unauthenticated user → login (but not for public paths)
  if (!loggedIn && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user on auth page (login) → redirect appropriately
  if (loggedIn && isAuthPath) {
    if (isSuperAdmin) {
      return NextResponse.redirect(new URL('/company-select', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Super Admin without a selected company → must pick one first
  if (loggedIn && isSuperAdmin && !selectedCompany && !isCompanySelectPath) {
    return NextResponse.redirect(new URL('/company-select', request.url));
  }

  // Super Admin already has a company selected → don't show the picker again
  if (loggedIn && isSuperAdmin && selectedCompany && isCompanySelectPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|images|api/).*)',
  ],
};
