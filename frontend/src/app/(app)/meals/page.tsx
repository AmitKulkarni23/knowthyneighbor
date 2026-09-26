'use client';

import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import { useAppContext } from '@/components/AppProvider';
import useConversations from '@/hooks/useConversations';
import { getMeals, updateMealStatus } from '@/api/meals';
import type { Meal, MealStatus } from '@/types/database';
import { paperCardSx, pinRedSx, pinGreenSx, pinBlueSx, ctaButtonSx } from '@/styles/board';

const rotations = [-1, 1.5, -0.5, 1.8, -1.3, 0.8];
const pins = [pinRedSx, pinGreenSx, pinBlueSx];

export default function MealsPage() {
  const { couple } = useAppContext();
  const { data: conversations, loading: convsLoading } = useConversations(couple?.id ?? null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (conversations.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all(
      conversations.map((c) => getMeals(c.id))
    ).then((results) => {
      const allMeals = results.flatMap((r) => r.meals);
      allMeals.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
      setMeals(allMeals);
      const firstError = results.find((r) => r.error)?.error ?? null;
      setError(firstError);
      setLoading(false);
    });
  }, [conversations]);

  const handleStatusUpdate = async (id: string, status: MealStatus) => {
    setUpdating(id);
    const result = await updateMealStatus(id, status);
    if (!result.error) {
      setMeals((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status, updated_at: new Date().toISOString() } : m))
      );
    }
    setUpdating(null);
  };

  if (convsLoading || loading) return null;

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const now = new Date();
  const upcoming = meals.filter(
    (m) => (m.status === 'proposed' || m.status === 'confirmed') && new Date(m.scheduled_at) >= now
  );
  const past = meals.filter(
    (m) => m.status === 'completed' || m.status === 'cancelled' || new Date(m.scheduled_at) < now
  );

  const statusChipSx = (status: string) => {
    switch (status) {
      case 'confirmed': return { bgcolor: 'var(--thumbtack-green)', color: 'var(--paper)' };
      case 'completed': return { bgcolor: 'var(--ink-blue)', color: 'var(--paper)' };
      case 'cancelled': return { bgcolor: 'var(--pushpin-red)', color: 'var(--paper)' };
      default: return { bgcolor: 'var(--index-yellow)', color: 'var(--ink-blue)' };
    }
  };

  const renderMealActions = (meal: Meal) => {
    const isUpdating = updating === meal.id;
    switch (meal.status) {
      case 'proposed':
        return (
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              onClick={() => handleStatusUpdate(meal.id, 'confirmed')}
              disabled={isUpdating}
              sx={{ ...ctaButtonSx as object, py: '10px', px: '28px', fontSize: '0.95rem' }}
            >
              Confirm
            </Button>
            <Button
              onClick={() => handleStatusUpdate(meal.id, 'cancelled')}
              disabled={isUpdating}
              sx={{
                ...ctaButtonSx as object,
                py: '10px', px: '28px', fontSize: '0.95rem',
                bgcolor: 'transparent',
                color: 'var(--pushpin-red)',
                border: '2px solid var(--pushpin-red)',
                '&:hover': { bgcolor: 'rgba(204, 68, 51, 0.06)', transform: 'scale(1.03)' },
              }}
            >
              Cancel
            </Button>
          </Box>
        );
      case 'confirmed':
        return (
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              onClick={() => handleStatusUpdate(meal.id, 'completed')}
              disabled={isUpdating}
              sx={{
                ...ctaButtonSx as object,
                py: '10px', px: '28px', fontSize: '0.95rem',
                bgcolor: 'var(--thumbtack-green)',
                '&:hover': { bgcolor: '#4a6a4d', transform: 'scale(1.03)' },
              }}
            >
              Mark complete
            </Button>
            <Button
              onClick={() => handleStatusUpdate(meal.id, 'cancelled')}
              disabled={isUpdating}
              sx={{
                ...ctaButtonSx as object,
                py: '10px', px: '28px', fontSize: '0.95rem',
                bgcolor: 'transparent',
                color: 'var(--pushpin-red)',
                border: '2px solid var(--pushpin-red)',
                '&:hover': { bgcolor: 'rgba(204, 68, 51, 0.06)', transform: 'scale(1.03)' },
              }}
            >
              Cancel
            </Button>
          </Box>
        );
      default:
        return null;
    }
  };

  const renderMealCard = (meal: Meal, index: number) => {
    const deg = rotations[index % rotations.length];
    const pin = pins[index % pins.length];

    return (
      <Card
        key={meal.id}
        sx={{
          ...paperCardSx as object,
          transform: `rotate(${deg}deg)`,
          p: '28px 24px',
          position: 'relative',
          mb: 2.5,
          '&:hover': {
            ...(paperCardSx as any)['&:hover'],
            transform: `rotate(${deg}deg) translateY(-4px) scale(1.01)`,
          },
        }}
      >
        <Box sx={pin} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, mt: 0.5 }}>
          <Typography
            sx={{
              fontFamily: 'var(--font-condensed), sans-serif',
              fontWeight: 700,
              fontSize: '1.25rem',
              color: 'var(--ink-blue)',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
            }}
          >
            {meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1)}
          </Typography>
          <Chip
            label={meal.status.toUpperCase()}
            size="small"
            sx={statusChipSx(meal.status)}
          />
        </Box>
        <Typography
          sx={{
            fontFamily: 'var(--font-handwriting), cursive',
            fontSize: '1.2rem',
            color: 'var(--ink-blue-light)',
            mb: 2,
          }}
        >
          {new Date(meal.scheduled_at).toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Typography>
        {renderMealActions(meal)}
      </Card>
    );
  };

  return (
    <Box>
      <Typography
        sx={{
          fontFamily: 'var(--font-marker), cursive',
          fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
          color: 'var(--ink-blue)',
          mb: 3,
        }}
      >
        Meals
      </Typography>

      <Typography
        sx={{
          fontFamily: 'var(--font-marker), cursive',
          fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)',
          color: 'var(--ink-blue)',
          mb: 2,
        }}
      >
        Upcoming
      </Typography>
      {upcoming.length === 0 ? (
        <Typography
          sx={{
            fontFamily: 'var(--font-handwriting), cursive',
            fontSize: '1.25rem',
            color: 'var(--ink-blue-light)',
            lineHeight: 1.6,
            mb: 3,
          }}
        >
          No upcoming meals. Send a request and plan one!
        </Typography>
      ) : (
        <Box sx={{ mb: 3 }}>{upcoming.map((m, i) => renderMealCard(m, i))}</Box>
      )}

      <Box sx={{ borderTop: '2px dashed var(--cork-dark)', my: 4 }} />

      <Typography
        sx={{
          fontFamily: 'var(--font-marker), cursive',
          fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)',
          color: 'var(--ink-blue)',
          mb: 2,
        }}
      >
        Past
      </Typography>
      {past.length === 0 ? (
        <Typography
          sx={{
            fontFamily: 'var(--font-handwriting), cursive',
            fontSize: '1.25rem',
            color: 'var(--ink-blue-light)',
            lineHeight: 1.6,
          }}
        >
          No past meals yet. Your first dinner is just around the corner.
        </Typography>
      ) : (
        past.map((m, i) => renderMealCard(m, i))
      )}
    </Box>
  );
}
