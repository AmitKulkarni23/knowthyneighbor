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

export async function browseCouplesPublic(
  city?: string,
  state?: string,
  country?: string,
  zipCode?: string
): Promise<{ couples: BrowseCouple[]; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.rpc('browse_couples_public', {
    search_city: city || null,
    search_state: state || null,
    search_country: country || null,
    search_zip: zipCode || null,
  });

  if (error) logger.error('browseCouplesPublic failed', { city, state, country, zipCode, code: error.code, message: error.message });
  return { couples: data ?? [], error: toUserMessage(error) };
}
