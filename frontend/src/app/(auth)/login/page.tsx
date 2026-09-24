'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { signInWithOtp } from '@/api/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signInWithOtp(email);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h2" gutterBottom>
            Check your email
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            We sent a magic link to <strong>{email}</strong>. Click the link in your email to sign in.
          </Typography>
          <Button
            variant="text"
            onClick={() => { setSubmitted(false); setEmail(''); }}
          >
            Use a different email
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ maxWidth: 400, width: '100%' }}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h2" gutterBottom>
          Sign in
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Enter your email and we'll send you a magic link. No password needed.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
            autoFocus
            sx={{ mb: 2 }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading || !email}
            size="large"
          >
            {loading ? 'Sending...' : 'Send magic link'}
          </Button>
        </Box>

        <Button
          variant="text"
          fullWidth
          sx={{ mt: 2 }}
          onClick={() => router.push('/')}
        >
          Back to home
        </Button>
      </CardContent>
    </Card>
  );
}
