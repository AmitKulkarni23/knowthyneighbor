import { createSupabaseClient } from '@/config/supabase';

export type BrowseCouple = {
  couple_id: string;
  couple_name: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip_code: string | null;
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

  return { couples: data ?? [], error: error?.message ?? null };
}
