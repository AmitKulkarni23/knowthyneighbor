import { createSupabaseClient } from '@/config/supabase';
import type { DiscoveryCouple } from '@/types/database';

export async function discoverCouples(
  userCoupleId: string
): Promise<{ couples: DiscoveryCouple[]; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.rpc('discover_couples', {
    user_couple_id: userCoupleId,
  });

  return { couples: data ?? [], error: error?.message ?? null };
}
