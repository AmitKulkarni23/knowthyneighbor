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
3. The requester's browser calls the **`notify-new-request` Edge Function** with the new request's id
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

`supabase/functions/notify-new-request` is invoked by the requester's browser right after the insert, with `{ join_request_id }` only. It:

1. Verifies the caller's JWT and that the caller belongs to the request's requester couple
2. Reads the request row itself (the email never uses caller-supplied content)
3. Only proceeds if the request is `pending`, less than 10 minutes old, and not yet notified
4. Atomically sets `join_requests.notified_at`, so each request emails at most once
5. Emails the host partners via Resend

Do **not** add a Database Webhook for this function; it expects a user JWT and a request id.

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
