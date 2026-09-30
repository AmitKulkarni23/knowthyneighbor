'use client';

import { useEffect, useState, useCallback } from 'react';
import { getMessages, subscribeToMessages } from '@/api/conversations';
import type { Message } from '@/types/database';

export default function useMessages(conversationId: string | null) {
  const [data, setData] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveConnected, setLiveConnected] = useState(true);

  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getMessages(conversationId).then((result) => {
      setData(result.messages);
      setError(result.error);
      setLoading(false);
    });

    const channel = subscribeToMessages(conversationId, (newMessage) => {
      setData((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
    }, setLiveConnected);

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId]);

  const addOptimistic = useCallback((message: Message) => {
    setData((prev) => [...prev, message]);
  }, []);

  return { data, loading, error, liveConnected, addOptimistic };
}
