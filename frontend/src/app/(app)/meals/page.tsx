'use client';

import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import useCouple from '@/hooks/useCouple';
import useConversations from '@/hooks/useConversations';
import { getMeals, updateMealStatus } from '@/api/meals';
import type { Meal, MealStatus } from '@/types/database';

export default function MealsPage() {
  const { data: couple, loading: coupleLoading } = useCouple();
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

  if (coupleLoading || convsLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

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

  const statusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'success' as const;
      case 'completed': return 'info' as const;
      case 'cancelled': return 'error' as const;
      default: return 'warning' as const;
    }
  };

  const renderMealActions = (meal: Meal) => {
    const isUpdating = updating === meal.id;
    switch (meal.status) {
      case 'proposed':
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="contained"
              onClick={() => handleStatusUpdate(meal.id, 'confirmed')}
              disabled={isUpdating}
            >
              Confirm
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => handleStatusUpdate(meal.id, 'cancelled')}
              disabled={isUpdating}
            >
              Cancel
            </Button>
          </Box>
        );
      case 'confirmed':
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="contained"
              onClick={() => handleStatusUpdate(meal.id, 'completed')}
              disabled={isUpdating}
            >
              Mark complete
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => handleStatusUpdate(meal.id, 'cancelled')}
              disabled={isUpdating}
            >
              Cancel
            </Button>
          </Box>
        );
      default:
        return null;
    }
  };

  const renderMealCard = (meal: Meal) => (
    <Card key={meal.id} sx={{ mb: 2 }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h3">
            {meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1)}
          </Typography>
          <Chip
            label={meal.status}
            size="small"
            color={statusColor(meal.status)}
          />
        </Box>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {new Date(meal.scheduled_at).toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Typography>
        {renderMealActions(meal)}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h1" sx={{ mb: 3 }}>
        Meals
      </Typography>

      <Typography variant="h2" sx={{ mb: 2 }}>
        Upcoming
      </Typography>
      {upcoming.length === 0 ? (
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          No upcoming meals. Send a request and plan one!
        </Typography>
      ) : (
        <Box sx={{ mb: 3 }}>{upcoming.map(renderMealCard)}</Box>
      )}

      <Divider sx={{ my: 3 }} />

      <Typography variant="h2" sx={{ mb: 2 }}>
        Past
      </Typography>
      {past.length === 0 ? (
        <Typography color="text.secondary">
          No past meals yet. Your first dinner is just around the corner.
        </Typography>
      ) : (
        past.map(renderMealCard)
      )}
    </Box>
  );
}
