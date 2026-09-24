# Messaging — System Spec

## Purpose

Simple text chat between two couples, available only after a join request is accepted. Chat is a coordination tool for planning meals, not a general messaging platform.

## Tables

### `conversations`

One row per couple-pair. Created automatically when a join request is accepted (see join_requests.md).

```sql
create table conversations (
  id uuid primary key default gen_random_uuid(),
  couple_1_id uuid not null references couples(id) on delete cascade,
  couple_2_id uuid not null references couples(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,

  constraint unique_couple_pair unique (couple_1_id, couple_2_id),
  constraint no_self_conversation check (couple_1_id != couple_2_id)
);
```

### `messages`

Individual chat messages within a conversation.

```sql
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_profile_id uuid not null references profiles(id),
  body text not null check (char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

create index idx_messages_conversation on messages (conversation_id, created_at);
```

## Real-time Delivery — Supabase Realtime

When a user opens a chat screen, the frontend:

1. **Loads history** — `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at`
2. **Subscribes** — listens for new inserts via Supabase Realtime

```javascript
supabase
  .channel(`chat:${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, (payload) => {
    // append payload.new to the message list
  })
  .subscribe()
```

Realtime is a **live push only** — it does not queue or replay missed messages. History fetch on screen open handles that.

## Updating `last_message_at`

A trigger keeps `conversations.last_message_at` current for sorting conversation lists:

```sql
create or replace function update_conversation_last_message()
returns trigger as $$
begin
  update conversations
  set last_message_at = NEW.created_at
  where id = NEW.conversation_id;
  return NEW;
end;
$$ language plpgsql;

create trigger trigger_update_last_message
  after insert on messages
  for each row
  execute function update_conversation_last_message();
```

## Message Retention

- Messages are retained for **30 days** after the associated meal is completed or cancelled
- A **pg_cron** job runs daily to purge expired messages:

```sql
-- Scheduled via Supabase pg_cron extension
select cron.schedule(
  'purge-old-messages',
  '0 3 * * *',  -- daily at 3 AM UTC
  $$
    delete from messages
    where conversation_id in (
      select c.id from conversations c
      join meals m on m.conversation_id = c.id
      where m.status in ('completed', 'cancelled')
        and m.updated_at < now() - interval '30 days'
    )
  $$
);
```

## Row Level Security

```sql
alter table conversations enable row level security;
alter table messages enable row level security;

-- Conversations: only visible to involved couples
create policy "View own conversations"
  on conversations for select using (
    couple_1_id in (
      select id from couples where partner_1_id = auth.uid() or partner_2_id = auth.uid()
    )
    or couple_2_id in (
      select id from couples where partner_1_id = auth.uid() or partner_2_id = auth.uid()
    )
  );

-- Messages: read only if in the conversation
create policy "View messages in own conversations"
  on messages for select using (
    conversation_id in (
      select id from conversations
      where couple_1_id in (
        select id from couples where partner_1_id = auth.uid() or partner_2_id = auth.uid()
      )
      or couple_2_id in (
        select id from couples where partner_1_id = auth.uid() or partner_2_id = auth.uid()
      )
    )
  );

-- Messages: insert only into own conversations
create policy "Send messages in own conversations"
  on messages for insert with check (
    sender_profile_id = auth.uid()
    and conversation_id in (
      select id from conversations
      where couple_1_id in (
        select id from couples where partner_1_id = auth.uid() or partner_2_id = auth.uid()
      )
      or couple_2_id in (
        select id from couples where partner_1_id = auth.uid() or partner_2_id = auth.uid()
      )
    )
  );
```
