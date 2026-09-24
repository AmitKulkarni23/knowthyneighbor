# Profiles & Couples — System Spec

## Tables

### `profiles`

Individual user profile, one per authenticated user.

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  age int not null check (age >= 18),
  ethnicity text not null,
  has_kids boolean not null default false,
  num_kids int not null default 0,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

Age and location (zip code / lat-lng) on `profiles` and `couples` respectively are enforced as immutable at the database level.

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

## Row Level Security

```sql
alter table profiles enable row level security;
alter table couples enable row level security;
alter table availability enable row level security;

-- Profiles: users can read and update only their own
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- Couples: any authenticated user can read (needed for search)
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
