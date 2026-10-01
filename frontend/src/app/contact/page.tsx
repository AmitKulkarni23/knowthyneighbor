'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { boardBgSx, paperCardSx, pinRedSx, ctaButtonSx } from '@/styles/board';
import { createSupabaseClient } from '@/config/supabase';
import useAuth from '@/hooks/useAuth';
import { logger } from '@/lib/logger';
import { contactSchema, type ContactFormData } from '@/lib/validations';

export default function ContactPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', message: '' },
  });

  const onSubmit = async (data: ContactFormData) => {
    setResult(null);
    const supabase = createSupabaseClient();
    const { error } = await supabase.functions.invoke('contact-us', { body: data });

    if (error) {
      logger.error('contact-us failed', { error });
      setResult({ type: 'error', text: 'Failed to send message. Please try again.' });
      return;
    }
    setResult({ type: 'success', text: 'Message sent! We\'ll get back to you soon.' });
    reset();
  };

  return (
    <Box sx={{ ...boardBgSx as object, px: 2, py: 5, pb: 10 }}>
      <Box sx={{ maxWidth: 600, mx: 'auto', position: 'relative', zIndex: 1 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            onClick={() => router.push(user ? '/discover' : '/')}
            sx={{
              fontFamily: 'var(--font-marker), cursive',
              fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
              color: 'var(--paper)',
              textShadow: '1px 2px 4px rgba(60, 40, 20, 0.4)',
              cursor: 'pointer',
              mb: 0.5,
            }}
          >
            Nextdoorish
          </Typography>
          <Typography
            onClick={() => router.push(user ? '/discover' : '/')}
            sx={{
              fontFamily: 'var(--font-condensed), sans-serif',
              fontWeight: 700,
              fontSize: '1.15rem',
              color: 'var(--paper)',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              display: 'inline-block',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            &larr; Back to Home
          </Typography>
        </Box>

        <Card
          sx={{
            ...paperCardSx as object,
            p: { xs: '36px 24px', md: '48px 36px' },
            transform: 'rotate(-0.5deg)',
          }}
        >
          <Box sx={pinRedSx} />

          <Typography
            sx={{
              fontFamily: 'var(--font-marker), cursive',
              fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
              color: 'var(--ink-blue)',
              mb: 1,
            }}
          >
            Contact Us
          </Typography>
          <Typography
            sx={{
              fontFamily: 'var(--font-handwriting), cursive',
              fontSize: '1.3rem',
              color: 'var(--ink-blue-light)',
              mb: 3,
              lineHeight: 1.5,
            }}
          >
            Got a question, idea, or just want to say hi? Drop us a note.
          </Typography>

          {result && (
            <Alert severity={result.type} sx={{ mb: 3, borderRadius: 0 }}>
              {result.text}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Your name"
              error={!!errors.name}
              helperText={errors.name?.message}
              {...register('name')}
              slotProps={{ htmlInput: { maxLength: 100 } }}
              fullWidth
            />
            <TextField
              label="Your email"
              type="email"
              error={!!errors.email}
              helperText={errors.email?.message}
              {...register('email')}
              slotProps={{ htmlInput: { maxLength: 254 } }}
              fullWidth
            />
            <TextField
              label="Message"
              error={!!errors.message}
              helperText={errors.message?.message}
              {...register('message')}
              multiline
              rows={5}
              slotProps={{ htmlInput: { maxLength: 2000 } }}
              fullWidth
            />
            <Box sx={{ textAlign: 'center', pt: 1 }}>
              <Button
                type="submit"
                disabled={isSubmitting}
                sx={ctaButtonSx}
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </Button>
            </Box>
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
