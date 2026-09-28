'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import { getCouple } from '@/api/couples';
import { getProfile } from '@/api/profiles';
import { getFutureAvailability } from '@/api/availability';
import type { Couple, Profile, Availability, MealSlot } from '@/types/database';
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

  const [couple, setCouple] = useState<Couple | null>(null);
  const [partner1, setPartner1] = useState<Profile | null>(null);
  const [partner2, setPartner2] = useState<Profile | null>(null);
  const [slots, setSlots] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCouple(coupleId).then(async ({ couple: c }) => {
      if (!c) { setLoading(false); return; }
      setCouple(c);

      const [p1, p2, avail] = await Promise.all([
        getProfile(c.partner_1_id),
        c.partner_2_id ? getProfile(c.partner_2_id) : Promise.resolve({ profile: null }),
        getFutureAvailability(c.id),
      ]);
      setPartner1(p1.profile);
      setPartner2(p2.profile);
      setSlots(avail.slots);
      setLoading(false);
    });
  }, [coupleId]);

  if (loading) return null;
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
        {partner1?.avatar_url ? (
          <Box
            component="img"
            src={partner1.avatar_url}
            alt={partner1.full_name}
            sx={{ width: '100%', height: 240, objectFit: 'cover', display: 'block' }}
          />
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
          {partner1 && (
            <Typography sx={{ ...valueSx, fontSize: '1.5rem', fontFamily: 'var(--font-marker), cursive', mb: 0.25 }}>
              {partner1.full_name}, {partner1.age}
            </Typography>
          )}
          {partner2 && (
            <Typography sx={valueSx}>
              &amp; {partner2.full_name}, {partner2.age}
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
          <Typography sx={valueSx}>{couple.zip_code}</Typography>
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

        {slots.length === 0 ? (
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
