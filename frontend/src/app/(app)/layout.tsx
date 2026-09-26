'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import AppNavBar from '@/components/AppNavBar';
import Box from '@mui/material/Box';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      setVisible(false);
      const timer = setTimeout(() => {
        setVisible(true);
        prevPath.current = pathname;
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

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
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.2s ease-out, transform 0.2s ease-out',
        }}
      >
        {children}
      </Box>
    </>
  );
}
