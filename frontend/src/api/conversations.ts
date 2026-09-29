import { createSupabaseClient } from '@/config/supabase';
import type { Conversation, Message } from '@/types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type ConversationWithNames = Conversation & {
  couple_1_name: string | null;
  couple_2_name: string | null;
};

export async function getConversations(
  coupleId: string
): Promise<{ conversations: ConversationWithNames[]; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('conversations')
    .select('*, couple_1:couples!couple_1_id(couple_name), couple_2:couples!couple_2_id(couple_name)')
    .or(`couple_1_id.eq.${coupleId},couple_2_id.eq.${coupleId}`)
    .order('last_message_at', { ascending: false });

  const conversations: ConversationWithNames[] = (data ?? []).map((row: any) => ({
    id: row.id,
    couple_1_id: row.couple_1_id,
    couple_2_id: row.couple_2_id,
    created_at: row.created_at,
    last_message_at: row.last_message_at,
    couple_1_name: row.couple_1?.couple_name ?? null,
    couple_2_name: row.couple_2?.couple_name ?? null,
  }));

  return { conversations, error: error?.message ?? null };
}

export async function getConversationByCouples(
  coupleId1: string,
  coupleId2: string
): Promise<{ conversation: Conversation | null; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(
      `and(couple_1_id.eq.${coupleId1},couple_2_id.eq.${coupleId2}),and(couple_1_id.eq.${coupleId2},couple_2_id.eq.${coupleId1})`
    )
    .limit(1)
    .maybeSingle();

  return { conversation: data ?? null, error: error?.message ?? null };
}

export async function getMessages(
  conversationId: string
): Promise<{ messages: Message[]; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  return { messages: data ?? [], error: error?.message ?? null };
}

export async function sendMessage(
  conversationId: string,
  body: string
): Promise<{ message: Message | null; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { message: null, error: 'Not authenticated' };

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_profile_id: user.user.id,
      body,
    })
    .select()
    .single();

  return { message, error: error?.message ?? null };
}

export function subscribeToMessages(
  conversationId: string,
  callback: (message: Message) => void
): RealtimeChannel {
  const supabase = createSupabaseClient();
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        callback(payload.new as Message);
      }
    )
    .subscribe();

  return channel;
}
