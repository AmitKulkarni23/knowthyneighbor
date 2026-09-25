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
import useAuth from '@/hooks/useAuth';

const navItems = [
  { label: 'Discover', href: '/discover' },
  { label: 'Requests', href: '/requests' },
  { label: 'Chat', href: '/chat' },
  { label: 'Meals', href: '/meals' },
];

export default function AppNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleSignOut = async () => {
    setMenuAnchor(null);
    await signOut();
    router.push('/');
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ maxWidth: 960, width: '100%', mx: 'auto', px: 2 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: 'primary.main',
            cursor: 'pointer',
            mr: 4,
          }}
          onClick={() => router.push('/discover')}
        >
          KnowThyNeighbor
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexGrow: 1 }}>
          {navItems.map((item) => (
            <Button
              key={item.href}
              onClick={() => router.push(item.href)}
              sx={{
                color: pathname.startsWith(item.href) ? 'primary.main' : 'text.secondary',
                fontWeight: pathname.startsWith(item.href) ? 700 : 400,
                minWidth: 'auto',
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        <IconButton
          onClick={(e) => setMenuAnchor(e.currentTarget)}
          sx={{
            width: 36,
            height: 36,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontSize: 14,
            fontWeight: 700,
            '&:hover': { bgcolor: 'primary.dark' },
          }}
        >
          P
        </IconButton>
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
        >
          <MenuItem onClick={() => { setMenuAnchor(null); router.push('/profile'); }}>
            Profile
          </MenuItem>
          <MenuItem onClick={handleSignOut}>Sign out</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
