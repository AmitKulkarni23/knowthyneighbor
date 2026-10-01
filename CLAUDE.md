# KnowThyNeighbor

A neighborhood social dining app that connects couples for shared meals. In a world saturated with AI-generated content, KnowThyNeighbor brings back real human interaction — one dinner at a time.

## What It Does

One person creates a couple profile (names, ages, kids, zip code, calendar availability), marks whether they want to host or visit, and shares an invite link with their spouse. Couples browse other couples nearby, send join requests, and once accepted, chat through the in-app messaging interface to plan a meal together.

## Design Principles

- **Human-first**: No AI slop. Real profiles, real conversations, real meals.
- **Simple onboarding**: Minimal profile info — just enough to find compatible dining partners.
- **Local focus**: Zip-code-based geolocation keeps it neighborly.
- **Request-to-meet flow**: Browse → Send join request → Chat → Plan meal → Meet in person.

## Tech Stack

- **Frontend**: Next.js (App Router) on Vercel
- **Backend**: Supabase (Auth, Postgres + PostGIS, Row Level Security, Realtime, Edge Functions)
- **Email**: Resend (transactional emails for join request notifications)
- **UI Components**: MUI (Material UI) everywhere — all pages use MUI components with `sx` props, no CSS Modules
- **Runtime**: Bun

## Folder Structure

```
knowthyneighbor/
├── docs/                     # Design docs, architecture notes
├── frontend/                 # Next.js app (App Router)
│   ├── src/
│   │   ├── app/              # Next.js App Router pages, layouts
│   │   ├── components/       # Reusable React components
│   │   ├── config/           # Supabase client, environment config
│   │   ├── types/            # TypeScript type definitions
│   │   └── lib/              # Utility functions, helpers
│   └── public/               # Static assets
├── supabase/                 # Supabase CLI config, migrations
│   ├── config.toml           # Project config for CLI
│   └── migrations/           # SQL migrations
├── .gitignore
├── CLAUDE.md
└── README.md
```

## Data Model

Core tables: `profiles`, `couples`, `pending_partners`, `availability`, `join_requests`, `conversations`, `messages`, `couple_blocks`. Profiles hold individual info. Couples link two profiles. Pending partners hold partner 2's info until they join. Join requests gate access to chat. Messages power real-time chat via Supabase Realtime.

## Key Behaviors

- Auth via Supabase magic link (passwordless)
- One person creates the couple profile for both partners; spouse joins via shareable invite link
- No street address collected — only zip code, geocoded to lat/lng centroid
- Discovery shows all couples sorted by distance (no radius cap for MVP)
- Join request required before chat opens (email notification to host via Resend)
- Real-time chat via Supabase Realtime

## Commands

### Frontend

```bash
# Install dependencies
cd frontend && bun install

# Run locally
cd frontend && bun run dev

# Build for production
cd frontend && bun run build

# Lint
cd frontend && bun run lint
```

### Local Supabase

OrbStack (or Docker Desktop) must be running before starting the local Supabase stack.

```bash
# Start local Supabase stack (runs migrations + seed automatically)
supabase start

# Reset database (re-run all migrations + seed data)
supabase db reset

# Stop local Supabase stack
supabase stop

# Supabase Studio (browse/edit data): http://127.0.0.1:54323
```

The dev server (`bun run dev`) automatically connects to the local Supabase stack via `frontend/.env.development.local`. Production builds use `frontend/.env.local` which points to the hosted Supabase project.

Test users are seeded via `supabase/seed.sql` (e.g. `pat@example.com` / `password123`).

### Remote Supabase

```bash
# Link to your Supabase project (one-time setup)
supabase link --project-ref <your-project-ref>

# Push schema to remote Supabase database (migrations, RLS, functions)
# NOT automatic — must run manually after each migration or `supabase db reset`
supabase db push

# Push supabase/config.toml (auth URLs, email templates, etc.) to remote
# NOT automatic — db push does not include config. Must run manually after changing config.toml.
# [remotes.production] in config.toml overrides site_url/redirect URLs for the hosted project.
# Shows a diff and asks for confirmation before applying.
supabase config push

# Deploy edge functions to remote Supabase
# NOT automatic — must run manually after changing functions in supabase/functions/
supabase functions deploy <function-name>

# Deploy all edge functions at once
supabase functions deploy

# Create a new migration file
supabase migration new <migration-name>
```

### Vercel

```bash
# Deploy preview
vercel

# Deploy to production
vercel --prod

# Pull environment variables
vercel env pull .env.local
```

## Design System

