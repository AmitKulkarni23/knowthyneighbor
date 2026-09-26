'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import { boardBgSx, paperCardSx, pinRedSx, pinGreenSx, pinBlueSx, ctaButtonSx } from '@/styles/board';
import SignInDialog from '@/components/SignInDialog';

const rotatedCard = (deg: number) => ({
  ...paperCardSx as object,
  transform: `rotate(${deg}deg)`,
  '&:hover': {
    ...(paperCardSx as any)['&:hover'],
    transform: `rotate(${deg}deg) translateY(-4px) scale(1.01)`,
  },
});

export default function Home() {
  const [signInOpen, setSignInOpen] = useState(false);

  return (
    <Box sx={{ ...boardBgSx as object, px: 2, py: 5, pb: 10 }}>
      {/* ── Hero ── */}
      <Box sx={{ maxWidth: 1100, mx: 'auto', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4, alignItems: 'start', position: 'relative', zIndex: 1 }}>
        {/* Main flyer */}
        <Card sx={{ ...rotatedCard(-1.2), p: { xs: '36px 24px 16px', md: '48px 36px 20px' }, maxWidth: 520, borderBottom: 'none' }}>
          <Box sx={pinRedSx} />
          <Typography sx={{ fontFamily: 'var(--font-marker), cursive', fontSize: 'clamp(1.8rem, 4.5vw, 2.8rem)', color: 'var(--ink-blue)', lineHeight: 1.1, letterSpacing: '-0.02em', mb: 2, whiteSpace: 'nowrap' }}>
            Know Thy Neighbor
          </Typography>
          <Typography sx={{ fontFamily: 'var(--font-handwriting), cursive', fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)', color: 'var(--ink-blue-light)', lineHeight: 1.4, mb: 4 }}>
            Find couples in your neighborhood for shared meals
          </Typography>
          <Typography sx={{ fontFamily: 'var(--font-handwriting), cursive', fontSize: '1.2rem', lineHeight: 1.5, color: 'var(--ink-blue)', mb: 3, maxWidth: '55ch' }}>
            Create a simple couple profile with your name, age, and zip code. Browse other couples nearby. Send a request to join them for dinner, lunch, or brunch. Chat to plan the details. Then sit down and share a real meal with real people.
          </Typography>
          <Typography sx={{ fontFamily: 'var(--font-handwriting), cursive', fontSize: '1.35rem', color: 'var(--thumbtack-green)', p: '12px 16px', bgcolor: 'rgba(91, 127, 94, 0.06)', mb: '20px', lineHeight: 1.5 }}>
            We only ask for your zip code. We never ask for or store your home address. Share it only when you&apos;re ready, directly in chat, after you&apos;ve done your own due diligence.
          </Typography>

          {/* CTA */}
          <Box sx={{ textAlign: 'center', borderTop: '2px dashed var(--cork-dark)', mx: { xs: '-24px', md: '-36px' }, px: { xs: 3, md: '36px' }, pt: 3, pb: '20px', bgcolor: 'var(--paper)' }}>
            <Button onClick={() => setSignInOpen(true)} sx={ctaButtonSx}>Sign In</Button>
          </Box>
        </Card>

        {/* Side cards */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: { xs: 0, md: '20px' } }}>
          {/* Couple card - The Patels */}
          <Card sx={{ ...rotatedCard(1.5), p: '24px 20px' }}>
            <Box sx={pinGreenSx} />
            <Typography sx={{ fontFamily: 'var(--font-condensed), sans-serif', fontWeight: 700, fontSize: '1.5rem', color: 'var(--ink-blue)', mb: 0.75 }}>
              The Patels
            </Typography>
            <Typography sx={{ fontFamily: 'var(--font-handwriting), cursive', fontSize: '1.15rem', color: 'var(--ink-blue-light)', mb: 1.25 }}>
              2.3 miles away &middot; Love Thai food
            </Typography>
            <Chip label="Hosts" size="small" sx={{ bgcolor: 'var(--pushpin-red)', color: 'var(--paper)' }} />
          </Card>

          {/* Index card */}
          <Card sx={{ ...rotatedCard(-2.3), p: '20px 18px', bgcolor: 'var(--index-yellow)' }}>
            <Box sx={pinBlueSx} />
            <Typography sx={{ fontFamily: 'var(--font-handwriting), cursive', fontSize: '1.35rem', color: 'var(--ink-blue)', lineHeight: 1.5 }}>
              Looking for dinner friends! We just moved to the neighborhood and Saturdays work best for us. We make a mean lasagna.
            </Typography>
          </Card>

          {/* Couple card - The Nguyens */}
          <Card sx={{ ...rotatedCard(-1), p: '24px 20px' }}>
            <Box sx={{ ...pinRedSx as object }} />
            <Typography sx={{ fontFamily: 'var(--font-condensed), sans-serif', fontWeight: 700, fontSize: '1.5rem', color: 'var(--ink-blue)', mb: 0.75 }}>
              The Nguyens
            </Typography>
            <Typography sx={{ fontFamily: 'var(--font-handwriting), cursive', fontSize: '1.15rem', color: 'var(--ink-blue-light)', mb: 1.25 }}>
              4.1 miles away &middot; Brunch enthusiasts
            </Typography>
            <Chip label="Visitors" size="small" sx={{ bgcolor: 'var(--thumbtack-green)', color: 'var(--paper)' }} />
          </Card>

          {/* Calendar card */}
          <Card sx={{ ...rotatedCard(0.8), p: '20px' }}>
            <Box sx={pinGreenSx} />
            <Typography sx={{ fontFamily: 'var(--font-condensed), sans-serif', fontWeight: 700, fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-blue)', mb: 1.5 }}>
              Our Availability
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {['Mon', 'Tue', 'Wed', 'Thu'].map((d) => (
                <Box key={d} sx={{ p: '6px 4px', textAlign: 'center', fontFamily: 'var(--font-handwriting), cursive', fontSize: '1rem', color: 'var(--ink-blue-light)', bgcolor: 'var(--paper-aged)', borderRadius: '2px' }}>{d}</Box>
              ))}
              {['Fri Dinner', 'Sat Brunch', 'Sat Dinner', 'Sun Lunch'].map((d) => (
                <Box key={d} sx={{ p: '6px 4px', textAlign: 'center', fontFamily: 'var(--font-handwriting), cursive', fontSize: '1rem', color: 'var(--paper)', bgcolor: 'var(--thumbtack-green)', borderRadius: '2px', fontWeight: 600 }}>{d}</Box>
              ))}
              <Box sx={{ p: '6px 4px', textAlign: 'center', fontFamily: 'var(--font-handwriting), cursive', fontSize: '1rem', color: 'var(--ink-blue-light)', bgcolor: 'var(--paper-aged)', borderRadius: '2px' }}>Sun</Box>
            </Box>
          </Card>
        </Box>
      </Box>

      {/* ── How It Works ── */}
      <Box sx={{ maxWidth: 1100, mx: 'auto', mt: 10, position: 'relative', zIndex: 1 }}>
        <Typography sx={{ fontFamily: 'var(--font-marker), cursive', fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', color: 'var(--paper)', textAlign: 'center', mb: 6, textShadow: '1px 2px 4px rgba(60, 40, 20, 0.4)' }}>
          How It Works
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3 }}>
          {[
            { n: '1', title: 'Pin Your Card', desc: 'Create a couple profile with your names, ages, and zip code. Your partner joins with a link you share.', deg: -1, pin: 'red' },
            { n: '2', title: 'Browse the Board', desc: 'See other couples nearby. Filter by availability, meal type, and whether they host or visit.', deg: 0.8, pin: 'green' },
            { n: '3', title: 'Send a Request', desc: 'Found someone interesting? Send a join request with a short note. They get an email and decide.', deg: -0.5, pin: 'blue' },
            { n: '4', title: 'Share a Meal', desc: 'Once accepted, chat to plan the details. Pick a date, a meal type, and sit down together.', deg: 1.2, pin: 'red' },
          ].map((step) => (
            <Card key={step.n} sx={{ ...rotatedCard(step.deg), p: '32px 20px', textAlign: 'center' }}>
              <Box sx={step.pin === 'red' ? pinRedSx : step.pin === 'green' ? pinGreenSx : pinBlueSx} />
              <Typography sx={{ fontFamily: 'var(--font-marker), cursive', fontSize: '2.4rem', color: 'var(--pushpin-red)', mb: 1 }}>{step.n}</Typography>
              <Typography sx={{ fontFamily: 'var(--font-condensed), sans-serif', fontWeight: 700, fontSize: '1.1rem', color: 'var(--ink-blue)', mb: 1, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{step.title}</Typography>
              <Typography sx={{ fontFamily: 'var(--font-handwriting), cursive', fontSize: '1.35rem', color: 'var(--ink-blue-light)', lineHeight: 1.5 }}>{step.desc}</Typography>
            </Card>
          ))}
        </Box>
      </Box>

      {/* ── Promise ── */}
      <Box sx={{ maxWidth: 700, mx: 'auto', mt: 10, position: 'relative', zIndex: 1 }}>
        <Card sx={{ ...rotatedCard(0.5), p: '40px 36px', textAlign: 'center' }}>
          <Box sx={pinRedSx} />
          <Typography sx={{ fontFamily: 'var(--font-marker), cursive', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: 'var(--ink-blue)', mb: 2 }}>
            No algorithms. No AI slop. Just neighbors.
          </Typography>
          <Typography sx={{ fontFamily: 'var(--font-handwriting), cursive', fontSize: '1.5rem', color: 'var(--ink-blue-light)', lineHeight: 1.6, mb: 3, maxWidth: '50ch', mx: 'auto' }}>
            We built this because people are tired of screens pretending to be connection. KnowThyNeighbor gets you off the app and around a table. The only thing we optimize for is a real meal with real people.
          </Typography>
          <Button onClick={() => setSignInOpen(true)} sx={ctaButtonSx}>Put Your Card on the Board</Button>
        </Card>
      </Box>

      <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} />
    </Box>
  );
}
