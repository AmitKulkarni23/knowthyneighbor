import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/config/supabase-server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      // Expired/reused links are normal; anything else means sign-in is broken
      if (error.code === 'otp_expired' || error.code === 'flow_state_not_found') {
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
        if (!profile && !profileError) {
          return NextResponse.redirect(new URL('/profile/create', request.url));
        }
      }

      return NextResponse.redirect(new URL('/discover', request.url));
    }
  }

  // Auth error - redirect to login with error context
  const errorDesc = searchParams.get('error_description') ?? 'link_expired';
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('error', errorDesc);
  return NextResponse.redirect(loginUrl);
}
