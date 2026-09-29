import { createSupabaseClient } from '@/config/supabase';

export type BrowseCouple = {
  couple_id: string;
  couple_name: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  distance_miles: number;
  has_availability: boolean;
};

export async function browseCouplesPublic(
  lat: number,
  lng: number
): Promise<{ couples: BrowseCouple[]; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.rpc('browse_couples_public', {
    ref_lat: lat,
    ref_lng: lng,
  });

  return { couples: data ?? [], error: error?.message ?? null };
}
