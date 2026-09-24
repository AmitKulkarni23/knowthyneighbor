'use client';

import { useState, useRef, useEffect, use } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import useAuth from '@/hooks/useAuth';
import useMessages from '@/hooks/useMessages';
import { sendMessage } from '@/api/conversations';
import { createMeal } from '@/api/meals';
import type { MealSlot } from '@/types/database';

type ChatPageProps = {
  params: Promise<{ conversationId: string }>;
};

export default function ChatPage({ params }: ChatPageProps) {
  const { conversationId } = use(params);
  const { user } = useAuth();
  const { data: messages, loading, error } = useMessages(conversationId);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [mealDialogOpen, setMealDialogOpen] = useState(false);
  const [mealType, setMealType] = useState<MealSlot>('dinner');
  const [mealDate, setMealDate] = useState('');
  const [mealError, setMealError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    const body = newMessage;
    setNewMessage('');

    await sendMessage(conversationId, body);
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleProposeMeal = async () => {
    if (!mealDate) return;

    setMealError(null);
    // For MVP, we set the current user's couple as host
    const result = await createMeal({
      conversation_id: conversationId,
      host_couple_id: '',  // Will be filled by RLS/trigger
      guest_couple_id: '', // Will be filled by RLS/trigger
      meal_type: mealType,
      scheduled_at: new Date(mealDate).toISOString(),
    });

    if (result.error) {
      setMealError(result.error);
      return;
    }

    setMealDialogOpen(false);
    setMealDate('');
  };

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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 128px)' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h2">Chat</Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={() => setMealDialogOpen(true)}
        >
          Plan a meal
        </Button>
      </Box>

      {/* Messages */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', py: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {messages.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No messages yet. Say hi!
          </Typography>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_profile_id === user?.id;
            return (
              <Box
                key={msg.id}
                sx={{
                  display: 'flex',
                  justifyContent: isMine ? 'flex-end' : 'flex-start',
                }}
              >
                <Box
                  sx={{
                    maxWidth: '70%',
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    bgcolor: isMine ? 'primary.main' : 'grey.100',
                    color: isMine ? 'primary.contrastText' : 'text.primary',
                  }}
                >
                  <Typography variant="body1">{msg.body}</Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mt: 0.5,
                      opacity: 0.7,
                      color: isMine ? 'primary.contrastText' : 'text.secondary',
                    }}
                  >
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Box>
              </Box>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Box sx={{ display: 'flex', gap: 1, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <TextField
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          fullWidth
          placeholder="Type a message..."
          size="small"
          multiline
          maxRows={3}
        />
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={sending || !newMessage.trim()}
          sx={{ minWidth: 80 }}
        >
          Send
        </Button>
      </Box>

      {/* Meal proposal dialog */}
      <Dialog
        open={mealDialogOpen}
        onClose={() => { setMealDialogOpen(false); setMealError(null); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Plan a meal</DialogTitle>
        <DialogContent>
          {mealError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {mealError}
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
            label="Date and time"
            type="datetime-local"
            value={mealDate}
            onChange={(e) => setMealDate(e.target.value)}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setMealDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleProposeMeal}
            disabled={!mealDate}
          >
            Propose meal
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
