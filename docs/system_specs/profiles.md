# Profiles & Couples — System Spec

## Couple Creation Flow

1. Person A signs up (Supabase Auth magic link)
2. Person A fills out a single form: their own details, partner's details, and couple-level info
3. App creates: Person A's `profiles` row, Person B's `profiles` row (with `id = null`, pending claim), and the `couples` row
4. Person A gets a shareable invite link containing the `couple_id` and an `invite_code`
5. Person A copies the link and shares it with their spouse
6. Spouse clicks the link → signs up via magic link → their `auth.uid()` is linked to the pre-created profile → joined as `partner_2_id`

## Tables

### `profiles`

Individual user profile. Created by the couple creator for both partners. Partner 2's row starts with `id = null` and is claimed when they join.

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  age int not null check (age >= 18),
  ethnicity text,
  has_kids boolean not null default false,
  num_kids int not null default 0,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Note: `ethnicity` is nullable and not collected in the UI for MVP. Column exists for future use.

### `pending_partners`

Holds partner 2's info before they sign up. Created by the couple creator, consumed when partner joins.

```sql
create table pending_partners (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  full_name text not null,
  age int not null check (age >= 18),
  has_kids boolean not null default false,
  num_kids int not null default 0,
  claimed_by uuid references auth.users(id),
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);
```

When partner 2 joins via invite link:
1. Their `auth.users` row is created (magic link signup)
2. A `profiles` row is created using the data from `pending_partners`
3. `pending_partners.claimed_by` is set to their `auth.uid()`
4. `couples.partner_2_id` is set to their `auth.uid()`

### `couples`

The social unit. Links two profiles. One row per couple.

```sql
create extension if not exists postgis;

create type hosting_preference as enum ('host', 'visit', 'both');

create table couples (
  id uuid primary key default gen_random_uuid(),
  partner_1_id uuid not null references profiles(id) on delete cascade,
  partner_2_id uuid references profiles(id) on delete set null,
  couple_name text,
  bio text,
  zip_code text not null,
  location geography(point, 4326) not null,
  hosting_preference hosting_preference not null default 'both',
  invite_code text not null default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint unique_invite_code unique (invite_code)
);
```

### `availability`

Calendar slots for a couple.

```sql
create type meal_slot as enum ('brunch', 'lunch', 'dinner');

create table availability (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  day_of_week int check (day_of_week between 0 and 6),
  specific_date date,
  time_slot meal_slot not null,
  recurring boolean not null default true,
  created_at timestamptz not null default now(),

  check (day_of_week is not null or specific_date is not null)
);
```

## Immutability Rules

### Age — trigger on `profiles`

```sql
create or replace function prevent_age_update()
returns trigger as $$
begin
  if OLD.age is distinct from NEW.age then
    raise exception 'Age cannot be modified after profile creation';
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger enforce_age_immutability
  before update on profiles
  for each row
  execute function prevent_age_update();
```

### Zip code — updatable

Zip code and location on `couples` **can** be updated (people move). No immutability trigger needed.

## Geocoding

- User enters a zip code at couple profile creation
- The frontend calls a geocoding API (Google Maps Geocoding or Mapbox) to convert the zip code to lat/lng
- Only the centroid lat/lng is stored in `couples.location`
- The zip code string is stored in `couples.zip_code` for display purposes only

## Partner Join Flow (Detail)

The invite link format: `https://knowthyneighbor.app/join/{couple_id}/{invite_code}`

```sql
-- Called after partner 2 authenticates via the invite link
create or replace function claim_partner_invite(
  p_couple_id uuid,
  p_invite_code text
)
returns void as $$
declare
  v_pending pending_partners%rowtype;
begin
  -- Verify invite code matches
  if not exists (
    select 1 from couples
    where id = p_couple_id
      and invite_code = p_invite_code
      and partner_2_id is null
  ) then
    raise exception 'Invalid or already-used invite';
  end if;

  -- Get pending partner info
  select * into v_pending
  from pending_partners
  where couple_id = p_couple_id and claimed_by is null;

  -- Create profile for partner 2
  insert into profiles (id, full_name, age, has_kids, num_kids)
  values (auth.uid(), v_pending.full_name, v_pending.age, v_pending.has_kids, v_pending.num_kids);

  -- Link to couple
  update couples set partner_2_id = auth.uid() where id = p_couple_id;

  -- Mark pending as claimed
  update pending_partners
  set claimed_by = auth.uid(), claimed_at = now()
  where id = v_pending.id;
end;
$$ language plpgsql security definer;
```

## Row Level Security

```sql
alter table profiles enable row level security;
alter table couples enable row level security;
alter table availability enable row level security;
alter table pending_partners enable row level security;

-- Profiles: users can read and update only their own
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- Couples: any authenticated user can read (needed for discovery)
create policy "Authenticated users can view couples"
  on couples for select using (auth.role() = 'authenticated');

-- Couples: only members can update
create policy "Couple members can update"
  on couples for update using (
    auth.uid() = partner_1_id or auth.uid() = partner_2_id
  );

-- Couples: any authenticated user can create
create policy "Authenticated users can create couples"
  on couples for insert with check (auth.uid() = partner_1_id);

-- Pending partners: only the couple creator can insert, only the joining partner can read
create policy "Creator can insert pending partner"
  on pending_partners for insert with check (
    couple_id in (
      select id from couples where partner_1_id = auth.uid()
    )
  );

create policy "Invitee can view pending partner"
  on pending_partners for select using (
    couple_id in (
      select id from couples
      where invite_code is not null and partner_2_id is null
    )
  );

-- Availability: any authenticated user can read (needed for search filters)
create policy "Authenticated users can view availability"
  on availability for select using (auth.role() = 'authenticated');

-- Availability: only couple members can insert/update/delete
create policy "Couple members can manage availability"
  on availability for all using (
    couple_id in (
      select id from couples
      where partner_1_id = auth.uid() or partner_2_id = auth.uid()
    )
  );
```
