'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import useAuth from '@/hooks/useAuth';
import { getProfile } from '@/api/profiles';
import { getCoupleByMember } from '@/api/couples';
import type { Profile } from '@/types/database';
import type { Couple } from '@/types/database';
import { paperCardSx, pinRedSx, pinGreenSx, ctaButtonSx } from '@/styles/board';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;

    async function load() {
      const { profile: p } = await getProfile(user!.id);
      if (!p) {
        router.replace('/profile/create');
        return;
      }
      setProfile(p);

      const { couple: c } = await getCoupleByMember(user!.id);
      setCouple(c);
      setLoading(false);
    }

    load();
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: 'var(--pushpin-red)' }} />
      </Box>
    );
  }

  if (!profile) return null;

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const hostingLabel = couple?.hosting_preference === 'host'
    ? 'We like to host'
    : couple?.hosting_preference === 'visit'
    ? 'We prefer to visit'
    : 'Either works';

  return (
    <Box sx={{ maxWidth: 520, mx: 'auto' }}>
      <Typography
        sx={{
          fontFamily: 'var(--font-marker), cursive',
          fontSize: 'clamp(2rem, 4.5vw, 2.9rem)',
          color: 'var(--ink-blue)',
          mb: 1,
        }}
      >
        Your Profile
      </Typography>
      <Typography
        sx={{
          fontFamily: 'var(--font-handwriting), cursive',
          fontSize: '1.45rem',
          color: 'var(--ink-blue-light)',
          mb: 3,
          lineHeight: 1.5,
        }}
      >
        Here&apos;s what other couples see about you.
      </Typography>

      <Card
        sx={{
          ...paperCardSx as object,
          transform: 'rotate(-0.8deg)',
          p: '28px 24px',
          position: 'relative',
          mb: 3,
          '&:hover': {
            ...(paperCardSx as any)['&:hover'],
            transform: 'rotate(-0.8deg) translateY(-4px) scale(1.01)',
          },
        }}
      >
        <Box sx={pinRedSx} />
        <Typography
          sx={{
            fontFamily: 'var(--font-marker), cursive',
            fontSize: '1.75rem',
            color: 'var(--ink-blue)',
            mb: 2,
            mt: 1,
          }}
        >
          {profile.full_name}
        </Typography>
        <Typography
          sx={{
            fontFamily: 'var(--font-handwriting), cursive',
            fontSize: '1.4rem',
            color: 'var(--ink-blue-light)',
            mb: 1,
          }}
        >
          Age: {profile.age}
        </Typography>
        {couple && (
          <>
            <Typography
              sx={{
                fontFamily: 'var(--font-handwriting), cursive',
                fontSize: '1.4rem',
                color: 'var(--ink-blue-light)',
                mb: 1,
              }}
            >
              Couple: {couple.couple_name ?? 'Unnamed'}
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--font-handwriting), cursive',
                fontSize: '1.4rem',
                color: 'var(--ink-blue-light)',
                mb: 1,
              }}
            >
              Zip code: {couple.zip_code}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
              <Chip
                label={couple.hosting_preference === 'host' ? 'HOSTS' : couple.hosting_preference === 'visit' ? 'VISITORS' : 'EITHER'}
                size="small"
                sx={{
                  bgcolor: couple.hosting_preference === 'host' ? 'var(--pushpin-red)' : 'var(--thumbtack-green)',
                  color: 'var(--paper)',
                }}
              />
              <Typography
                sx={{
                  fontFamily: 'var(--font-handwriting), cursive',
                  fontSize: '1.3rem',
                  color: 'var(--ink-blue-light)',
                }}
              >
                {hostingLabel}
              </Typography>
            </Box>
          </>
        )}
      </Card>

      <Card
        sx={{
          ...paperCardSx as object,
          transform: 'rotate(0.5deg)',
          p: '16px 24px',
          position: 'relative',
          '&:hover': {
            ...(paperCardSx as any)['&:hover'],
            transform: 'rotate(0.5deg) translateY(-4px) scale(1.01)',
          },
        }}
      >
        <Box sx={{ ...pinGreenSx as object }} />
        <Button
          fullWidth
          onClick={handleSignOut}
          sx={{
            ...ctaButtonSx as object,
            bgcolor: 'transparent',
            color: 'var(--ink-blue)',
            border: '2px solid var(--ink-blue)',
            width: '100%',
            mt: 1,
            '&:hover': {
              bgcolor: 'rgba(43, 69, 112, 0.06)',
              color: 'var(--pushpin-red)',
              borderColor: 'var(--pushpin-red)',
              transform: 'scale(1.03)',
            },
          }}
        >
          Sign out
        </Button>
      </Card>
    </Box>
  );
}
