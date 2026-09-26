'use client';

import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import useCouple from '@/hooks/useCouple';
import useConversations from '@/hooks/useConversations';
import { paperCardSx, pinRedSx, pinGreenSx, pinBlueSx } from '@/styles/board';

const rotations = [1.2, -0.8, 1.5, -1.1, 0.6, -1.8];
const pins = [pinRedSx, pinGreenSx, pinBlueSx];

export default function ChatListPage() {
  const router = useRouter();
  const { data: couple, loading: coupleLoading } = useCouple();
  const { data: conversations, loading, error } = useConversations(couple?.id ?? null);

  if (coupleLoading || loading) {
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
          fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
          color: 'var(--ink-blue)',
          mb: 3,
        }}
      >
        Chats
      </Typography>

      {conversations.length === 0 ? (
        <Typography
          sx={{
            fontFamily: 'var(--font-handwriting), cursive',
            fontSize: '1.25rem',
            color: 'var(--ink-blue-light)',
            lineHeight: 1.6,
          }}
        >
          No conversations yet. Once a join request is accepted, you can start chatting here.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {conversations.map((conv, i) => {
            const deg = rotations[i % rotations.length];
            const pin = pins[i % pins.length];
            const otherCoupleId = conv.couple_1_id === couple?.id ? conv.couple_2_id : conv.couple_1_id;
            return (
              <Card
                key={conv.id}
                sx={{
                  ...paperCardSx as object,
                  transform: `rotate(${deg}deg)`,
                  position: 'relative',
                  '&:hover': {
                    ...(paperCardSx as any)['&:hover'],
                    transform: `rotate(${deg}deg) translateY(-4px) scale(1.01)`,
                  },
                }}
              >
                <Box sx={pin} />
                <CardActionArea
                  onClick={() => router.push(`/chat/${conv.id}`)}
                  sx={{ p: '28px 24px', pt: '20px' }}
                >
                  <Typography
                    sx={{
                      fontFamily: 'var(--font-condensed), sans-serif',
                      fontWeight: 700,
                      fontSize: '1.25rem',
                      color: 'var(--ink-blue)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                      mb: 0.5,
                    }}
                  >
                    Couple {otherCoupleId.slice(0, 8)}...
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'var(--font-handwriting), cursive',
                      fontSize: '1.1rem',
                      color: 'var(--ink-blue-light)',
                    }}
                  >
                    {conv.last_message_at
                      ? `Last message ${new Date(conv.last_message_at).toLocaleDateString()}`
                      : 'No messages yet'}
                  </Typography>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
