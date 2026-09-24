'use client';

import { useEffect, useState } from 'react';
import { getConversations } from '@/api/conversations';
import type { Conversation } from '@/types/database';

export default function useConversations(coupleId: string | null) {
  const [data, setData] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!coupleId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getConversations(coupleId).then((result) => {
      setData(result.conversations);
      setError(result.error);
      setLoading(false);
    });
  }, [coupleId]);

  return { data, loading, error };
}
