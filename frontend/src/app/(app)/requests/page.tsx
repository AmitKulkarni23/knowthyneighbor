'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import useCouple from '@/hooks/useCouple';
import useJoinRequests from '@/hooks/useJoinRequests';
import { respondToJoinRequest } from '@/api/joinRequests';
import type { JoinRequest } from '@/types/database';

export default function RequestsPage() {
  const { data: couple, loading: coupleLoading } = useCouple();
  const { received, sent, loading, error, refetch } = useJoinRequests(couple?.id ?? null);
  const [tab, setTab] = useState(0);
  const [responding, setResponding] = useState<string | null>(null);

  const handleRespond = async (id: string, status: 'accepted' | 'declined') => {
    setResponding(id);
    await respondToJoinRequest(id, status);
    setResponding(null);
    refetch();
  };

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

  const statusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'success' as const;
      case 'declined': return 'error' as const;
      default: return 'warning' as const;
    }
  };

  const renderRequest = (request: JoinRequest, type: 'received' | 'sent') => (
    <Card key={request.id} sx={{ mb: 2 }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h3">
            {request.meal_type.charAt(0).toUpperCase() + request.meal_type.slice(1)} request
          </Typography>
          <Chip
            label={request.status}
            size="small"
            color={statusColor(request.status)}
          />
        </Box>
        {request.message && (
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            "{request.message}"
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {new Date(request.created_at).toLocaleDateString()}
        </Typography>

        {type === 'received' && request.status === 'pending' && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              onClick={() => handleRespond(request.id, 'accepted')}
              disabled={responding === request.id}
            >
              Accept
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="error"
              onClick={() => handleRespond(request.id, 'declined')}
              disabled={responding === request.id}
            >
              Decline
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h1" sx={{ mb: 3 }}>
        Requests
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={`Received (${received.length})`} />
        <Tab label={`Sent (${sent.length})`} />
      </Tabs>

      {tab === 0 && (
        received.length === 0 ? (
          <Typography color="text.secondary">
            No requests received yet. When someone wants to share a meal with you, it'll show up here.
          </Typography>
        ) : (
          received.map((r) => renderRequest(r, 'received'))
        )
      )}

      {tab === 1 && (
        sent.length === 0 ? (
          <Typography color="text.secondary">
            You haven't sent any requests yet. Browse couples nearby and send one.
          </Typography>
        ) : (
          sent.map((r) => renderRequest(r, 'sent'))
        )
      )}
    </Box>
  );
}
