'use client';

import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { useAppContext } from '@/components/AppProvider';
import useConversations from '@/hooks/useConversations';
import { paperCardSx, pinRedSx, pinGreenSx, pinBlueSx } from '@/styles/board';

const rotations = [1.2, -0.8, 1.5, -1.1, 0.6, -1.8];
const pins = [pinRedSx, pinGreenSx, pinBlueSx];

export default function ChatListPage() {
  const router = useRouter();
  const { couple } = useAppContext();
  const { data: conversations, loading, error } = useConversations(couple?.id ?? null);

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
          mb: 3,
        }}
      >
        Chats
      </Typography>

      {conversations.length === 0 ? (
        <Card sx={{ ...paperCardSx as object, p: '32px 28px', position: 'relative', transform: 'rotate(-0.5deg)' }}>
          <Box sx={pinRedSx} />
          <Typography
            sx={{
              fontFamily: 'var(--font-handwriting), cursive',
              fontSize: '1.65rem',
              color: 'var(--ink-blue)',
              lineHeight: 1.6,
            }}
          >
            No conversations yet. Once a join request is accepted, you can start chatting here.
          </Typography>
        </Card>
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
                      fontSize: '1.4rem',
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
                      fontSize: '1.25rem',
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
