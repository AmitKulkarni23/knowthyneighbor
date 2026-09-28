'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import { getAvailabilityForWeek, setAvailabilityForWeek } from '@/api/availability';
import type { MealSlot } from '@/types/database';
import { paperCardSx, pinGreenSx, ctaButtonSx } from '@/styles/board';

const MEALS: { slot: MealSlot; label: string; time: string }[] = [
  { slot: 'brunch', label: 'Brunch', time: '~10 am' },
  { slot: 'lunch', label: 'Lunch', time: '~12 pm' },
  { slot: 'dinner', label: 'Dinner', time: '~6 pm' },
];

type SlotKey = `${string}-${MealSlot}`;
function slotKey(date: string, meal: MealSlot): SlotKey {
  return `${date}-${meal}`;
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDayName(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

const labelSx = {
  fontFamily: 'var(--font-condensed), sans-serif',
  fontWeight: 700,
  fontSize: '1.05rem',
  color: 'var(--ink-blue-light)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  textAlign: 'center',
  lineHeight: 1.2,
} as const;

export default function AvailabilityCard({ coupleId }: { coupleId: string }) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [active, setActive] = useState<Set<SlotKey>>(new Set());
  const [saved, setSaved] = useState<Set<SlotKey>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const startStr = formatDate(weekStart);
  const endStr = formatDate(addDays(weekStart, 6));

  useEffect(() => {
    setLoading(true);
    getAvailabilityForWeek(coupleId, startStr, endStr).then(({ slots, error: e }) => {
      if (e) { setError(e); setLoading(false); return; }
      const set = new Set<SlotKey>();
      for (const s of slots) {
        if (s.specific_date) set.add(slotKey(s.specific_date, s.time_slot));
      }
      setActive(set);
      setSaved(set);
      setLoading(false);
    });
  }, [coupleId, startStr, endStr]);

  const toggle = useCallback((date: string, meal: MealSlot) => {
    setActive(prev => {
      const next = new Set(prev);
      const k = slotKey(date, meal);
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
      const lastDash = k.lastIndexOf('-');
      const date = k.slice(0, lastDash);
      const meal = k.slice(lastDash + 1) as MealSlot;
      return { day_of_week: null, specific_date: date, time_slot: meal, recurring: false };
    });
    const result = await setAvailabilityForWeek(coupleId, startStr, endStr, slots);
    if (result.error) { setError(result.error); setSaving(false); return; }
    setSaved(new Set(active));
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  const handleReset = () => { setActive(new Set(saved)); setError(null); };

  const prevWeek = () => setWeekStart(addDays(weekStart, -7));
  const nextWeek = () => setWeekStart(addDays(weekStart, 7));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPastWeek = addDays(weekStart, 6) < today;

  const weekLabel = `${formatShortDate(weekStart)} – ${formatShortDate(addDays(weekStart, 6))}`;

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

      {/* Week navigation */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, mt: 0.5 }}>
        <IconButton
          onClick={prevWeek}
          size="small"
          sx={{
            color: 'var(--ink-blue)',
            fontFamily: 'var(--font-condensed), sans-serif',
            fontWeight: 700,
            fontSize: '1.2rem',
            width: 32,
            height: 32,
            '&:hover': { color: 'var(--pushpin-red)', bgcolor: 'transparent' },
          }}
        >
          ‹
        </IconButton>
        <Typography
          sx={{
            fontFamily: 'var(--font-handwriting), cursive',
            fontSize: '1.25rem',
            color: 'var(--ink-blue)',
            lineHeight: 1.5,
          }}
        >
          {weekLabel}
        </Typography>
        <IconButton
          onClick={nextWeek}
          size="small"
          sx={{
            color: 'var(--ink-blue)',
            fontFamily: 'var(--font-condensed), sans-serif',
            fontWeight: 700,
            fontSize: '1.2rem',
            width: 32,
            height: 32,
            '&:hover': { color: 'var(--pushpin-red)', bgcolor: 'transparent' },
          }}
        >
          ›
        </IconButton>
      </Box>

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
          gap: '10px',
          mb: 2,
          opacity: loading ? 0.5 : 1,
          pointerEvents: loading ? 'none' : 'auto',
        }}
      >
        {/* Day + date headers */}
        <Box />
        {weekDates.map(d => {
          const dateStr = formatDate(d);
          const isToday = dateStr === formatDate(today);
          return (
            <Box key={dateStr} sx={{ textAlign: 'center' }}>
              <Typography sx={{ ...labelSx, color: isToday ? 'var(--pushpin-red)' : 'var(--ink-blue-light)' }}>
                {formatDayName(d)}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'var(--font-handwriting), cursive',
                  fontSize: '1.25rem',
                  color: isToday ? 'var(--pushpin-red)' : 'var(--ink-blue)',
                  fontWeight: isToday ? 700 : 400,
                  lineHeight: 1.2,
                }}
              >
                {d.getDate()}
              </Typography>
            </Box>
          );
        })}

        {/* Meal rows */}
        {MEALS.map(({ slot, label, time }) => (
          <Box key={slot} sx={{ display: 'contents' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', pr: 1 }}>
              <Typography sx={{ ...labelSx, textAlign: 'right' }}>
                {label}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'var(--font-handwriting), cursive',
                  fontSize: '0.95rem',
                  color: 'var(--ink-blue-light)',
                  lineHeight: 1,
                  mt: '2px',
                }}
              >
                {time}
              </Typography>
            </Box>
            {weekDates.map(d => {
              const dateStr = formatDate(d);
              const isPast = d < today;
              const isActive = active.has(slotKey(dateStr, slot));
              return (
                <Box
                  key={dateStr}
                  onClick={() => !isPast && toggle(dateStr, slot)}
                  sx={{
                    aspectRatio: '1',
                    minHeight: 52,
                    borderRadius: 0,
                    bgcolor: isActive ? 'var(--thumbtack-green)' : 'var(--paper-aged)',
                    border: '1.5px solid',
                    borderColor: isActive ? 'var(--thumbtack-green)' : 'var(--cork-dark)',
                    cursor: isPast ? 'default' : 'pointer',
                    opacity: isPast ? 0.4 : 1,
                    transition: 'background-color 0.12s ease, border-color 0.12s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    '&:hover': isPast ? {} : {
                      bgcolor: isActive ? 'var(--thumbtack-green)' : 'var(--cork-highlight)',
                      borderColor: isActive ? 'var(--thumbtack-green)' : 'var(--ink-blue-light)',
                    },
                  }}
                >
                  {isActive && (
                    <Typography
                      sx={{
                        fontFamily: 'var(--font-marker), cursive',
                        fontSize: '1.5rem',
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
      {dirty && !isPastWeek && (
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
