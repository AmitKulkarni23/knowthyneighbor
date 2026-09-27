import { createSupabaseClient } from '@/config/supabase';
import type { DiscoveryCouple } from '@/types/database';

export async function discoverCouples(
  userCoupleId: string,
  refLat?: number,
  refLng?: number
): Promise<{ couples: DiscoveryCouple[]; error: string | null }> {
  const supabase = createSupabaseClient();
  const params: Record<string, unknown> = { user_couple_id: userCoupleId };
  if (refLat != null && refLng != null) {
    params.ref_lat = refLat;
    params.ref_lng = refLng;
  }
  const { data, error } = await supabase.rpc('discover_couples', params);

  return { couples: data ?? [], error: error?.message ?? null };
}
