'use client';

import { useEffect, useState } from 'react';
import { discoverCouples } from '@/api/discovery';
import type { DiscoveryCouple } from '@/types/database';

export default function useDiscovery(
  coupleId: string | null,
  searchCity?: string,
  searchZip?: string
) {
  const [data, setData] = useState<DiscoveryCouple[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!coupleId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    discoverCouples(coupleId, searchCity, searchZip).then((result) => {
      setData(result.couples);
      setError(result.error);
      setLoading(false);
    });
  }, [coupleId, searchCity, searchZip]);

  return { data, loading, error };
}
