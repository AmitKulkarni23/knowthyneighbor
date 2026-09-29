import { createSupabaseClient } from '@/config/supabase';
import { logger } from '@/lib/logger';

export async function uploadAvatar(
  userId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const supabase = createSupabaseClient();
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}/avatar.${fileExt}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (error) {
    logger.error('uploadAvatar failed', { userId, filePath, message: error.message });
    return { url: null, error: error.message };
  }

  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  return { url: data.publicUrl, error: null };
}

export function getAvatarUrl(userId: string): string {
  const supabase = createSupabaseClient();
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(`${userId}/avatar`);

  return data.publicUrl;
}
