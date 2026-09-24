'use client';

import { useEffect, useState } from 'react';
import { getJoinRequests } from '@/api/joinRequests';
import type { JoinRequest } from '@/types/database';

export default function useJoinRequests(coupleId: string | null) {
  const [received, setReceived] = useState<JoinRequest[]>([]);
  const [sent, setSent] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!coupleId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getJoinRequests(coupleId).then((result) => {
      setReceived(result.received);
      setSent(result.sent);
      setError(result.error);
      setLoading(false);
    });
  }, [coupleId]);

  const refetch = () => {
    if (!coupleId) return;
    setLoading(true);
    getJoinRequests(coupleId).then((result) => {
      setReceived(result.received);
      setSent(result.sent);
      setError(result.error);
      setLoading(false);
    });
  };

  return { received, sent, loading, error, refetch };
}
