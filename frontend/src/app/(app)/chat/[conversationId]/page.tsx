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
import { blockCouple } from '@/api/blocks';
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
  const [otherCoupleId, setOtherCoupleId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  useEffect(() => {
    if (!couple) return;
    getConversation(conversationId).then(({ conversation, error: convError }) => {
      if (convError) {
        showError(`Couldn't load this conversation. ${convError}`);
        return;
      }
      // RLS hides conversations you're not part of, so "missing" covers both cases
      if (!conversation) {
        setConversationMissing(true);
        return;
      }
      setOtherCoupleId(conversation.couple_1_id === couple.id ? conversation.couple_2_id : conversation.couple_1_id);
    });
  }, [conversationId, couple, showError]);

  const handleBlock = async () => {
    if (!couple || !otherCoupleId) return;
    if (!window.confirm('Block this couple? They will no longer be able to message you or send you requests.')) return;
    setBlockError(null);
    const result = await blockCouple(couple.id, otherCoupleId);
    if (result.error) {
      setBlockError(result.error);
      return;
    }
    setBlocked(true);
  };

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
      <Box sx={{ pb: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h2">Chat</Typography>
        {otherCoupleId && !blocked && (
          <Button variant="outlined" size="small" onClick={handleBlock}>
            Block
          </Button>
        )}
      </Box>
      {blockError && (
        <Alert severity="error" sx={{ mt: 1 }}>{blockError}</Alert>
      )}
      {!liveConnected && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          Live updates are disconnected. New messages may not appear until you refresh the page.
        </Alert>
      )}
      {blocked && (
        <Alert severity="info" sx={{ mt: 1 }}>You blocked this couple. They can no longer message you.</Alert>
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
          disabled={sending || blocked || !newMessage.trim()}
          sx={{ minWidth: 80 }}
        >
          Send
        </Button>
      </Box>

    </Box>
  );
}
