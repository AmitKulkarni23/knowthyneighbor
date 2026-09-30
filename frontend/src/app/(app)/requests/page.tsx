'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import { useAppContext } from '@/components/AppProvider';
import useJoinRequests from '@/hooks/useJoinRequests';
import { respondToJoinRequest } from '@/api/joinRequests';
import { getConversationByCouples } from '@/api/conversations';
import type { JoinRequestWithCouple } from '@/api/joinRequests';
import { paperCardSx, pinRedSx, pinGreenSx, pinBlueSx, ctaButtonSx } from '@/styles/board';
import EmptyStateCard from '@/components/EmptyStateCard';

const rotations = [1.2, -0.8, 1.5, -1.1, 0.6, -1.8, 0.9, -0.5];

export default function RequestsPage() {
  const router = useRouter();
  const { couple } = useAppContext();
  const { received, sent, loading, error, refetch } = useJoinRequests(couple?.id ?? null);
  const [tab, setTab] = useState(0);
  const [responding, setResponding] = useState<string | null>(null);
  const [respondError, setRespondError] = useState<string | null>(null);
  const [conversationMap, setConversationMap] = useState<Record<string, string>>({});

  const loadConversations = useCallback(async () => {
    if (!couple) return;
    const accepted = [...received, ...sent].filter(r => r.status === 'accepted');
    const map: Record<string, string> = {};
    await Promise.all(
      accepted.map(async (r) => {
        const { conversation } = await getConversationByCouples(couple.id, r.other_couple_id);
        if (conversation) map[r.request_id] = conversation.id;
      })
    );
    setConversationMap(map);
  }, [couple, received, sent]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const handleRespond = async (id: string, status: 'accepted' | 'declined') => {
    setResponding(id);
    setRespondError(null);
    const result = await respondToJoinRequest(id, status);
    setResponding(null);
    if (result.error) {
      setRespondError(result.error);
      return;
    }
    refetch();
  };

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const displayError = respondError;

  const statusChipSx = (status: string) => {
    switch (status) {
      case 'accepted': return { bgcolor: 'var(--thumbtack-green)', color: 'var(--paper)' };
      case 'declined': return { bgcolor: 'var(--pushpin-red)', color: 'var(--paper)' };
      default: return { bgcolor: 'var(--index-yellow)', color: 'var(--ink-blue)' };
    }
  };

  const renderRequest = (request: JoinRequestWithCouple, type: 'received' | 'sent', index: number) => {
    const deg = rotations[index % rotations.length];
    const pin = index % 3 === 0 ? pinRedSx : index % 3 === 1 ? pinGreenSx : pinBlueSx;

    return (
      <Card
        key={request.request_id}
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
              fontSize: '1.4rem',
              color: 'var(--ink-blue)',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
            }}
          >
            {request.meal_type.charAt(0).toUpperCase() + request.meal_type.slice(1)} request{' '}
            {type === 'received' ? 'from' : 'to'}{' '}
            <Box
              component="a"
              href={`/couple/${request.other_couple_id}`}
              sx={{
                color: 'var(--pushpin-red)',
                textDecoration: 'underline',
                cursor: 'pointer',
              }}
              onClick={(e) => { e.preventDefault(); router.push(`/couple/${request.other_couple_id}`); }}
            >
              {request.other_couple_name ?? 'A couple nearby'}
            </Box>
          </Typography>
          <Chip
            label={request.status.toUpperCase()}
            size="small"
            sx={statusChipSx(request.status)}
          />
        </Box>
        {request.message && (
          <Typography
            sx={{
              fontFamily: 'var(--font-handwriting), cursive',
              fontSize: '1.35rem',
              color: 'var(--ink-blue)',
              lineHeight: 1.5,
              mb: 1,
              fontStyle: 'italic',
            }}
          >
            &ldquo;{request.message}&rdquo;
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
          {new Date(request.created_at).toLocaleDateString()}
        </Typography>

        {request.status === 'accepted' && conversationMap[request.request_id] && (
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              onClick={() => router.push(`/chat/${conversationMap[request.request_id]}`)}
              sx={{
                ...ctaButtonSx as object,
                py: '10px',
                px: '28px',
                fontSize: '0.95rem',
              }}
            >
              Chat
            </Button>
          </Box>
        )}

        {type === 'received' && request.status === 'pending' && (
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              onClick={() => handleRespond(request.request_id, 'accepted')}
              disabled={responding === request.request_id}
              sx={{
                ...ctaButtonSx as object,
                py: '10px',
                px: '28px',
                fontSize: '0.95rem',
              }}
            >
              Accept
            </Button>
            <Button
              onClick={() => handleRespond(request.request_id, 'declined')}
              disabled={responding === request.request_id}
              sx={{
                ...ctaButtonSx as object,
                py: '10px',
                px: '28px',
                fontSize: '0.95rem',
                bgcolor: 'transparent',
                color: 'var(--pushpin-red)',
                border: '2px solid var(--pushpin-red)',
                '&:hover': {
                  bgcolor: 'rgba(204, 68, 51, 0.06)',
                  transform: 'scale(1.03)',
                },
              }}
            >
              Decline
            </Button>
          </Box>
        )}
      </Card>
    );
  };

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
        Requests
      </Typography>

      {displayError && (
        <Alert severity="error" onClose={() => setRespondError(null)} sx={{ mb: 2 }}>{displayError}</Alert>
      )}

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          mb: 3,
          '& .MuiTabs-indicator': {
            bgcolor: 'var(--pushpin-red)',
            height: 3,
          },
        }}
      >
        <Tab label={`Received (${received.length})`} />
        <Tab label={`Sent (${sent.length})`} />
      </Tabs>

      {tab === 0 && (
        received.length === 0 ? (
          <EmptyStateCard
            message="No requests received yet. When someone wants to share a meal with you, it'll show up here."
            pin="blue"
            rotation={-0.6}
          />
        ) : (
          received.map((r, i) => renderRequest(r, 'received', i))
        )
      )}

      {tab === 1 && (
        sent.length === 0 ? (
          <EmptyStateCard
            message="You haven't sent any requests yet. Browse couples nearby and send one."
            pin="green"
            rotation={0.8}
          />
        ) : (
          sent.map((r, i) => renderRequest(r, 'sent', i))
        )
      )}
    </Box>
  );
}
