import { createSupabaseClient } from '@/config/supabase';
import { logger } from '@/lib/logger';
import { toUserMessage } from '@/lib/errors';
import type { User } from '@supabase/supabase-js';

export async function signInWithOtp(email: string): Promise<{ error: string | null }> {
  const supabase = createSupabaseClient();
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

export async function getCurrentUser(): Promise<{ user: User | null; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) logger.error('getCurrentUser failed', { status: error.status, code: error.code, message: error.message });
  return { user: data.user, error: toUserMessage(error) };
}
