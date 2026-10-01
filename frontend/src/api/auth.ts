import { createSupabaseClient } from '@/config/supabase';
import { logger } from '@/lib/logger';
import { toUserMessage } from '@/lib/errors';

// `next` (e.g. a partner invite page) is kept in a cookie for /auth/callback, not in
// emailRedirectTo: Supabase matches redirect URLs exactly, so a query string falls back
// to site_url. PKCE already requires the link to open in this browser, so a cookie is fine.
export async function signInWithOtp(email: string, next?: string | null): Promise<{ error: string | null }> {
  const supabase = createSupabaseClient();
  document.cookie = next
    ? `auth_next=${encodeURIComponent(next)}; path=/; max-age=3600; samesite=lax`
    : 'auth_next=; path=/; max-age=0';
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) logger.error('signInWithOtp failed', { status: error.status, code: error.code, message: error.message });
  return { error: toUserMessage(error) };
}

export async function signOut(): Promise<{ error: string | null }> {
  const supabase = createSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) logger.error('signOut failed', { message: error.message });
  return { error: toUserMessage(error) };
}
