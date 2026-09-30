'use client';

import { useEffect, useState } from 'react';
import { getJoinRequests, type JoinRequestWithCouple } from '@/api/joinRequests';

export default function useJoinRequests(coupleId: string | null) {
  const [received, setReceived] = useState<JoinRequestWithCouple[]>([]);
  const [sent, setSent] = useState<JoinRequestWithCouple[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!coupleId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getJoinRequests().then((result) => {
      setReceived(result.received);
      setSent(result.sent);
      setError(result.error);
      setLoading(false);
    });
  }, [coupleId]);

  const refetch = () => {
    if (!coupleId) return;
    setLoading(true);
    getJoinRequests().then((result) => {
      setReceived(result.received);
      setSent(result.sent);
      setError(result.error);
      setLoading(false);
    });
  };

  return { received, sent, loading, error, refetch };
}
