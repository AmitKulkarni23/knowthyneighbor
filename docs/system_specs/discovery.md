# Discovery & Search — System Spec

## Approach

Filter-based browsing within a fixed radius. No keyword or free-text search.

## PostGIS Extension

Enabled on the Supabase Postgres instance:

```sql
create extension if not exists postgis;
```

The `couples.location` column is of type `geography(POINT, 4326)` — stores lat/lng using the WGS 84 coordinate system. Distances are calculated in meters on the earth's surface.

## Search RPC Function

Exposed as a Supabase Database Function, called from the frontend via `supabase.rpc()`.

```sql
create or replace function search_nearby_couples(
  user_couple_id uuid,
  radius_miles int default 15
)
returns table (
  id uuid,
  couple_name text,
  bio text,
  hosting_preference hosting_preference,
  has_kids boolean,
  num_kids int,
  ethnicity text,
  distance_miles float
) as $$
declare
  user_location geography;
begin
  select c.location into user_location
  from couples c
  where c.id = user_couple_id;

  return query
  select
    c.id,
    c.couple_name,
    c.bio,
    c.hosting_preference,
    -- aggregate kid info from both partners
    (p1.has_kids or coalesce(p2.has_kids, false)) as has_kids,
    (p1.num_kids + coalesce(p2.num_kids, 0)) as num_kids,
    p1.ethnicity,
    round((ST_Distance(c.location, user_location) / 1609.34)::numeric, 1)::float as distance_miles
  from couples c
  join profiles p1 on c.partner_1_id = p1.id
  left join profiles p2 on c.partner_2_id = p2.id
  where c.id != user_couple_id
    and ST_DWithin(c.location, user_location, radius_miles * 1609.34)
  order by ST_Distance(c.location, user_location) asc;
end;
$$ language plpgsql stable security definer;
```

## Hardcoded Radius

- Fixed at **15 miles** for MVP
- The `radius_miles` parameter defaults to 15 and the frontend does not expose a UI to change it
- Can be made configurable later if needed for rural areas

## Frontend Filters (applied client-side or as additional RPC parameters)

| Filter | Column / Logic |
|--------|---------------|
| Has kids | `has_kids = true/false` |
| Ethnicity | `ethnicity in (...)` |
| Meal type | Join with `availability` table, filter by `time_slot` |
| Hosting preference | `hosting_preference in ('host', 'visit', 'both')` |
| Availability overlap | Compare requesting couple's `availability` with results |

## Display

- Results show: couple name, bio, distance (e.g., "2.3 miles away"), hosting preference, kid info
- **Never** display: coordinates, zip code, address, or exact location
- Profile photos shown if available

## Spatial Index

For performance on the PostGIS query:

```sql
create index idx_couples_location on couples using gist (location);
```
