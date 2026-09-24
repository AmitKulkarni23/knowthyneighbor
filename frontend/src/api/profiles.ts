import { createSupabaseClient } from '@/config/supabase';
import type { Profile } from '@/types/database';

type CreateProfileData = {
  full_name: string;
  age: number;
  has_kids: boolean;
  num_kids: number;
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

  return { profile, error: error?.message ?? null };
}

export async function getProfile(id: string): Promise<{ profile: Profile | null; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

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
    .single();

  return { profile, error: error?.message ?? null };
}
