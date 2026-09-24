# Auth — System Spec

## Provider

Supabase Auth (built-in, no external auth provider needed)

## Method

- Magic link (email-based, passwordless)
- User enters email → receives a magic link → clicks to authenticate
- Session is managed by Supabase Auth via JWTs stored in browser cookies

## Signup Flow

1. User enters email on the signup page
2. Supabase Auth sends a magic link email
3. User clicks the link → redirected back to the app, now authenticated
4. `auth.users` row is created automatically by Supabase
5. App checks if a `profiles` row exists for `auth.uid()`
6. If no profile exists → redirect to profile creation form
7. After profile creation → redirect to couple creation or couple join (if they arrived via a partner invite)

## Partner Invite Flow

1. User A creates a couple profile and enters partner's email
2. App calls Supabase Auth `signInWithOtp({ email })` for the partner or generates an invite link
3. Partner receives email with a magic link that includes a redirect URL containing the `couple_id`
4. Partner clicks link → authenticated → profile created → auto-joined to the existing couple as `partner_2_id`

## Session Management

- Supabase handles session refresh automatically via `@supabase/ssr` or `@supabase/auth-helpers-nextjs`
- Sessions are stored as HTTP-only cookies (Next.js middleware refreshes them)
- `auth.uid()` is used in all RLS policies to identify the current user

## Tables Involved

- `auth.users` — managed by Supabase, not directly modified
- `profiles` — created by the app after first authentication
