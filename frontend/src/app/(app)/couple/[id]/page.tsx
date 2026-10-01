'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import { getCoupleProfile } from '@/api/couples';
import { getCoupleAvailability } from '@/api/availability';
import { getAvatarPublicUrl } from '@/api/storage';
import type { CoupleProfile, AvailableSlot, MealSlot } from '@/types/database';
import { paperCardSx, pinRedSx, pinBlueSx, pinGreenSx } from '@/styles/board';

const MEAL_LABELS: Record<MealSlot, string> = {
  brunch: 'Brunch',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

const labelSx = {
  fontFamily: 'var(--font-condensed), sans-serif',
  fontWeight: 700,
  fontSize: '0.8rem',
  color: 'var(--ink-blue-light)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  mb: 0.5,
} as const;

const valueSx = {
  fontFamily: 'var(--font-handwriting), cursive',
  fontSize: '1.35rem',
  color: 'var(--ink-blue)',
  lineHeight: 1.5,
} as const;

function formatSlotDate(date: string): string {
  const d = new Date(date + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function CoupleProfilePage() {
  const params = useParams();
  const router = useRouter();
  const coupleId = params.id as string;

  const [couple, setCouple] = useState<CoupleProfile | null>(null);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getCoupleProfile(coupleId), getCoupleAvailability(coupleId)]).then(
      ([{ profile, error: profileError }, { slots: avail, error: slotsError }]) => {
        setCouple(profile);
        setSlots(avail);
        setLoadError(profileError ?? slotsError);
        setLoading(false);
      }
    );
  }, [coupleId]);

  if (loading) return null;
  if (loadError && !couple) {
    return (
      <Alert severity="error" sx={{ maxWidth: 520, mx: 'auto', mt: 4 }}>
        Couldn&apos;t load this couple. {loadError}
      </Alert>
    );
  }
  if (!couple) {
    return (
      <Box sx={{ maxWidth: 520, mx: 'auto', mt: 4, textAlign: 'center' }}>
        <Typography sx={{ fontFamily: 'var(--font-handwriting), cursive', fontSize: '1.3rem', color: 'var(--ink-blue-light)' }}>
          Couple not found.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 520, mx: 'auto' }}>
      <Button
        onClick={() => router.back()}
        sx={{
          fontFamily: 'var(--font-condensed), sans-serif',
          fontWeight: 700,
          fontSize: '0.9rem',
          color: 'var(--ink-blue-light)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          mb: 2,
          '&:hover': { color: 'var(--pushpin-red)', bgcolor: 'transparent' },
        }}
      >
        &larr; Back
      </Button>

      <Typography
        sx={{
          fontFamily: 'var(--font-marker), cursive',
          fontSize: 'clamp(2rem, 4.5vw, 2.9rem)',
          color: 'var(--ink-blue)',
          mb: 3,
        }}
      >
        {couple.couple_name ?? 'A couple nearby'}
      </Typography>

      {/* Photo card */}
      <Card
        sx={{
          ...paperCardSx as object,
          transform: 'rotate(0.6deg)',
          position: 'relative',
          mb: 2.5,
          overflow: 'hidden',
          '&:hover': {
            ...(paperCardSx as any)['&:hover'],
            transform: 'rotate(0.6deg) translateY(-4px) scale(1.01)',
          },
        }}
      >
        <Box sx={pinBlueSx} />
        {couple.partner_1_avatar ? (
          <Box sx={{ position: 'relative', width: '100%', height: 240 }}>
            <Image
              src={getAvatarPublicUrl(couple.partner_1_avatar)}
              alt={couple.partner_1_first_name}
              fill
              sizes="(max-width: 600px) 100vw, 500px"
              style={{ objectFit: 'cover' }}
            />
          </Box>
        ) : (
          <Box
            sx={{
              width: '100%',
              height: 240,
              bgcolor: 'var(--paper-aged)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ ...valueSx, color: 'var(--ink-blue-light)', fontSize: '1.2rem' }}>
              No photo yet
            </Typography>
          </Box>
        )}
      </Card>

      {/* Info card */}
      <Card
        sx={{
          ...paperCardSx as object,
          transform: 'rotate(-0.8deg)',
          p: '32px 28px 24px',
          position: 'relative',
          mb: 2.5,
          '&:hover': {
            ...(paperCardSx as any)['&:hover'],
            transform: 'rotate(-0.8deg) translateY(-4px) scale(1.01)',
          },
        }}
      >
        <Box sx={pinRedSx} />

        <Box sx={{ mb: 2.5, mt: 0.5 }}>
          <Typography sx={labelSx}>Who they are</Typography>
          <Typography sx={{ ...valueSx, fontSize: '1.5rem', fontFamily: 'var(--font-marker), cursive', mb: 0.25 }}>
            {couple.partner_1_first_name}, {couple.partner_1_age}
          </Typography>
          {couple.partner_2_first_name && (
            <Typography sx={valueSx}>
              &amp; {couple.partner_2_first_name}, {couple.partner_2_age}
            </Typography>
          )}
        </Box>

        {couple.bio && (
          <Box sx={{ mb: 2.5, pt: 2, borderTop: '1px dashed var(--cork-dark)' }}>
            <Typography sx={labelSx}>About them</Typography>
            <Typography sx={valueSx}>{couple.bio}</Typography>
          </Box>
        )}

        <Box sx={{ pt: couple.bio ? 0 : 2, borderTop: couple.bio ? 'none' : '1px dashed var(--cork-dark)' }}>
          <Typography sx={labelSx}>Neighborhood</Typography>
          <Typography sx={valueSx}>
            {[couple.city, couple.state].filter(Boolean).join(', ')}
          </Typography>
        </Box>
      </Card>

      {/* Availability card */}
      <Card
        sx={{
          ...paperCardSx as object,
          transform: 'rotate(0.6deg)',
          p: '32px 24px 24px',
          position: 'relative',
          mb: 2.5,
          '&:hover': {
            ...(paperCardSx as any)['&:hover'],
            transform: 'rotate(0.6deg) translateY(-4px) scale(1.01)',
          },
        }}
      >
        <Box sx={pinGreenSx} />
        <Typography sx={{ ...labelSx, mt: 0.5 }}>Available dates</Typography>

        {loadError ? (
          <Alert severity="error" sx={{ mt: 1 }}>Couldn&apos;t load their availability. {loadError}</Alert>
        ) : slots.length === 0 ? (
          <Typography sx={{ ...valueSx, fontSize: '1.15rem', color: 'var(--ink-blue-light)' }}>
            No upcoming availability yet.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {slots.map(s => {
              if (!s.specific_date) return null;
              return (
                <Chip
                  key={`${s.specific_date}-${s.time_slot}`}
                  label={`${formatSlotDate(s.specific_date)} — ${MEAL_LABELS[s.time_slot]}`}
                  sx={{
                    fontFamily: 'var(--font-handwriting), cursive',
                    fontSize: '1rem',
                    bgcolor: 'rgba(91, 127, 94, 0.15)',
                    color: 'var(--ink-blue)',
                    border: '1.5px solid var(--thumbtack-green)',
                    borderRadius: 0,
                  }}
                />
              );
            })}
          </Box>
        )}
      </Card>
    </Box>
  );
}
