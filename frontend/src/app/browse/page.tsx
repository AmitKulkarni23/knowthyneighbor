'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import { browseCouplesPublic, type BrowseCouple } from '@/api/browse';
import { boardBgSx, paperCardSx, pinRedSx, pinGreenSx, pinBlueSx, ctaButtonSx } from '@/styles/board';
import SignInDialog from '@/components/SignInDialog';
import EmptyStateCard from '@/components/EmptyStateCard';

const rotations = [-1.2, 1.5, -0.5, 1.8, -1, 0.8, -2, 1.2];
const pins = [pinRedSx, pinGreenSx, pinBlueSx];
// Picked by position (like rotations/pins), not Math.random, so cards don't reshuffle on re-render
const headings = [
  'Pull up a chair',
  'Table for four?',
  'Dinner friends wanted',
  'Save us a seat',
  'Come hungry',
  'Seconds, anyone?',
  'The kettle is on',
  'Potluck, anyone?',
];

export default function BrowsePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [couples, setCouples] = useState<BrowseCouple[]>([]);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    // Zip search is for signed-in members only; don't even ask the backend
    if (/\d/.test(trimmed)) {
      setSearchError('Search by city name, e.g. San Diego');
      return;
    }
    setSearching(true);
    setSearchError(null);

    const result = await browseCouplesPublic(trimmed);

    if (result.error) {
      setSearchError(result.error);
    } else {
      setCouples(result.couples);
      setTotal(result.total);
    }
    setSearched(true);
    setSearching(false);
  }, [query]);

  return (
    <Box sx={{ ...boardBgSx as object, px: 2, py: 5, pb: 10 }}>
      <Box sx={{ maxWidth: 700, mx: 'auto', position: 'relative', zIndex: 1 }}>
        {/* Back to landing */}
        <Button
          onClick={() => router.push('/')}
          sx={{
            fontFamily: 'var(--font-condensed), sans-serif',
            fontWeight: 700,
            fontSize: '0.9rem',
            color: 'var(--paper)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            mb: 3,
            textShadow: '1px 1px 3px rgba(60, 40, 20, 0.4)',
            '&:hover': { color: 'var(--index-yellow)', bgcolor: 'transparent' },
          }}
        >
          &larr; Back to board
        </Button>

        {/* Search card */}
        <Card
          sx={{
            ...paperCardSx as object,
            transform: 'rotate(-0.8deg)',
            p: { xs: '36px 24px 28px', sm: '48px 36px 32px' },
            position: 'relative',
            mb: 4,
            '&:hover': {
              ...(paperCardSx as any)['&:hover'],
              transform: 'rotate(-0.8deg) translateY(-4px) scale(1.01)',
            },
          }}
        >
          <Box sx={pinRedSx} />
          <Typography
            sx={{
              fontFamily: 'var(--font-marker), cursive',
              fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
              color: 'var(--ink-blue)',
              mb: 1,
            }}
          >
            Browse the Board
          </Typography>
          <Typography
            sx={{
              fontFamily: 'var(--font-handwriting), cursive',
              fontSize: '1.35rem',
              color: 'var(--ink-blue-light)',
              lineHeight: 1.5,
              mb: 3,
            }}
          >
            Enter a city name to see couples looking for dinner friends.
          </Typography>

          <Box
            component="form"
            onSubmit={(e: React.FormEvent) => { e.preventDefault(); handleSearch(); }}
            sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}
          >
            <TextField
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. San Diego"
              error={!!searchError}
              helperText={searchError}
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
              sx={{ flex: 1, maxWidth: 280 }}
            />
            <Button
              type="submit"
              disabled={searching}
              sx={{
                ...ctaButtonSx as object,
                py: '8px',
                px: '28px',
                fontSize: '0.95rem',
              }}
            >
              {searching ? 'Looking...' : 'Search'}
            </Button>
          </Box>
        </Card>

        {/* Results */}
        {searched && couples.length === 0 && (
          <EmptyStateCard
            message={`No couples found for "${query.trim()}". Try another city — or sign up and be the first!`}
            pin="blue"
            rotation={0.6}
            sx={{ mb: 3 }}
          />
        )}

        {couples.length > 0 && (
          <>
            <Typography
              sx={{
                fontFamily: 'var(--font-handwriting), cursive',
                fontSize: '1.55rem',
                color: 'var(--paper)',
                mb: 3,
                lineHeight: 1.5,
                textShadow: '1px 1px 3px rgba(60, 40, 20, 0.4)',
              }}
            >
              {total} couple{total === 1 ? '' : 's'} on the board in &ldquo;{query.trim()}&rdquo;
              {total > couples.length && ` (showing ${couples.length})`}
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {couples.map((c, i) => {
                const deg = rotations[i % rotations.length];
                const pin = pins[i % pins.length];
                const location = [c.city, c.state, c.country].filter(Boolean).join(', ');

                return (
                  <Card
                    key={i}
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
                    <Typography
                      sx={{
                        fontFamily: 'var(--font-condensed), sans-serif',
                        fontWeight: 700,
                        fontSize: '1.55rem',
                        color: 'var(--ink-blue)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                        mb: 0.5,
                        mt: 0.5,
                      }}
                    >
                      {headings[i % headings.length]}
                    </Typography>
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
                    {location && (
                      <Typography
                        sx={{
                          fontFamily: 'var(--font-handwriting), cursive',
                          fontSize: '1.15rem',
                          color: 'var(--ink-blue-light)',
                        }}
                      >
                        {location}
                      </Typography>
                    )}
                  </Card>
                );
              })}
            </Box>
          </>
        )}

        {/* Bottom CTA for signing up */}
        {searched && (
          <Card
            sx={{
              ...paperCardSx as object,
              transform: 'rotate(0.5deg)',
              p: '32px 28px',
              position: 'relative',
              mt: 4,
              textAlign: 'center',
              '&:hover': {
                ...(paperCardSx as any)['&:hover'],
                transform: 'rotate(0.5deg) translateY(-4px) scale(1.01)',
              },
            }}
          >
            <Box sx={pinGreenSx} />
            <Typography
              sx={{
                fontFamily: 'var(--font-marker), cursive',
                fontSize: '1.6rem',
                color: 'var(--ink-blue)',
                mb: 1.5,
              }}
            >
              Ready to meet your neighbors?
            </Typography>
            <Button
              onClick={() => setSignInOpen(true)}
              sx={ctaButtonSx}
            >
              Put your card on the board
            </Button>
          </Card>
        )}
      </Box>

      <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} />
    </Box>
  );
}
