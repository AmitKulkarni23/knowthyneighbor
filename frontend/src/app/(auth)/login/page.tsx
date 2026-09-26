'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import { signInWithOtp } from '@/api/auth';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { boardBgSx, paperCardSx, pinRedSx, ctaButtonSx } from '@/styles/board';

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
      <Box sx={{ ...boardBgSx as object, display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2 }}>
        <Card sx={{ ...paperCardSx as object, transform: 'rotate(-0.8deg)', maxWidth: 440, width: '100%', p: { xs: '40px 24px 28px', sm: '48px 36px 32px' }, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <Box sx={pinRedSx} />
          <Typography sx={{ fontFamily: 'var(--font-marker), cursive', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', color: 'var(--ink-blue)', mb: 1.5 }}>
            Check Your Email
          </Typography>
          <Typography sx={{ fontFamily: 'var(--font-handwriting), cursive', fontSize: '1.15rem', color: 'var(--ink-blue-light)', lineHeight: 1.5, mb: 3 }}>
            We sent a magic link your way.
          </Typography>
          <Typography sx={{ fontFamily: 'var(--font-handwriting), cursive', fontSize: '1.05rem', color: 'var(--ink-blue)', lineHeight: 1.6, mb: 1 }}>
            Click the link we sent to{' '}
            <Box component="span" sx={{ fontWeight: 700, color: 'var(--pushpin-red)' }}>{email}</Box>
            {' '}to sign in.
          </Typography>
          <Typography sx={{ fontFamily: 'var(--font-handwriting), cursive', fontSize: '0.9rem', color: 'var(--ink-blue-light)', mb: 3 }}>
            No password needed.
          </Typography>
          <Button
            onClick={() => setSubmitted(false)}
            sx={{ fontFamily: 'var(--font-condensed), sans-serif', fontWeight: 700, fontSize: '0.85rem', color: 'var(--ink-blue)', textTransform: 'uppercase', letterSpacing: '0.04em', '&:hover': { color: 'var(--pushpin-red)', bgcolor: 'transparent' } }}
          >
            Use a different email
          </Button>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ ...boardBgSx as object, display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2 }}>
      <Card sx={{ ...paperCardSx as object, transform: 'rotate(0.6deg)', maxWidth: 440, width: '100%', p: { xs: '40px 24px 28px', sm: '48px 36px 32px' }, position: 'relative', zIndex: 1 }}>
        <Box sx={pinRedSx} />
        <Typography sx={{ fontFamily: 'var(--font-marker), cursive', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', color: 'var(--ink-blue)', textAlign: 'center', mb: 1 }}>
          Sign In
        </Typography>
        <Typography sx={{ fontFamily: 'var(--font-handwriting), cursive', fontSize: '1.1rem', color: 'var(--ink-blue-light)', textAlign: 'center', lineHeight: 1.5, mb: 4 }}>
          Enter your email and we&apos;ll send you a magic link. No password needed.
        </Typography>

        {serverError && (
          <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(204, 68, 51, 0.08)', color: 'var(--pushpin-red)', fontFamily: 'var(--font-handwriting), cursive', '& .MuiAlert-icon': { color: 'var(--pushpin-red)' } }}>
            {serverError}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <TextField
            id="email"
            label="Email"
            type="email"
            fullWidth
            autoFocus
            placeholder="you@example.com"
            error={!!errors.email}
            helperText={errors.email?.message}
            {...register('email')}
            sx={{ mb: 4, '& .MuiInputLabel-root': { fontFamily: 'var(--font-handwriting), cursive', fontSize: '1.1rem', color: 'var(--ink-blue-light)' }, '& .MuiInput-root': { fontFamily: 'var(--font-handwriting), cursive', fontSize: '1.1rem' } }}
          />

          <Button
            type="submit"
            fullWidth
            disabled={isSubmitting}
            sx={{ ...ctaButtonSx as object, width: '100%' }}
          >
            {isSubmitting ? 'Sending...' : 'Send Magic Link'}
          </Button>
        </Box>

        <Button
          onClick={() => router.push('/')}
          sx={{ display: 'block', mx: 'auto', mt: 2.5, fontFamily: 'var(--font-condensed), sans-serif', fontWeight: 700, fontSize: '0.85rem', color: 'var(--ink-blue)', textTransform: 'uppercase', letterSpacing: '0.04em', '&:hover': { color: 'var(--pushpin-red)', bgcolor: 'transparent' } }}
        >
          Back to home
        </Button>
      </Card>
    </Box>
  );
}
