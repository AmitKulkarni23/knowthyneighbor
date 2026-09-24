# Storage — System Spec

## Provider

Supabase Storage (built-in S3-compatible object storage)

## Bucket

One bucket: **`avatars`**

```sql
-- Created via Supabase dashboard or SQL
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);
```

- **Public read**: profile photos are visible in search results and chat without auth
- **Authenticated write**: only the owner can upload/replace their avatar

## File Structure

```
avatars/
  {user_id}/
    avatar.jpg    -- or .png, .webp
```

Each user gets a folder named by their `auth.uid()`. A single file per user, overwritten on update.

## Storage Policies

```sql
-- Anyone can view avatars (public bucket)
create policy "Public avatar access"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Users can upload their own avatar
create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own avatar
create policy "Users can update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own avatar
create policy "Users can delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
```

## Frontend Usage

Upload:
```javascript
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.jpg`, file, { upsert: true })
```

Get public URL:
```javascript
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${userId}/avatar.jpg`)
```

The public URL is stored in `profiles.avatar_url`.

## Limits

- Max file size: 5 MB (enforced via Supabase dashboard bucket settings)
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
