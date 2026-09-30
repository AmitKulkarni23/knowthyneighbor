'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { paperCardSx, pinRedSx, ctaButtonSx } from '@/styles/board';

type ErrorFallbackProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

// Shown by error.tsx boundaries when a page crashes while rendering
export default function ErrorFallback({ error, retry }: ErrorFallbackProps) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { boundary: 'route' }, extra: { digest: error.digest } });
  }, [error]);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', px: 2, py: 6 }}>
      <Card sx={{ ...paperCardSx as object, maxWidth: 440, width: '100%', p: { xs: '40px 24px 28px', sm: '48px 36px 32px' }, textAlign: 'center', position: 'relative' }}>
        <Box sx={pinRedSx} />
        <Typography sx={{ fontFamily: 'var(--font-marker), cursive', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', color: 'var(--ink-blue)', mb: 1.5 }}>
          Something went wrong
        </Typography>
        <Typography sx={{ fontFamily: 'var(--font-handwriting), cursive', fontSize: '1.2rem', color: 'var(--ink-blue-light)', lineHeight: 1.5, mb: 3 }}>
          This page hit a snag. We&apos;ve been notified. Try again, or head back to the board.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button onClick={() => retry()} sx={ctaButtonSx}>Try again</Button>
          <Button variant="outlined" href="/">Home</Button>
        </Box>
      </Card>
    </Box>
  );
}
