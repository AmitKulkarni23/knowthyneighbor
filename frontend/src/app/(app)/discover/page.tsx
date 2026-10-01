'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { useAppContext } from '@/components/AppProvider';
import useDiscovery from '@/hooks/useDiscovery';
import { sendJoinRequest } from '@/api/joinRequests';
import { getCoupleAvailability } from '@/api/availability';
import type { DiscoveryCouple, AvailableSlot, MealSlot } from '@/types/database';
import { joinRequestSchema, type JoinRequestFormData } from '@/lib/validations';
import { paperCardSx, pinRedSx, pinGreenSx, pinBlueSx, ctaButtonSx } from '@/styles/board';
import EmptyStateCard from '@/components/EmptyStateCard';
import SlotCalendar from '@/components/SlotCalendar';

const rotations = [-1.2, 1.5, -0.5, 1.8, -1, 0.8, -2, 1.2];
const pins = [pinRedSx, pinGreenSx, pinBlueSx];

export default function DiscoverPage() {
  const router = useRouter();
  const { couple } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCity, setActiveCity] = useState<string | undefined>(undefined);
  const [activeZip, setActiveZip] = useState<string | undefined>(undefined);
  const [searchLabel, setSearchLabel] = useState<string | null>(null);
  const { data: couples, loading: discoveryLoading, error } = useDiscovery(
    couple?.id ?? null,
    activeCity,
    activeZip
  );
  const [selectedCouple, setSelectedCouple] = useState<DiscoveryCouple | null>(null);
  const [hostSlots, setHostSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  useEffect(() => {
    if (!selectedCouple) return;
    setSlotsLoading(true);
    getCoupleAvailability(selectedCouple.couple_id).then(({ slots, error: slotsError }) => {
      if (slotsError) setSendError(`Couldn't load their open dates. ${slotsError}`);
      setHostSlots(slots);
      setSlotsLoading(false);
    });
  }, [selectedCouple]);

  const handleSearch = useCallback(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setActiveCity(undefined);
      setActiveZip(undefined);
      setSearchLabel(null);
      return;
    }
    if (/^\d+$/.test(trimmed)) {
      setActiveCity(undefined);
      setActiveZip(trimmed);
    } else {
      setActiveCity(trimmed);
      setActiveZip(undefined);
    }
    setSearchLabel(trimmed);
  }, [searchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setActiveCity(undefined);
    setActiveZip(undefined);
    setSearchLabel(null);
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<JoinRequestFormData>({
    resolver: zodResolver(joinRequestSchema),
    defaultValues: { slot: '', message: '' },
  });

  const selectedSlot = watch('slot');

  const onSubmit = async (data: JoinRequestFormData) => {
    if (!couple || !selectedCouple) return;
    setSendError(null);

    const [proposedDate, mealType] = data.slot.split('|') as [string, MealSlot];

    const result = await sendJoinRequest({
      requester_couple_id: couple.id,
      host_couple_id: selectedCouple.couple_id,
      meal_type: mealType,
      proposed_date: proposedDate,
      message: data.message || undefined,
    });

    if (result.error) {
      setSendError(result.error);
      return;
    }

    setSentTo(prev => new Set(prev).add(selectedCouple.couple_id));
    setSendSuccess(true);
    setTimeout(() => {
      setSelectedCouple(null);
      setSendSuccess(false);
      reset();
    }, 1500);
  };

  const handleCloseDialog = () => {
    setSelectedCouple(null);
    setHostSlots([]);
    setSendError(null);
    setSendSuccess(false);
    reset();
  };

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

      {/* Zip code search */}
      <Box
        component="form"
        onSubmit={(e: React.FormEvent) => { e.preventDefault(); handleSearch(); }}
        sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'flex-start' }}
      >
        <TextField
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={couple?.city ? `City or zip code (yours: ${couple.city})` : 'City or zip code'}
          size="small"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'var(--ink-blue-light)', fontSize: '1.2rem' }} />
                </InputAdornment>
              ),
              sx: {
                fontFamily: 'var(--font-handwriting), cursive',
                fontSize: '1.15rem',
                bgcolor: 'var(--paper)',
              },
            },
          }}
          sx={{ flex: 1, maxWidth: 480 }}
        />
        <Button
          type="submit"
          disabled={discoveryLoading}
          sx={{
            fontFamily: 'var(--font-condensed), sans-serif',
            fontWeight: 700,
            fontSize: '0.9rem',
            color: 'var(--paper)',
            bgcolor: 'var(--ink-blue)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            px: 2,
            minHeight: 40,
            '&:hover': { bgcolor: 'var(--pushpin-red)' },
          }}
        >
          {discoveryLoading ? 'Searching...' : 'Go'}
        </Button>
        {searchLabel && (
          <Button
            onClick={handleClearSearch}
            sx={{
              fontFamily: 'var(--font-condensed), sans-serif',
              fontWeight: 700,
              fontSize: '0.85rem',
              color: 'var(--ink-blue-light)',
              textTransform: 'uppercase',
              minHeight: 40,
              '&:hover': { color: 'var(--pushpin-red)', bgcolor: 'transparent' },
            }}
          >
            Reset
          </Button>
        )}
      </Box>

      {couples.length === 0 ? (
        <EmptyStateCard
          message={searchLabel ? `No couples found for "${searchLabel}".` : 'No couples nearby yet. Check back soon!'}
          pin="blue"
          rotation={0.6}
          sx={{ mb: 3 }}
        />
      ) : (
        <Typography
          sx={{
            fontFamily: 'var(--font-handwriting), cursive',
            fontSize: '1.55rem',
            color: 'var(--ink-blue)',
            mb: 3,
            lineHeight: 1.5,
          }}
        >
          {searchLabel
            ? `${couples.length} couple${couples.length === 1 ? '' : 's'} matching "${searchLabel}"`
            : `${couples.length} couple${couples.length === 1 ? '' : 's'} nearby`}
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {couples.map((c, i) => {
          const deg = rotations[i % rotations.length];
          const pin = pins[i % pins.length];

          return (
            <Card
              key={c.couple_id}
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
              <Box sx={{ mb: 1.5, mt: 0.5 }}>
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
                {[c.city, c.state].filter(Boolean).join(', ') || `${c.distance_miles.toFixed(1)} miles away`}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                {(() => {
                  const status = c.request_status ?? (sentTo.has(c.couple_id) ? 'pending' : null);
                  const noAvailability = !c.has_availability;
                  const disabled = !!status || noAvailability;
                  return (
                    <Button
                      onClick={() => setSelectedCouple(c)}
                      disabled={disabled}
                      sx={{
                        ...ctaButtonSx as object,
                        py: '10px',
                        px: '28px',
                        fontSize: '0.95rem',
                        '&.Mui-disabled': {
                          bgcolor: 'var(--cork-dark)',
                          color: 'var(--paper-aged)',
                        },
                      }}
                    >
                      {status === 'accepted' ? 'Already connected' : status === 'pending' ? 'Request sent' : noAvailability ? 'No dates available' : 'Send request'}
                    </Button>
                  );
                })()}
                <Button
                  onClick={() => router.push(`/couple/${c.couple_id}`)}
                  sx={{
                    fontFamily: 'var(--font-condensed), sans-serif',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: 'var(--ink-blue)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    py: '10px',
                    px: '20px',
                    '&:hover': { color: 'var(--pushpin-red)', bgcolor: 'transparent' },
                  }}
                >
                  View profile
                </Button>
              </Box>
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
              overflowY: 'auto',
              maxHeight: '85vh',
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

              {slotsLoading ? (
                <Typography sx={{ fontFamily: 'var(--font-handwriting), cursive', fontSize: '1.1rem', color: 'var(--ink-blue-light)', mb: 2 }}>
                  Loading availability...
                </Typography>
              ) : hostSlots.length === 0 ? (
                <Typography sx={{ fontFamily: 'var(--font-handwriting), cursive', fontSize: '1.1rem', color: 'var(--ink-blue-light)', mb: 2 }}>
                  No available dates yet. Check back later!
                </Typography>
              ) : (
                <Box sx={{ mb: 2 }}>
                  <SlotCalendar
                    slots={hostSlots}
                    value={selectedSlot}
                    onChange={(v) => setValue('slot', v, { shouldValidate: true })}
                  />
                </Box>
              )}
              {errors.slot && (
                <Typography sx={{ fontFamily: 'var(--font-handwriting), cursive', fontSize: '0.95rem', color: 'var(--pushpin-red)', mb: 1.5 }}>
                  {errors.slot.message}
                </Typography>
              )}

              <TextField
                label="Add a note"
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
                disabled={isSubmitting || !selectedSlot || slotsLoading || hostSlots.length === 0}
                sx={{
                  ...ctaButtonSx as object,
                  py: '10px',
                  px: '28px',
                  fontSize: '0.95rem',
                  '&.Mui-disabled': {
                    bgcolor: 'var(--cork-dark)',
                    color: 'var(--paper-aged)',
                  },
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
