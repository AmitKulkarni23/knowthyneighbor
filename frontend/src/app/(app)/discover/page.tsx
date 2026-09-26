'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import FormHelperText from '@mui/material/FormHelperText';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import useCouple from '@/hooks/useCouple';
import useDiscovery from '@/hooks/useDiscovery';
import { sendJoinRequest } from '@/api/joinRequests';
import type { DiscoveryCouple } from '@/types/database';
import { joinRequestSchema, type JoinRequestFormData } from '@/lib/validations';
import { paperCardSx, pinRedSx, pinGreenSx, pinBlueSx, ctaButtonSx } from '@/styles/board';

const rotations = [-1.2, 1.5, -0.5, 1.8, -1, 0.8, -2, 1.2];
const pins = [pinRedSx, pinGreenSx, pinBlueSx];

export default function DiscoverPage() {
  const { data: couple, loading: coupleLoading } = useCouple();
  const { data: couples, loading: discoveryLoading, error } = useDiscovery(couple?.id ?? null);
  const [selectedCouple, setSelectedCouple] = useState<DiscoveryCouple | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<JoinRequestFormData>({
    resolver: zodResolver(joinRequestSchema),
    defaultValues: { mealType: 'dinner', message: '' },
  });

  const onSubmit = async (data: JoinRequestFormData) => {
    if (!couple || !selectedCouple) return;
    setSendError(null);

    const result = await sendJoinRequest({
      requester_couple_id: couple.id,
      host_couple_id: selectedCouple.id,
      meal_type: data.mealType,
      message: data.message || undefined,
    });

    if (result.error) {
      setSendError(result.error);
      return;
    }

    setSendSuccess(true);
    setTimeout(() => {
      setSelectedCouple(null);
      setSendSuccess(false);
      reset();
    }, 1500);
  };

  const handleCloseDialog = () => {
    setSelectedCouple(null);
    setSendError(null);
    setSendSuccess(false);
    reset();
  };

  const loading = coupleLoading || discoveryLoading;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: 'var(--pushpin-red)' }} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Typography
        sx={{
          fontFamily: 'var(--font-marker), cursive',
          fontSize: 'clamp(2rem, 4.5vw, 2.9rem)',
          color: 'var(--ink-blue)',
          mb: 1,
        }}
      >
        Find your dinner neighbors
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
        {couples.length === 0
          ? "No couples nearby yet. Check back soon!"
          : `${couples.length} couple${couples.length === 1 ? '' : 's'} near you`}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {couples.map((c, i) => {
          const deg = rotations[i % rotations.length];
          const pin = pins[i % pins.length];

          return (
            <Card
              key={c.id}
              sx={{
                ...paperCardSx as object,
                transform: `rotate(${deg}deg)`,
                p: '28px 24px',
                position: 'relative',
                '&:hover': {
                  ...(paperCardSx as any)['&:hover'],
                  transform: `rotate(${deg}deg) translateY(-4px) scale(1.01)`,
                },
              }}
            >
              <Box sx={pin} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, mt: 0.5 }}>
                <Typography
                  sx={{
                    fontFamily: 'var(--font-condensed), sans-serif',
                    fontWeight: 700,
                    fontSize: '1.55rem',
                    color: 'var(--ink-blue)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                  }}
                >
                  {c.couple_name ?? 'A couple nearby'}
                </Typography>
                <Chip
                  label={c.hosting_preference === 'host' ? 'HOSTS' : c.hosting_preference === 'visit' ? 'VISITORS' : 'EITHER'}
                  size="small"
                  sx={{
                    bgcolor: c.hosting_preference === 'host' ? 'var(--pushpin-red)' : 'var(--thumbtack-green)',
                    color: 'var(--paper)',
                  }}
                />
              </Box>
              {c.bio && (
                <Typography
                  sx={{
                    fontFamily: 'var(--font-handwriting), cursive',
                    fontSize: '1.35rem',
                    color: 'var(--ink-blue)',
                    lineHeight: 1.5,
                    mb: 1,
                  }}
                >
                  {c.bio}
                </Typography>
              )}
              <Typography
                sx={{
                  fontFamily: 'var(--font-handwriting), cursive',
                  fontSize: '1.15rem',
                  color: 'var(--ink-blue-light)',
                  mb: 2,
                }}
              >
                {c.distance_miles.toFixed(1)} miles away
              </Typography>
              <Button
                onClick={() => setSelectedCouple(c)}
                sx={{
                  ...ctaButtonSx as object,
                  py: '10px',
                  px: '28px',
                  fontSize: '0.95rem',
                }}
              >
                Send request
              </Button>
            </Card>
          );
        })}
      </Box>

      <Dialog
        open={Boolean(selectedCouple)}
        onClose={handleCloseDialog}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              ...paperCardSx as object,
              p: { xs: '48px 24px 28px', sm: '56px 36px 32px' },
              position: 'relative',
              overflow: 'visible',
            },
          },
        }}
      >
        <Box sx={pinRedSx} />
        <IconButton
          onClick={handleCloseDialog}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'var(--ink-blue-light)',
            '&:hover': { color: 'var(--pushpin-red)' },
          }}
        >
          <CloseIcon />
        </IconButton>

        {sendSuccess ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography
              sx={{
                fontFamily: 'var(--font-marker), cursive',
                fontSize: '1.6rem',
                color: 'var(--thumbtack-green)',
                mb: 1,
              }}
            >
              Request sent!
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--font-handwriting), cursive',
                fontSize: '1.2rem',
                color: 'var(--ink-blue-light)',
              }}
            >
              They&apos;ll get an email notification.
            </Typography>
          </Box>
        ) : (
          <>
            <Typography
              sx={{
                fontFamily: 'var(--font-marker), cursive',
                fontSize: 'clamp(1.4rem, 3vw, 1.8rem)',
                color: 'var(--ink-blue)',
                mb: 1,
              }}
            >
              Send a request
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--font-handwriting), cursive',
                fontSize: '1.2rem',
                color: 'var(--ink-blue-light)',
                lineHeight: 1.5,
                mb: 3,
              }}
            >
              to {selectedCouple?.couple_name ?? 'this couple'}
            </Typography>

            <Box component="form" id="request-form" onSubmit={handleSubmit(onSubmit)} noValidate>
              {sendError && (
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
                  {sendError}
                </Alert>
              )}
              <Controller
                name="mealType"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth sx={{ mt: 1, mb: 2 }} error={!!errors.mealType}>
                    <InputLabel
                      sx={{
                        fontFamily: 'var(--font-handwriting), cursive',
                        fontSize: '1.2rem',
                        color: 'var(--ink-blue-light)',
                      }}
                    >
                      Meal type
                    </InputLabel>
                    <Select
                      value={field.value}
                      onChange={field.onChange}
                      label="Meal type"
                      sx={{
                        fontFamily: 'var(--font-handwriting), cursive',
                        fontSize: '1.15rem',
                      }}
                    >
                      <MenuItem value="brunch">Brunch</MenuItem>
                      <MenuItem value="lunch">Lunch</MenuItem>
                      <MenuItem value="dinner">Dinner</MenuItem>
                    </Select>
                    {errors.mealType && (
                      <FormHelperText>{errors.mealType.message}</FormHelperText>
                    )}
                  </FormControl>
                )}
              />
              <TextField
                label="Add a note (optional)"
                {...register('message')}
                error={!!errors.message}
                helperText={errors.message?.message}
                fullWidth
                multiline
                rows={3}
                placeholder="Hey, we'd love to meet you for dinner! We make a great pasta."
                sx={{
                  '& .MuiInputLabel-root': {
                    fontFamily: 'var(--font-handwriting), cursive',
                    fontSize: '1.2rem',
                    color: 'var(--ink-blue-light)',
                  },
                  '& .MuiInput-root': {
                    fontFamily: 'var(--font-handwriting), cursive',
                    fontSize: '1.15rem',
                  },
                }}
              />
            </Box>

            <DialogActions sx={{ px: 0, pb: 0, pt: 3 }}>
              <Button
                onClick={handleCloseDialog}
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
                Cancel
              </Button>
              <Button
                type="submit"
                form="request-form"
                disabled={isSubmitting}
                sx={{
                  ...ctaButtonSx as object,
                  py: '10px',
                  px: '28px',
                  fontSize: '0.95rem',
                }}
              >
                {isSubmitting ? 'Sending...' : 'Send request'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
