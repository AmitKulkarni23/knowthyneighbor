import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/config/supabase-server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/discover';

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

      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // Auth error - redirect to login with error
  return NextResponse.redirect(new URL('/login', request.url));
}
