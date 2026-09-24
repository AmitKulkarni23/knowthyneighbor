# Meals — System Spec

## Purpose

Track proposed and confirmed meal meetups between two couples. A meal is proposed from within a chat conversation.

## Table

```sql
create type meal_status as enum ('proposed', 'confirmed', 'completed', 'cancelled');

create table meals (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  host_couple_id uuid not null references couples(id),
  guest_couple_id uuid not null references couples(id),
  meal_type meal_slot not null,
  scheduled_at timestamptz not null,
  status meal_status not null default 'proposed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint no_self_hosting check (host_couple_id != guest_couple_id)
);

create index idx_meals_conversation on meals (conversation_id);
create index idx_meals_status on meals (status);
```

## Status Flow

```
proposed → confirmed → completed
    ↓          ↓
 cancelled  cancelled
```

- **proposed**: one couple suggests a meal with date/time and meal type
- **confirmed**: the other couple accepts
- **completed**: either couple marks the meal as done (after it happens)
- **cancelled**: either couple can cancel at any stage before completion

## Updated Timestamp Trigger

```sql
create or replace function update_meal_timestamp()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger trigger_meal_updated
  before update on meals
  for each row
  execute function update_meal_timestamp();
```

## Row Level Security

```sql
alter table meals enable row level security;

-- Only couples in the conversation can view/manage meals
create policy "View meals in own conversations"
  on meals for select using (
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

create policy "Create meals in own conversations"
  on meals for insert with check (
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

create policy "Update meals in own conversations"
  on meals for update using (
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
```
