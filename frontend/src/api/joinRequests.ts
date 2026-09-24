import { createSupabaseClient } from '@/config/supabase';
import type { JoinRequest, MealSlot, RequestStatus } from '@/types/database';

type SendJoinRequestData = {
  requester_couple_id: string;
  host_couple_id: string;
  meal_type: MealSlot;
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
      message: data.message ?? null,
    })
    .select()
    .single();

  return { request, error: error?.message ?? null };
}

export async function getJoinRequests(
  coupleId: string
): Promise<{ received: JoinRequest[]; sent: JoinRequest[]; error: string | null }> {
  const supabase = createSupabaseClient();

  const [receivedResult, sentResult] = await Promise.all([
    supabase
      .from('join_requests')
      .select('*')
      .eq('host_couple_id', coupleId)
      .order('created_at', { ascending: false }),
    supabase
      .from('join_requests')
      .select('*')
      .eq('requester_couple_id', coupleId)
      .order('created_at', { ascending: false }),
  ]);

  const error = receivedResult.error?.message ?? sentResult.error?.message ?? null;
  return {
    received: receivedResult.data ?? [],
    sent: sentResult.data ?? [],
    error,
  };
}

export async function respondToJoinRequest(
  id: string,
  status: RequestStatus
): Promise<{ error: string | null }> {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from('join_requests')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', id);

  return { error: error?.message ?? null };
}
