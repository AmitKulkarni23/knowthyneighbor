'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { claimPartnerInvite } from '@/api/couples';

type JoinPageProps = {
  params: Promise<{ coupleId: string; inviteCode: string }>;
};

export default function JoinPage({ params }: JoinPageProps) {
  const { coupleId, inviteCode } = use(params);
  const router = useRouter();
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleClaim = async () => {
    setClaiming(true);
    setError(null);

    const result = await claimPartnerInvite(coupleId, inviteCode);

    if (result.error) {
      setError(result.error);
      setClaiming(false);
      return;
    }

    setSuccess(true);
    setClaiming(false);
  };

  if (success) {
    return (
      <Box sx={{ maxWidth: 400, mx: 'auto', textAlign: 'center', py: 4 }}>
        <Typography variant="h1" sx={{ mb: 2 }}>
          Welcome!
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          You've joined your couple profile. Time to find your dinner neighbors.
        </Typography>
        <Button variant="contained" size="large" onClick={() => router.push('/discover')}>
          Start browsing
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', py: 4 }}>
      <Card>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h2" sx={{ mb: 2 }}>
            Join your couple profile
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Your partner created a couple profile on Nextdoorish and invited you to join.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleClaim}
            disabled={claiming}
          >
            {claiming ? 'Joining...' : 'Accept invite'}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
