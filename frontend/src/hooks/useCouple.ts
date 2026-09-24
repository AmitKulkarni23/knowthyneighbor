'use client';

import { useEffect, useState } from 'react';
import { getCoupleByMember } from '@/api/couples';
import type { Couple } from '@/types/database';
import useAuth from './useAuth';

export default function useCouple() {
  const { user } = useAuth();
  const [data, setData] = useState<Couple | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getCoupleByMember(user.id).then((result) => {
      setData(result.couple);
      setError(result.error);
      setLoading(false);
    });
  }, [user]);

  return { data, loading, error };
}
