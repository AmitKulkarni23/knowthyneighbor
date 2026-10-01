import { createSupabaseClient } from '@/config/supabase';
import { logger } from '@/lib/logger';
import { toUserMessage } from '@/lib/errors';

// Anonymous browse results carry no ids or names
export type BrowseCouple = {
  bio: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
};

// City-only on purpose: zip search let anonymous scrapers map bios to zip codes
export async function browseCouplesPublic(
  city: string
): Promise<{ couples: BrowseCouple[]; total: number; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.rpc('browse_couples_public', { search_city: city });

  if (error) logger.error('browseCouplesPublic failed', { city, code: error.code, message: error.message });
  return { couples: data ?? [], total: data?.[0]?.total_count ?? 0, error: toUserMessage(error) };
}
