'use client';

import { useEffect, useState } from 'react';

function seedSupabaseSession() {
  const ref = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/^https?:\/\//, '').split('.')[0];
  const storageKey = `sb-${ref}-auth-token`;

  const session = {
    access_token: 'mock-access-token',
    token_type: 'bearer',
    expires_in: 604800,
    expires_at: Math.floor(Date.now() / 1000) + 604800,
    refresh_token: 'mock-refresh-token',
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'demo@knowthyneighbor.com',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { full_name: 'Pat Delgado' },
      created_at: '2026-06-01T00:00:00Z',
    },
  };

  try {
    localStorage.setItem(storageKey, JSON.stringify(session));
  } catch {
    // ignore
  }
}

let mswStarted = false;

async function startMSW() {
  if (mswStarted) return;
  mswStarted = true;

  seedSupabaseSession();
  const { worker } = await import('./browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}

export default function MSWProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_MSW !== 'true') {
      setReady(true);
      return;
    }

    startMSW().then(() => setReady(true));
  }, []);

  if (!ready) return null;

  return <>{children}</>;
}
