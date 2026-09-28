'use client';

import { useEffect, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { getAvailability, setAvailability } from '@/api/availability';
import type { MealSlot } from '@/types/database';
import { paperCardSx, pinGreenSx, ctaButtonSx } from '@/styles/board';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DAY_MAP: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
const DAY_FROM_NUM: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun' };
const MEALS: MealSlot[] = ['brunch', 'lunch', 'dinner'];

type SlotKey = `${number}-${MealSlot}`;
function key(dayNum: number, meal: MealSlot): SlotKey {
  return `${dayNum}-${meal}`;
}

const labelSx = {
  fontFamily: 'var(--font-condensed), sans-serif',
  fontWeight: 700,
  fontSize: '0.75rem',
  color: 'var(--ink-blue-light)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  textAlign: 'center',
  lineHeight: 1.2,
} as const;

export default function AvailabilityCard({ coupleId }: { coupleId: string }) {
  const [active, setActive] = useState<Set<SlotKey>>(new Set());
  const [saved, setSaved] = useState<Set<SlotKey>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getAvailability(coupleId).then(({ slots, error: e }) => {
      if (e) { setError(e); setLoading(false); return; }
      const set = new Set<SlotKey>();
      for (const s of slots) {
        if (s.day_of_week != null) set.add(key(s.day_of_week, s.time_slot));
      }
      setActive(set);
      setSaved(set);
      setLoading(false);
    });
  }, [coupleId]);

  const toggle = useCallback((dayNum: number, meal: MealSlot) => {
    setActive(prev => {
      const next = new Set(prev);
      const k = key(dayNum, meal);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
    setSuccess(false);
  }, []);

  const dirty = active.size !== saved.size || [...active].some(k => !saved.has(k));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const slots = [...active].map(k => {
      const [d, m] = k.split('-') as [string, MealSlot];
      return { day_of_week: Number(d), specific_date: null, time_slot: m, recurring: true };
    });
    const result = await setAvailability(coupleId, slots);
    if (result.error) { setError(result.error); setSaving(false); return; }
    setSaved(new Set(active));
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  const handleReset = () => { setActive(new Set(saved)); setError(null); };

  if (loading) return null;

  return (
    <Card
      sx={{
        ...paperCardSx as object,
        transform: 'rotate(0.9deg)',
        p: '32px 24px 24px',
        position: 'relative',
        mb: 2.5,
        '&:hover': {
          ...(paperCardSx as any)['&:hover'],
          transform: 'rotate(0.9deg) translateY(-4px) scale(1.01)',
        },
      }}
    >
      <Box sx={pinGreenSx} />

      <Typography
        sx={{
          fontFamily: 'var(--font-condensed), sans-serif',
          fontWeight: 700,
          fontSize: '0.8rem',
          color: 'var(--ink-blue-light)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          mb: 0.5,
          mt: 0.5,
        }}
      >
        Availability
      </Typography>
      <Typography
        sx={{
          fontFamily: 'var(--font-handwriting), cursive',
          fontSize: '1.25rem',
          color: 'var(--ink-blue)',
          lineHeight: 1.5,
          mb: 2,
        }}
      >
        When are you free for a meal?
      </Typography>

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            bgcolor: 'rgba(204, 68, 51, 0.08)',
            color: 'var(--pushpin-red)',
            fontFamily: 'var(--font-handwriting), cursive',
            '& .MuiAlert-icon': { color: 'var(--pushpin-red)' },
          }}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{
            mb: 2,
            bgcolor: 'rgba(91, 127, 94, 0.08)',
            color: 'var(--thumbtack-green)',
            fontFamily: 'var(--font-handwriting), cursive',
            '& .MuiAlert-icon': { color: 'var(--thumbtack-green)' },
          }}
        >
          Availability saved!
        </Alert>
      )}

      {/* Grid: row headers + 7 day columns */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'auto repeat(7, 1fr)',
          gap: '6px',
          mb: 2,
        }}
      >
        {/* Day headers */}
        <Box />
        {DAYS.map(d => (
          <Typography key={d} sx={labelSx}>{d}</Typography>
        ))}

        {/* Meal rows */}
        {MEALS.map(meal => (
          <Box key={meal} sx={{ display: 'contents' }}>
            <Typography
              sx={{
                ...labelSx,
                textAlign: 'right',
                pr: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
              }}
            >
              {meal}
            </Typography>
            {DAYS.map(d => {
              const dayNum = DAY_MAP[d];
              const isActive = active.has(key(dayNum, meal));
              return (
                <Box
                  key={d}
                  onClick={() => toggle(dayNum, meal)}
                  sx={{
                    aspectRatio: '1',
                    minHeight: 36,
                    borderRadius: 0,
                    bgcolor: isActive ? 'var(--thumbtack-green)' : 'var(--paper-aged)',
                    border: '1.5px solid',
                    borderColor: isActive ? 'var(--thumbtack-green)' : 'var(--cork-dark)',
                    cursor: 'pointer',
                    transition: 'background-color 0.12s ease, border-color 0.12s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    '&:hover': {
                      bgcolor: isActive ? 'var(--thumbtack-green)' : 'var(--cork-highlight)',
                      borderColor: isActive ? 'var(--thumbtack-green)' : 'var(--ink-blue-light)',
                    },
                  }}
                >
                  {isActive && (
                    <Typography
                      sx={{
                        fontFamily: 'var(--font-marker), cursive',
                        fontSize: '1.1rem',
                        color: 'var(--paper)',
                        lineHeight: 1,
                      }}
                    >
                      ✓
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>

      {/* Save/Reset */}
      {dirty && (
        <Box sx={{ display: 'flex', gap: 1.5, borderTop: '2px dashed var(--cork-dark)', pt: 2 }}>
          <Button
            onClick={handleSave}
            disabled={saving}
            sx={{ ...ctaButtonSx as object, py: '10px', px: '28px', fontSize: '0.95rem' }}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button
            onClick={handleReset}
            sx={{
              fontFamily: 'var(--font-condensed), sans-serif',
              fontWeight: 700,
              fontSize: '1rem',
              color: 'var(--ink-blue)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              '&:hover': { color: 'var(--pushpin-red)', bgcolor: 'transparent' },
            }}
          >
            Reset
          </Button>
        </Box>
      )}
    </Card>
  );
}
