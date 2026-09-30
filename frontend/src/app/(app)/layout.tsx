'use client';

import AppNavBar from '@/components/AppNavBar';
import { AppProvider, useAppContext } from '@/components/AppProvider';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

function AppShell({ children }: { children: React.ReactNode }) {
  const { authLoading, coupleLoading, user } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.replace('/');
  }, [authLoading, user, router]);

  if (authLoading || coupleLoading || !user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress sx={{ color: 'var(--pushpin-red)' }} />
      </Box>
    );
  }

  return (
    <>
      <AppNavBar />
      <Box
        component="main"
        sx={{
          maxWidth: 960,
          mx: 'auto',
          px: 2,
          py: 3,
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {children}
      </Box>
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
