'use client';

import { useEffect, useState } from 'react';
import { getMeals } from '@/api/meals';
import type { Meal } from '@/types/database';

export default function useMeals(conversationId: string | null) {
  const [data, setData] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getMeals(conversationId).then((result) => {
      setData(result.meals);
      setError(result.error);
      setLoading(false);
    });
  }, [conversationId]);

  const refetch = () => {
    if (!conversationId) return;
    setLoading(true);
    getMeals(conversationId).then((result) => {
      setData(result.meals);
      setError(result.error);
      setLoading(false);
    });
  };

  return { data, loading, error, refetch };
}
