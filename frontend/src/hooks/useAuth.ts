'use client';

import { useEffect, useState, useCallback } from 'react';
import { createSupabaseClient } from '@/config/supabase';
import type { User } from '@supabase/supabase-js';

export default function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseClient();

    supabase.auth.getUser().then(({ data, error: authError }) => {
      setUser(data.user);
      if (authError) setError(authError.message);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createSupabaseClient();
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message);
  }, []);

  return { user, loading, error, signOut };
}
