'use client';

import { useState, useRef, useEffect, use } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useAppContext } from '@/components/AppProvider';
import useMessages from '@/hooks/useMessages';
import { sendMessage, getConversation } from '@/api/conversations';
import { useToast } from '@/components/ToastProvider';

type ChatPageProps = {
  params: Promise<{ conversationId: string }>;
};

export default function ChatPage({ params }: ChatPageProps) {
  const { conversationId } = use(params);
  const { user, couple } = useAppContext();
  const { data: messages, loading, error, liveConnected, addOptimistic } = useMessages(conversationId);
  const { showError } = useToast();
  const [conversationMissing, setConversationMissing] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!couple) return;
    getConversation(conversationId).then(({ conversation, error: convError }) => {
      if (convError) {
        showError(`Couldn't load this conversation. ${convError}`);
        return;
      }
      if (!conversation) {
        setConversationMissing(true);
      }
    });
  }, [conversationId, couple, showError]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    setSendError(null);
    const body = newMessage;
    setNewMessage('');

    const result = await sendMessage(conversationId, body);
    if (result.error) {
      setSendError(result.error);
      setNewMessage(body);
    } else if (result.message) {
      addOptimistic(result.message);
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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

  if (conversationMissing) {
    return <Alert severity="warning">This conversation doesn&apos;t exist or you don&apos;t have access to it.</Alert>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 128px)' }}>
      {/* Header */}
      <Box sx={{ pb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h2">Chat</Typography>
      </Box>
      {!liveConnected && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          Live updates are disconnected. New messages may not appear until you refresh the page.
        </Alert>
      )}

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
      {sendError && (
        <Alert severity="error" sx={{ mb: 1 }}>{sendError}</Alert>
      )}
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

    </Box>
  );
}
