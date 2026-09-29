'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createSupabaseClient } from '@/config/supabase';
import { getCoupleByMember } from '@/api/couples';
import type { User } from '@supabase/supabase-js';
import type { Couple } from '@/types/database';
import { SKIP_AUTH } from '@/config/env';

const FAKE_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'demo@knowthyneighbor.com',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { full_name: 'Pat Delgado' },
  created_at: '2026-06-01T00:00:00Z',
} as User;

type AppContextValue = {
  user: User | null;
  couple: Couple | null;
  authLoading: boolean;
  coupleLoading: boolean;
  signOut: () => Promise<void>;
  refreshCouple: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [coupleLoading, setCoupleLoading] = useState(true);

  useEffect(() => {
    if (SKIP_AUTH) {
      setUser(FAKE_USER);
      setAuthLoading(false);
      return;
    }

    const supabase = createSupabaseClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setCouple(null);
      setCoupleLoading(false);
      return;
    }

    setCoupleLoading(true);
    getCoupleByMember(user.id).then((result) => {
      setCouple(result.couple);
      setCoupleLoading(false);
    });
  }, [user, authLoading]);

  const signOut = useCallback(async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
  }, []);

  const refreshCouple = useCallback(async () => {
    if (!user) return;
    const result = await getCoupleByMember(user.id);
    setCouple(result.couple);
  }, [user]);

  return (
    <AppContext.Provider value={{ user, couple, authLoading, coupleLoading, signOut, refreshCouple }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
