import { createSupabaseClient } from '@/config/supabase';
import { logger } from '@/lib/logger';
import type { Profile } from '@/types/database';

type CreateProfileData = {
  full_name: string;
  age: number;
};

type UpdateProfileData = Partial<CreateProfileData & { avatar_url: string }>;

export async function createProfile(data: CreateProfileData): Promise<{ profile: Profile | null; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { profile: null, error: 'Not authenticated' };

  const { data: profile, error } = await supabase
    .from('profiles')
    .insert({ ...data, id: user.user.id })
    .select()
    .single();

  if (error) logger.error('createProfile failed', { code: error.code, message: error.message });
  return { profile, error: error?.message ?? null };
}

export async function getProfile(id: string): Promise<{ profile: Profile | null; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) logger.error('getProfile failed', { profileId: id, code: error.code, message: error.message });
  return { profile, error: error?.message ?? null };
}

export async function updateProfile(
  id: string,
  data: UpdateProfileData
): Promise<{ profile: Profile | null; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) logger.error('updateProfile failed', { profileId: id, code: error.code, message: error.message });
  return { profile, error: error?.message ?? null };
}
