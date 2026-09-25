'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import useAuth from '@/hooks/useAuth';
import { getProfile } from '@/api/profiles';
import { getCoupleByMember } from '@/api/couples';
import type { Profile } from '@/types/database';
import type { Couple } from '@/types/database';

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
        <CircularProgress />
      </Box>
    );
  }

  if (!profile) return null;

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto' }}>
      <Typography variant="h1" sx={{ mb: 1 }}>
        Your Profile
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Here&apos;s what other couples see about you.
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h3" sx={{ mb: 2 }}>
            {profile.full_name}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            Age: {profile.age}
          </Typography>
          {couple && (
            <>
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                Couple: {couple.couple_name ?? 'Unnamed'}
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                Zip code: {couple.zip_code}
              </Typography>
              <Typography color="text.secondary">
                Preference: {couple.hosting_preference === 'host' ? 'We like to host' : couple.hosting_preference === 'visit' ? 'We prefer to visit' : 'Either works'}
              </Typography>
            </>
          )}
        </CardContent>
      </Card>

      <Button
        variant="outlined"
        fullWidth
        onClick={handleSignOut}
        sx={{ mb: 2 }}
      >
        Sign out
      </Button>
    </Box>
  );
}
