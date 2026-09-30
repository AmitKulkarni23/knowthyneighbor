'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useAppContext } from '@/components/AppProvider';
import AvailabilityCard from '@/components/AvailabilityCard';
import EmptyStateCard from '@/components/EmptyStateCard';

export default function AvailabilityPage() {
  const { couple } = useAppContext();

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto' }}>
      <Typography
        sx={{
          fontFamily: 'var(--font-marker), cursive',
          fontSize: 'clamp(2rem, 4.5vw, 2.9rem)',
          color: 'var(--ink-blue)',
          mb: 1,
        }}
      >
        Availability
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
        Let neighbors know when you&apos;re free for a meal.
      </Typography>

      {couple ? <AvailabilityCard coupleId={couple.id} /> : (
        <EmptyStateCard message="Set up your couple profile first — then you can pin the days and meals that work for you." pin="green" />
      )}
    </Box>
  );
}
