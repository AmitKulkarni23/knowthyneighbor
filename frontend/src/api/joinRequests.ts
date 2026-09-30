import { createSupabaseClient } from '@/config/supabase';
import { logger } from '@/lib/logger';
import type { JoinRequest, MealSlot, RequestStatus } from '@/types/database';

type SendJoinRequestData = {
  requester_couple_id: string;
  host_couple_id: string;
  meal_type: MealSlot;
  proposed_date: string;
  message?: string;
};

export async function sendJoinRequest(
  data: SendJoinRequestData
): Promise<{ request: JoinRequest | null; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data: request, error } = await supabase
    .from('join_requests')
    .insert({
      requester_couple_id: data.requester_couple_id,
      host_couple_id: data.host_couple_id,
      meal_type: data.meal_type,
      proposed_date: data.proposed_date,
      message: data.message ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error('sendJoinRequest failed', { hostCoupleId: data.host_couple_id, code: error.code, message: error.message });
    return { request: null, error: error.message };
  }

  // Email the host; the function only accepts a fresh request this user just created
  const { error: notifyError } = await supabase.functions.invoke('notify-new-request', {
    body: { join_request_id: request.id },
  });
  if (notifyError) logger.warn('notify-new-request failed', { requestId: request.id, message: notifyError.message });

  return { request, error: null };
}

export type JoinRequestWithCouple = {
  request_id: string;
  direction: 'sent' | 'received';
  other_couple_id: string;
  other_couple_name: string | null;
  meal_type: MealSlot;
  proposed_date: string;
  message: string | null;
  status: RequestStatus;
  created_at: string;
};

// Requests + the other couple's name via RPC — couples_select RLS blocks the
// client from reading another couple's row directly.
export async function getJoinRequests(): Promise<{
  received: JoinRequestWithCouple[];
  sent: JoinRequestWithCouple[];
  error: string | null;
}> {
  const supabase = createSupabaseClient();
  const { data, error: rpcError } = await supabase
    .rpc('get_join_requests_for_user');

  if (rpcError) logger.error('getJoinRequests failed', { code: rpcError.code, message: rpcError.message });

  const all = (data ?? []) as JoinRequestWithCouple[];
  return {
    received: all.filter((r) => r.direction === 'received'),
    sent: all.filter((r) => r.direction === 'sent'),
    error: rpcError?.message ?? null,
  };
}

export async function respondToJoinRequest(
  id: string,
  status: RequestStatus
): Promise<{ error: string | null }> {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from('join_requests')
    .update({ status })
    .eq('id', id);

  if (error) logger.error('respondToJoinRequest failed', { requestId: id, status, code: error.code, message: error.message });
  return { error: error?.message ?? null };
}
