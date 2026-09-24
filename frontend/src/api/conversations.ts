import { createSupabaseClient } from '@/config/supabase';
import type { Conversation, Message } from '@/types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

export async function getConversations(
  coupleId: string
): Promise<{ conversations: Conversation[]; error: string | null }> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`couple_1_id.eq.${coupleId},couple_2_id.eq.${coupleId}`)
    .order('last_message_at', { ascending: false });

  return { conversations: data ?? [], error: error?.message ?? null };
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
