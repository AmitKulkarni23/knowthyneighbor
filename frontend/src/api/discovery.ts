import { createSupabaseClient } from '@/config/supabase';
import { logger } from '@/lib/logger';
import type { DiscoveryCouple } from '@/types/database';

export async function discoverCouples(
  userCoupleId: string,
  searchCity?: string,
  searchZip?: string
): Promise<{ couples: DiscoveryCouple[]; error: string | null }> {
  const supabase = createSupabaseClient();
  const params: Record<string, unknown> = { user_couple_id: userCoupleId };
  if (searchCity) params.search_city = searchCity;
  if (searchZip) params.search_zip = searchZip;
  const { data, error } = await supabase.rpc('discover_couples', params);

  if (error) logger.error('discoverCouples failed', { userCoupleId, searchCity, searchZip, code: error.code, message: error.message });
  return { couples: data ?? [], error: error?.message ?? null };
}
