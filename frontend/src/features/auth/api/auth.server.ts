import 'server-only';
import type { AuthUser } from '@/types/auth.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface Envelope<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

/**
 * Server-side fetch of the current user. Forwards the inbound cookie header
 * so the backend's JwtAuthGuard sees the access_token httpOnly cookie.
 *
 * `cache: 'no-store'` prevents Next.js from caching the response across
 * requests — auth state must always be live.
 */
export async function fetchMeServer(cookieHeader: string): Promise<AuthUser | null> {
  if (!cookieHeader) return null;
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        cookie: cookieHeader,
        accept: 'application/json',
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const body = (await res.json()) as Envelope<AuthUser> | AuthUser;
    if (body && typeof body === 'object' && 'data' in body) {
      return (body as Envelope<AuthUser>).data;
    }
    return body as AuthUser;
  } catch {
    return null;
  }
}
