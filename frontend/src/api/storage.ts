import { createSupabaseClient } from '@/config/supabase';
import { logger } from '@/lib/logger';
import { toUserMessage } from '@/lib/errors';

// Must match the avatars bucket's allowed_mime_types and storage policy
const AVATAR_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// Uploads to `<uid>/avatar.<ext>` and returns that path, which is what profiles.avatar_url stores
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<{ path: string | null; error: string | null }> {
  const fileExt = AVATAR_EXTENSIONS[file.type];
  if (!fileExt) return { path: null, error: 'Photo must be a JPEG, PNG or WebP image' };

  const supabase = createSupabaseClient();
  const filePath = `${userId}/avatar.${fileExt}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true, contentType: file.type });

  if (error) {
    logger.error('uploadAvatar failed', { userId, filePath, message: error.message });
    return { path: null, error: toUserMessage(error) };
  }

  return { path: filePath, error: null };
}

export function getAvatarPublicUrl(path: string): string {
  const supabase = createSupabaseClient();
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(path);

  return data.publicUrl;
}
