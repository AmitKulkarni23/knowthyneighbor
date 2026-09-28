'use client';

import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import type { Availability, MealSlot } from '@/types/database';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MEAL_LABELS: Record<MealSlot, string> = {
  brunch: 'Brunch ~10 am',
  lunch: 'Lunch ~12 pm',
  dinner: 'Dinner ~6 pm',
};

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type Props = {
  slots: Availability[];
  value: string;
  onChange: (value: string) => void;
};

export default function SlotCalendar({ slots, value, onChange }: Props) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const availableDates = useMemo(() => {
    const map = new Map<string, MealSlot[]>();
    for (const s of slots) {
      if (!s.specific_date) continue;
      const existing = map.get(s.specific_date) ?? [];
      existing.push(s.time_slot);
      map.set(s.specific_date, existing);
    }
    return map;
  }, [slots]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, month, 1);
  const startDow = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = toDateStr(new Date());

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const mealsForDate = selectedDate ? (availableDates.get(selectedDate) ?? []) : [];

  return (
    <Box>
      {/* Month nav */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <IconButton
          onClick={prevMonth}
          size="small"
          sx={{
            color: 'var(--ink-blue)',
            fontWeight: 700,
            fontSize: '1.2rem',
            width: 28,
            height: 28,
            '&:hover': { color: 'var(--pushpin-red)', bgcolor: 'transparent' },
          }}
        >
          ‹
        </IconButton>
        <Typography
          sx={{
            fontFamily: 'var(--font-handwriting), cursive',
            fontSize: '1.15rem',
            color: 'var(--ink-blue)',
          }}
        >
          {monthLabel}
        </Typography>
        <IconButton
          onClick={nextMonth}
          size="small"
          sx={{
            color: 'var(--ink-blue)',
            fontWeight: 700,
            fontSize: '1.2rem',
            width: 28,
            height: 28,
            '&:hover': { color: 'var(--pushpin-red)', bgcolor: 'transparent' },
          }}
        >
          ›
        </IconButton>
      </Box>

      {/* Weekday headers */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', mb: '4px' }}>
        {WEEKDAYS.map(w => (
          <Typography
            key={w}
            sx={{
              fontFamily: 'var(--font-condensed), sans-serif',
              fontWeight: 700,
              fontSize: '0.75rem',
              color: 'var(--ink-blue-light)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              textAlign: 'center',
            }}
          >
            {w}
          </Typography>
        ))}
      </Box>

      {/* Day grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', mb: 2 }}>
        {cells.map((day, i) => {
          if (day === null) return <Box key={`e-${i}`} />;

          const dateStr = toDateStr(new Date(year, month, day));
          const hasSlots = availableDates.has(dateStr);
          const isPast = dateStr < today;
          const isSelected = dateStr === selectedDate;

          return (
            <Box
              key={dateStr}
              onClick={() => {
                if (hasSlots && !isPast) {
                  setSelectedDate(isSelected ? null : dateStr);
                  onChange('');
                }
              }}
              sx={{
                width: '100%',
                aspectRatio: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: hasSlots && !isPast ? 'pointer' : 'default',
                bgcolor: isSelected
                  ? 'var(--thumbtack-green)'
                  : hasSlots && !isPast
                  ? 'var(--paper-aged)'
                  : 'transparent',
                border: '1.5px solid',
                borderColor: isSelected
                  ? 'var(--thumbtack-green)'
                  : hasSlots && !isPast
                  ? 'var(--cork-dark)'
                  : 'transparent',
                opacity: isPast ? 0.35 : 1,
                transition: 'background-color 0.12s ease',
                '&:hover': hasSlots && !isPast ? {
                  bgcolor: isSelected ? 'var(--thumbtack-green)' : 'var(--cork-highlight)',
                } : {},
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'var(--font-handwriting), cursive',
                  fontSize: '0.95rem',
                  color: isSelected ? 'var(--paper)' : dateStr === today ? 'var(--pushpin-red)' : 'var(--ink-blue)',
                  fontWeight: dateStr === today ? 700 : 400,
                  lineHeight: 1,
                }}
              >
                {day}
              </Typography>
              {hasSlots && !isPast && !isSelected && (
                <Box
                  sx={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    bgcolor: 'var(--thumbtack-green)',
                    mt: '2px',
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>

      {/* Meal chips for selected date */}
      {selectedDate && mealsForDate.length > 0 && (
        <Box>
          <Typography
            sx={{
              fontFamily: 'var(--font-condensed), sans-serif',
              fontWeight: 700,
              fontSize: '0.8rem',
              color: 'var(--ink-blue-light)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              mb: 1,
            }}
          >
            Available on{' '}
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {mealsForDate.map(meal => {
              const slotValue = `${selectedDate}|${meal}`;
              const isActive = value === slotValue;
              return (
                <Chip
                  key={meal}
                  label={MEAL_LABELS[meal]}
                  onClick={() => onChange(slotValue)}
                  sx={{
                    fontFamily: 'var(--font-handwriting), cursive',
                    fontSize: '1.05rem',
                    bgcolor: isActive ? 'var(--thumbtack-green)' : 'var(--paper-aged)',
                    color: isActive ? 'var(--paper)' : 'var(--ink-blue)',
                    border: '1.5px solid',
                    borderColor: isActive ? 'var(--thumbtack-green)' : 'var(--cork-dark)',
                    borderRadius: 0,
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: isActive ? 'var(--thumbtack-green)' : 'var(--cork-highlight)',
                    },
                  }}
                />
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}
