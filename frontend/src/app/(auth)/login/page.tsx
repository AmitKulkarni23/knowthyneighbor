'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { signInWithOtp } from '@/api/auth';
import { loginSchema, type LoginFormData } from '@/lib/validations';

export default function LoginPage() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '' },
  });

  const email = watch('email');

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    const result = await signInWithOtp(data.email);

    if (result.error) {
      setServerError(result.error);
      return;
    }

    setSubmitted(true);
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
            onClick={() => { setSubmitted(false); }}
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

        {serverError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {serverError}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField
            label="Email"
            type="email"
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
            fullWidth
            autoFocus
            sx={{ mb: 2 }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={isSubmitting}
            size="large"
          >
            {isSubmitting ? 'Sending...' : 'Send magic link'}
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
