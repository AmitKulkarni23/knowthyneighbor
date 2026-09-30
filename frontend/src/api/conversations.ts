import { createSupabaseClient } from '@/config/supabase';
import { logger } from '@/lib/logger';
import { toUserMessage } from '@/lib/errors';
import { isUuid } from '@/lib/uuid';
import type { Conversation, Message } from '@/types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type ConversationWithNames = {
  id: string;
  other_couple_id: string;
  other_couple_name: string | null;
  created_at: string;
  last_message_at: string | null;
};

export async function getConversations(): Promise<{ conversations: ConversationWithNames[]; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .rpc('get_conversations_for_user');

  if (error) logger.error('getConversations failed', { code: error.code, message: error.message });

  const conversations: ConversationWithNames[] = (data ?? []).map((row: any) => ({
    id: row.conversation_id,
    other_couple_id: row.other_couple_id,
    other_couple_name: row.other_couple_name,
    created_at: row.created_at,
    last_message_at: row.last_message_at,
  }));

  return { conversations, error: toUserMessage(error) };
}

export async function getConversationByCouples(
  coupleId1: string,
  coupleId2: string
): Promise<{ conversation: Conversation | null; error: string | null }> {
  if (!isUuid(coupleId1) || !isUuid(coupleId2)) return { conversation: null, error: 'Invalid couple id' };
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(
      `and(couple_1_id.eq.${coupleId1},couple_2_id.eq.${coupleId2}),and(couple_1_id.eq.${coupleId2},couple_2_id.eq.${coupleId1})`
    )
    .limit(1)
    .maybeSingle();

  if (error) logger.error('getConversationByCouples failed', { coupleId1, coupleId2, code: error.code, message: error.message });
  return { conversation: data ?? null, error: toUserMessage(error) };
}

export async function getConversation(
  id: string
): Promise<{ conversation: Conversation | null; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) logger.error('getConversation failed', { conversationId: id, code: error.code, message: error.message });
  return { conversation: data ?? null, error: toUserMessage(error) };
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

  if (error) logger.error('getMessages failed', { conversationId, code: error.code, message: error.message });
  return { messages: data ?? [], error: toUserMessage(error) };
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

  if (error) logger.error('sendMessage failed', { conversationId, code: error.code, message: error.message });
  return { message, error: toUserMessage(error) };
}

export function subscribeToMessages(
  conversationId: string,
  callback: (message: Message) => void,
  onConnectionChange?: (connected: boolean) => void
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
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') onConnectionChange?.(true);
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        logger.error('Realtime subscription error', { conversationId, status, error: err });
        onConnectionChange?.(false);
      }
    });

  return channel;
}
