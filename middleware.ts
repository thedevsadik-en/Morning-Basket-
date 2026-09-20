import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: ['/admin/:path*', '/admin', '/login'],
};

// Edge-compatible HMAC-SHA256 calculation
async function getExpectedToken(username: string, pass: string): Promise<string> {
  const secret = process.env.AUTH_SECRET || pass;
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(username)
  );

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const adminUser = (process.env.ADMIN_USERNAME || '').trim();
  const adminPass = (process.env.ADMIN_PASSWORD || '').trim();
  const authCookie = req.cookies.get('mb_admin_auth');

  if (!adminUser || !adminPass) {
    console.error('[Middleware] Missing ADMIN_USERNAME or ADMIN_PASSWORD in environment variables.');
    return NextResponse.next();
  }

  const expectedToken = await getExpectedToken(adminUser, adminPass);
  const isAuthenticated = Boolean(authCookie?.value && authCookie.value === expectedToken);

  // 1. If unauthenticated and visiting /admin -> Redirect to /login with target return URL
  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('from', `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 2. If already authenticated and visiting /login -> Forward to target or /admin
  if (pathname === '/login' && isAuthenticated) {
    const returnTarget = req.nextUrl.searchParams.get('from') || '/admin';
    return NextResponse.redirect(new URL(returnTarget, req.url));
  }

  return NextResponse.next();
}