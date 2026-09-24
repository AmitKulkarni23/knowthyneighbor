'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import useCouple from '@/hooks/useCouple';
import useDiscovery from '@/hooks/useDiscovery';
import { sendJoinRequest } from '@/api/joinRequests';
import type { DiscoveryCouple, MealSlot } from '@/types/database';

export default function DiscoverPage() {
  const { data: couple, loading: coupleLoading } = useCouple();
  const { data: couples, loading: discoveryLoading, error } = useDiscovery(couple?.id ?? null);
  const [selectedCouple, setSelectedCouple] = useState<DiscoveryCouple | null>(null);
  const [mealType, setMealType] = useState<MealSlot>('dinner');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  const handleSendRequest = async () => {
    if (!couple || !selectedCouple) return;
    setSending(true);
    setSendError(null);

    const result = await sendJoinRequest({
      requester_couple_id: couple.id,
      host_couple_id: selectedCouple.id,
      meal_type: mealType,
      message: message || undefined,
    });

    if (result.error) {
      setSendError(result.error);
      setSending(false);
      return;
    }

    setSendSuccess(true);
    setSending(false);
    setTimeout(() => {
      setSelectedCouple(null);
      setSendSuccess(false);
      setMessage('');
    }, 1500);
  };

  const loading = coupleLoading || discoveryLoading;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const hostingLabel = (pref: string) => {
    switch (pref) {
      case 'host': return 'Hosts';
      case 'visit': return 'Visitors';
      case 'both': return 'Host or visit';
      default: return pref;
    }
  };

  return (
    <Box>
      <Typography variant="h1" sx={{ mb: 1 }}>
        Find your dinner neighbors
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {couples.length === 0
          ? "No couples nearby yet. Check back soon!"
          : `${couples.length} couple${couples.length === 1 ? '' : 's'} near you`}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {couples.map((c) => (
          <Card key={c.id}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Typography variant="h3">
                  {c.couple_name ?? 'A couple nearby'}
                </Typography>
                <Chip
                  label={hostingLabel(c.hosting_preference)}
                  size="small"
                  color={c.hosting_preference === 'host' ? 'primary' : 'default'}
                />
              </Box>
              {c.bio && (
                <Typography color="text.secondary" sx={{ mb: 1 }}>
                  {c.bio}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {c.distance_miles.toFixed(1)} miles away
                {c.has_kids ? ` · ${c.num_kids} kid${c.num_kids === 1 ? '' : 's'}` : ' · No kids'}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setSelectedCouple(c)}
              >
                Send request
              </Button>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Dialog
        open={Boolean(selectedCouple)}
        onClose={() => { setSelectedCouple(null); setSendError(null); setSendSuccess(false); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Send a request to {selectedCouple?.couple_name ?? 'this couple'}
        </DialogTitle>
        <DialogContent>
          {sendSuccess ? (
            <Alert severity="success">Request sent!</Alert>
          ) : (
            <>
              {sendError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {sendError}
                </Alert>
              )}
              <FormControl fullWidth sx={{ mt: 1, mb: 2 }}>
                <InputLabel>Meal type</InputLabel>
                <Select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value as MealSlot)}
                  label="Meal type"
                >
                  <MenuItem value="brunch">Brunch</MenuItem>
                  <MenuItem value="lunch">Lunch</MenuItem>
                  <MenuItem value="dinner">Dinner</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Add a note (optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                fullWidth
                multiline
                rows={3}
                placeholder="Hey, we'd love to meet you for dinner! We make a great pasta."
              />
            </>
          )}
        </DialogContent>
        {!sendSuccess && (
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setSelectedCouple(null)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSendRequest}
              disabled={sending}
            >
              {sending ? 'Sending...' : 'Send request'}
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </Box>
  );
}
