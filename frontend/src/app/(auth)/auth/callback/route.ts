import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/config/supabase-server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  // Where to land after sign-in (cookie set by signInWithOtp). Same-origin only, or this is an open redirect.
  const nextUrl = new URL(request.cookies.get('auth_next')?.value ?? '/discover', request.url);
  const next = nextUrl.origin === new URL(request.url).origin ? nextUrl : new URL('/discover', request.url);

  let errorKey = 'link_expired';
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      // Expired/reused links and links opened in another browser are normal; anything else means sign-in is broken
      if (error.code === 'pkce_code_verifier_not_found') errorKey = 'different_browser';
      if (error.code === 'otp_expired' || error.code === 'flow_state_not_found' || error.code === 'pkce_code_verifier_not_found') {
        logger.warn('auth callback: code exchange rejected', { code: error.code, status: error.status });
      } else {
        logger.error('auth callback: code exchange failed', { code: error.code, status: error.status, error });
      }
    } else {
      // Check if user has a profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) logger.error('auth callback: profile lookup failed', { code: profileError.code, message: profileError.message });
        // An invited partner skips profile creation: claim_partner_invite creates their
        // profile from the details partner 1 entered.
        if (!profile && !profileError && !next.pathname.startsWith('/join/')) {
          return NextResponse.redirect(new URL('/profile/create', request.url));
        }
      }

      const response = NextResponse.redirect(next);
      response.cookies.delete('auth_next');
      return response;
    }
  }

  // Auth error - redirect to login with error context
  const errorDesc = searchParams.get('error_description') ?? errorKey;
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('error', errorDesc);
  return NextResponse.redirect(loginUrl);
}
