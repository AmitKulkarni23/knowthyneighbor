import { createSupabaseClient } from '@/config/supabase';
import type { User } from '@supabase/supabase-js';

export async function signInWithOtp(email: string): Promise<{ error: string | null }> {
  const supabase = createSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<{ error: string | null }> {
  const supabase = createSupabaseClient();
  const { error } = await supabase.auth.signOut();
  return { error: error?.message ?? null };
}

export async function getCurrentUser(): Promise<{ user: User | null; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error: error?.message ?? null };
}
