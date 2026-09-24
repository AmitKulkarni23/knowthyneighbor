'use client';

import { useEffect, useState } from 'react';
import { getProfile } from '@/api/profiles';
import type { Profile } from '@/types/database';
import useAuth from './useAuth';

export default function useProfile() {
  const { user } = useAuth();
  const [data, setData] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getProfile(user.id).then((result) => {
      setData(result.profile);
      setError(result.error);
      setLoading(false);
    });
  }, [user]);

  return { data, loading, error };
}
