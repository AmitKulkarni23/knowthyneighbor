# Discovery & Search — System Spec

## Approach

Filter-based browsing. No keyword or free-text search. No radius restriction for MVP — all couples are discoverable. PostGIS infrastructure is in place for future radius filtering.

## PostGIS Extension

Enabled on the Supabase Postgres instance:

```sql
create extension if not exists postgis;
```

The `couples.location` column is of type `geography(POINT, 4326)` — stores lat/lng using the WGS 84 coordinate system. Distances are calculated in meters on the earth's surface.

## Search RPC Function

Exposed as a Supabase Database Function, called from the frontend via `supabase.rpc()`.

```sql
create or replace function discover_couples(
  user_couple_id uuid
)
returns table (
  id uuid,
  couple_name text,
  bio text,
  hosting_preference hosting_preference,
  has_kids boolean,
  num_kids int,
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
    round((ST_Distance(c.location, user_location) / 1609.34)::numeric, 1)::float as distance_miles
  from couples c
  join profiles p1 on c.partner_1_id = p1.id
  left join profiles p2 on c.partner_2_id = p2.id
  where c.id != user_couple_id
  order by ST_Distance(c.location, user_location) asc;
end;
$$ language plpgsql stable security definer;
```

No `ST_DWithin` filter for MVP — returns all couples sorted by distance. When radius filtering is added later, a single WHERE clause re-enables it:

```sql
-- Future: add this to the WHERE clause
and ST_DWithin(c.location, user_location, 15 * 1609.34)
```

## Frontend Filters (applied client-side or as additional RPC parameters)

| Filter | Column / Logic |
|--------|---------------|
| Has kids | `has_kids = true/false` |
| Meal type | Join with `availability` table, filter by `time_slot` |
| Hosting preference | `hosting_preference in ('host', 'visit', 'both')` |
| Availability overlap | Compare requesting couple's `availability` with results |

Note: Ethnicity filter is not in the UI for MVP. The column exists in the database for future use.

## Display

- Results show: couple name, bio, distance (e.g., "2.3 miles away"), hosting preference, kid info
- **Never** display: coordinates, zip code, address, or exact location
- Profile photos shown if available

## Spatial Index

For performance on the PostGIS distance calculation:

```sql
create index idx_couples_location on couples using gist (location);
```
