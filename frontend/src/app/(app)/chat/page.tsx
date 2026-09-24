'use client';

import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import useCouple from '@/hooks/useCouple';
import useConversations from '@/hooks/useConversations';

export default function ChatListPage() {
  const router = useRouter();
  const { data: couple, loading: coupleLoading } = useCouple();
  const { data: conversations, loading, error } = useConversations(couple?.id ?? null);

  if (coupleLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h1" sx={{ mb: 3 }}>
        Chats
      </Typography>

      {conversations.length === 0 ? (
        <Typography color="text.secondary">
          No conversations yet. Once a join request is accepted, you can start chatting here.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {conversations.map((conv) => {
            const otherCoupleId = conv.couple_1_id === couple?.id ? conv.couple_2_id : conv.couple_1_id;
            return (
              <Card key={conv.id}>
                <CardActionArea onClick={() => router.push(`/chat/${conv.id}`)}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="h3" sx={{ mb: 0.5 }}>
                      Couple {otherCoupleId.slice(0, 8)}...
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {conv.last_message_at
                        ? `Last message ${new Date(conv.last_message_at).toLocaleDateString()}`
                        : 'No messages yet'}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