The app uses the **"Neighborhood Board"** visual identity documented in `DESIGN.md`. Every surface looks like a cork bulletin board with pinned paper cards.

- **Tokens**: CSS custom properties in `frontend/src/app/globals.css` — colors, shadows, spacing, motion
- **Shared sx objects**: `frontend/src/styles/board.ts` — reusable MUI sx style objects (`boardBgSx`, `paperCardSx`, `pinRedSx`, `pinGreenSx`, `pinBlueSx`, `ctaButtonSx`)
- **MUI theme**: `frontend/src/config/theme.ts` — overrides Material UI to match the board world (zero radius, paper shadows, handwriting fonts)
- **ThemeRegistry**: Wraps the entire app in root `layout.tsx` so all routes (landing, auth, app) share the MUI theme
- **Fonts**: Permanent Marker (display), Caveat (handwriting), Barlow Condensed (labels/buttons), Source Sans 3 (body) — loaded in `frontend/src/app/layout.tsx`
- **Rules**: No pure white/black, no border-radius on cards/buttons, no dark mode. See DESIGN.md for the full system.

When building new screens, import shared sx objects from `board.ts` for cork backgrounds, paper cards, and pushpins. Use MUI components (`Box`, `Card`, `Typography`, `Button`, `Chip`) with `sx` props — no CSS Modules.

## Architecture

- **No API routes on Vercel.** Next.js is the frontend. All data access through the Supabase JS client with RLS policies for authorization.
- **Supabase Realtime** for chat messaging between matched couples.
- **PostGIS** extension on Supabase Postgres for geolocation-based neighbor search.
- **Supabase Edge Functions** for server-side actions (e.g., sending join request emails via Resend).

## Security Model

- Other couples' data is read only through `SECURITY DEFINER` RPCs (`discover_couples`, `get_couple_profile`, `get_couple_availability`, `browse_couples_public`), never by loosening table RLS. The `couples` row holds the secret `invite_code`.
- Writes are limited by column-level grants as well as RLS: clients may only set the columns granted in the "Security: RLS, column grants" section of `supabase/migrations/20260930000000_initial.sql`. New writable columns need an explicit `GRANT`.
- Every `SECURITY DEFINER` function sets `search_path = ''` and fully qualifies names; `anon` may execute only `browse_couples_public`.
- Functions created in later migrations get `anon` EXECUTE from Supabase's default privileges: always `REVOKE EXECUTE ... FROM PUBLIC, anon` after `CREATE FUNCTION`.
- Extensions live in the `extensions` schema, never `public` (PostGIS in `public` exposes `spatial_ref_sys` without RLS).
- After changing migrations, run `supabase db reset` and `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/scripts/security_regression.sql`.

## Error Handling

- Log failures with `logger` (`frontend/src/lib/logger.ts`): `logger.error` reports to Sentry with a stack trace (pass a thrown error as `context.error` to keep its original stack). Expected rule rejections (`P0001`, `23505`, `23514`) are kept as breadcrumbs.
- Never show raw Supabase/Postgres errors in the UI; API functions return `toUserMessage(error)` from `frontend/src/lib/errors.ts`.
- Show failures inline with MUI `Alert` where the user acted, or with `useToast()` (`components/ToastProvider.tsx`) for background loads. Render crashes are caught by `app/error.tsx` and `app/(app)/error.tsx`.

## Infrastructure as Code

All infrastructure is managed as code via the Supabase CLI — no Terraform, no ClickOps.

- **Database schema**: SQL migration files in `supabase/migrations/`. Create with `supabase migration new <name>`, deploy with `supabase db push`.
- **Project config**: `supabase/config.toml` controls auth settings, storage buckets, API config, and email templates. Deploy with `supabase config push`; production-only values (site_url, redirect URLs) live under `[remotes.production]`.
- **Edge Functions**: TypeScript files in `supabase/functions/`, deployed with `supabase functions deploy`.
- **Environments**: Local dev via `supabase start`, remote via `supabase link --project-ref <ref>`.
- **Never** configure database schema, RLS policies, triggers, or functions through the Supabase dashboard. All changes go through migration files so they are version-controlled and reproducible.

## Browser Automation

**Do not run any browser automation (playwright-cli or claude-in-chrome) unless the user explicitly asks for it.** Verify changes with type-check, lint and the SQL regression script instead, and let the user check the UI.

When the user does ask, use the `/playwright-cli` skill (screenshots, clicking, form filling). Never use claude-in-chrome MCP tools.

## Git Conventions

- Commit messages must be at most 2 sentences/phrases long.
- Commit and push to GitHub after each meaningful file or logical unit of work is complete.
