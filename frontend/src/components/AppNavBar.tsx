'use client';

import { usePathname, useRouter } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { useAppContext } from '@/components/AppProvider';

const navItems = [
  { label: 'Discover', href: '/discover' },
  { label: 'Requests', href: '/requests' },
  { label: 'Chat', href: '/chat' },
  { label: 'Availability', href: '/availability' },
];

export default function AppNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAppContext();
  const { showError } = useToast();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  // During onboarding (no profile yet), the wordmark is the escape hatch — no menu.
  const onboarding = pathname.startsWith('/profile/create');

  const handleSignOut = async () => {
    setMenuAnchor(null);
    const { error } = await signOut();
    if (error) {
      showError(`Couldn't sign you out. ${error}`);
      return;
    }
    router.push('/');
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'var(--paper)',
        borderBottom: '2px solid var(--cork-light)',
      }}
    >
      <Toolbar sx={{ maxWidth: 960, width: '100%', mx: 'auto', px: 2 }}>
        <Typography
          sx={{
            fontFamily: 'var(--font-marker), cursive',
            fontWeight: 400,
            fontSize: '1.55rem',
            color: 'var(--ink-blue)',
            cursor: 'pointer',
            mr: 4,
            '&:hover': { color: 'var(--pushpin-red)' },
          }}
          onClick={() => router.push(onboarding ? '/' : '/discover')}
        >
          Nextdoorish
        </Typography>

        <Box sx={{ display: 'flex', gap: 0.5, flexGrow: 1 }}>
          {!onboarding && navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Button
                key={item.href}
                onClick={() => router.push(item.href)}
                sx={{
                  fontFamily: 'var(--font-condensed), sans-serif',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: active ? 'var(--pushpin-red)' : 'var(--ink-blue)',
                  borderBottom: active ? '3px solid var(--pushpin-red)' : '3px solid transparent',
                  borderRadius: 0,
                  px: 1.5,
                  minWidth: 'auto',
                  '&:hover': {
                    color: 'var(--pushpin-red)',
                    bgcolor: 'transparent',
                  },
                }}
              >
                {item.label}
              </Button>
            );
          })}
        </Box>

        {!onboarding && (
          <>
            <IconButton
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              sx={{
                width: 36,
                height: 36,
                bgcolor: 'var(--pushpin-red)',
                color: 'var(--paper)',
                fontFamily: 'var(--font-condensed), sans-serif',
                fontSize: 14,
                fontWeight: 700,
                '&:hover': { bgcolor: 'var(--pushpin-red-hover)' },
              }}
            >
              P
            </IconButton>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
              slotProps={{
                paper: {
                  sx: {
                    bgcolor: 'var(--paper)',
                    boxShadow: 'var(--shadow-card-lift)',
                    borderRadius: 0,
                  },
                },
              }}
            >
              <MenuItem
                onClick={() => { setMenuAnchor(null); router.push('/profile'); }}
                sx={{
                  fontFamily: 'var(--font-condensed), sans-serif',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-blue)',
                  '&:hover': { color: 'var(--pushpin-red)', bgcolor: 'rgba(204, 68, 51, 0.04)' },
                }}
              >
                Profile
              </MenuItem>
              <MenuItem
                onClick={() => { setMenuAnchor(null); router.push('/contact'); }}
                sx={{
                  fontFamily: 'var(--font-condensed), sans-serif',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-blue)',
                  '&:hover': { color: 'var(--pushpin-red)', bgcolor: 'rgba(204, 68, 51, 0.04)' },
                }}
              >
                Contact Us
              </MenuItem>
              <MenuItem
                onClick={handleSignOut}
                sx={{
                  fontFamily: 'var(--font-condensed), sans-serif',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-blue)',
                  '&:hover': { color: 'var(--pushpin-red)', bgcolor: 'rgba(204, 68, 51, 0.04)' },
                }}
              >
                Sign out
              </MenuItem>
            </Menu>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}
