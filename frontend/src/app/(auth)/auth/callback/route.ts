import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/config/supabase-server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user has a profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (!profile) {
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
