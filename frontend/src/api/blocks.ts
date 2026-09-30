import { createSupabaseClient } from '@/config/supabase';
import { logger } from '@/lib/logger';
import { toUserMessage } from '@/lib/errors';

// Blocking hides both couples from each other, stops messages and new requests,
// and declines any pending requests between them
export async function blockCouple(
  blockerCoupleId: string,
  blockedCoupleId: string
): Promise<{ error: string | null }> {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from('couple_blocks')
    .insert({ blocker_couple_id: blockerCoupleId, blocked_couple_id: blockedCoupleId });

  if (error) logger.error('blockCouple failed', { blockedCoupleId, code: error.code, message: error.message });
  return { error: toUserMessage(error) };
}
