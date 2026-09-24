# Join Requests — System Spec

## Purpose

Gate between discovery and messaging. A visiting couple sends a join request to a hosting couple. Only after acceptance can the two couples chat.

## Table

```sql
create type request_status as enum ('pending', 'accepted', 'declined');

create table join_requests (
  id uuid primary key default gen_random_uuid(),
  requester_couple_id uuid not null references couples(id) on delete cascade,
  host_couple_id uuid not null references couples(id) on delete cascade,
  meal_type meal_slot not null,
  message text,
  status request_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,

  constraint no_self_request check (requester_couple_id != host_couple_id)
);
```

## Flow

1. Visiting couple sends a join request from discovery results
2. Row inserted into `join_requests` with status `pending`
3. **Database Webhook** fires on INSERT → triggers a **Supabase Edge Function**
4. Edge Function sends an email to the host couple via **Resend**
5. Host couple sees the request in-app (and via email)
6. Host accepts → status updated to `accepted` → a `conversations` row is auto-created
7. Host declines → status updated to `declined` → requester sees the decline in-app

## Auto-create Conversation on Accept

A database trigger creates the conversation when a join request is accepted:

```sql
create or replace function on_join_request_accepted()
returns trigger as $$
begin
  if NEW.status = 'accepted' and OLD.status = 'pending' then
    insert into conversations (couple_1_id, couple_2_id)
    values (NEW.host_couple_id, NEW.requester_couple_id);

    NEW.responded_at = now();
  end if;

  if NEW.status = 'declined' and OLD.status = 'pending' then
    NEW.responded_at = now();
  end if;

  return NEW;
end;
$$ language plpgsql;

create trigger trigger_join_request_status_change
  before update on join_requests
  for each row
  execute function on_join_request_accepted();
```

## Email Notification — Edge Function + Resend

Triggered by a database webhook on `INSERT` into `join_requests`.

```typescript
// supabase/functions/notify-join-request/index.ts (pseudocode)

import { Resend } from 'resend';

// 1. Receive the webhook payload (the new join_request row)
// 2. Look up host couple's partner emails from profiles
// 3. Look up requester couple's display name
// 4. Send email via Resend:
//    Subject: "The Smiths want to join you for dinner!"
//    Body: requester's message, link to app to accept/decline
//    Template: managed in Resend dashboard or inline React Email
```

Email templates for join request notifications are managed via Resend (React Email or Resend dashboard templates). Auth-related emails (magic link, etc.) use Supabase's built-in email templates configured in `supabase/config.toml`.

## Row Level Security

```sql
alter table join_requests enable row level security;

-- Users can view requests where their couple is involved
create policy "View own join requests"
  on join_requests for select using (
    requester_couple_id in (
      select id from couples where partner_1_id = auth.uid() or partner_2_id = auth.uid()
    )
    or host_couple_id in (
      select id from couples where partner_1_id = auth.uid() or partner_2_id = auth.uid()
    )
  );

-- Only visiting couples can create requests
create policy "Visitors can send join requests"
  on join_requests for insert with check (
    requester_couple_id in (
      select id from couples where partner_1_id = auth.uid() or partner_2_id = auth.uid()
    )
  );

-- Only host couples can update (accept/decline)
create policy "Hosts can respond to requests"
  on join_requests for update using (
    host_couple_id in (
      select id from couples where partner_1_id = auth.uid() or partner_2_id = auth.uid()
    )
  );
```
