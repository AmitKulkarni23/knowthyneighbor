import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SKIP_AUTH, MSW_ENABLED } from '@/config/env';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Skip all auth checks when auth is disabled or MSW is enabled
  if (SKIP_AUTH || MSW_ENABLED) {
    // Redirect /login straight to /discover when auth is skipped
    if (SKIP_AUTH && request.nextUrl.pathname === '/login') {
      return NextResponse.redirect(new URL('/discover', request.url));
    }
    return supabaseResponse;
  }

  // Refresh the session so it stays alive. getClaims verifies the JWT locally (cached JWKS)
  // instead of a round trip to Supabase Auth; RLS still checks the token on every query.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const { pathname, searchParams } = request.nextUrl;

  // Magic link PKCE: Supabase redirects to /?code=... but the handler is at /auth/callback
  if (pathname === '/' && searchParams.has('code')) {
    const callbackUrl = new URL('/auth/callback', request.url);
    callbackUrl.searchParams.set('code', searchParams.get('code')!);
    return NextResponse.redirect(callbackUrl);
  }

  // Protected routes: redirect to login if no session
  if (pathname.startsWith('/discover') ||
      pathname.startsWith('/profile') ||
      pathname.startsWith('/couple') ||
      pathname.startsWith('/requests') ||
      pathname.startsWith('/chat') ||
      pathname.startsWith('/availability') ||
      // Invite links: (app)/layout would bounce a logged-out partner to '/', losing the link
      pathname.startsWith('/join/')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect authenticated users away from login (unless showing an auth error)
  if (pathname === '/login' && user && !request.nextUrl.searchParams.has('error')) {
    return NextResponse.redirect(new URL('/discover', request.url));
  }

  return supabaseResponse;
}

// `monitoring` is the Sentry tunnel route (next.config.ts); running auth on it would slow or break error reporting
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|monitoring|favicon.ico|sitemap.xml|robots.txt|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.css$).*)',
  ],
};
