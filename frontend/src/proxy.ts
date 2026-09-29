import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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
  if (process.env.NEXT_PUBLIC_SKIP_AUTH === 'true' || process.env.NEXT_PUBLIC_MSW === 'true') {
    // Redirect /login straight to /discover when auth is skipped
    if (process.env.NEXT_PUBLIC_SKIP_AUTH === 'true' && request.nextUrl.pathname === '/login') {
      return NextResponse.redirect(new URL('/discover', request.url));
    }
    return supabaseResponse;
  }

  // Refresh the session so it stays alive
  const { data: { user } } = await supabase.auth.getUser();

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
      pathname.startsWith('/availability')) {
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

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.css$).*)',
  ],
};
