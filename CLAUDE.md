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

Core tables: `profiles`, `couples`, `pending_partners`, `availability`, `join_requests`, `conversations`, `messages`, `meals`. Profiles hold individual info. Couples link two profiles. Pending partners hold partner 2's info until they join. Join requests gate access to chat. Messages power real-time chat via Supabase Realtime. Meals track planned/completed meetups.

## Key Behaviors

- Auth via Supabase magic link (passwordless)
- One person creates the couple profile for both partners; spouse joins via shareable invite link
- No street address collected — only zip code, geocoded to lat/lng centroid
- Discovery shows all couples sorted by distance (no radius cap for MVP)
- Join request required before chat opens (email notification to host via Resend)
- Real-time chat via Supabase Realtime
- Messages retained 30 days after meal completion, then purged via pg_cron

## Commands

### Frontend

```bash
# Install dependencies
cd frontend && npm install

# Run locally
cd frontend && npm run dev

# Build for production
cd frontend && npm run build

# Lint
cd frontend && npm run lint
```

### Supabase

```bash
# Link to your Supabase project (one-time setup)
supabase link --project-ref <your-project-ref>

# Push schema to remote Supabase database
supabase db push

# Create a new migration file
supabase migration new <migration-name>

# Start local Supabase stack
supabase start

# Stop local Supabase stack
supabase stop
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
- **Supabase Edge Functions** for webhook-triggered actions (e.g., sending join request emails via Resend).

## Infrastructure as Code

All infrastructure is managed as code via the Supabase CLI — no Terraform, no ClickOps.

- **Database schema**: SQL migration files in `supabase/migrations/`. Create with `supabase migration new <name>`, deploy with `supabase db push`.
- **Project config**: `supabase/config.toml` controls auth settings, storage buckets, API config, and email templates.
- **Edge Functions**: TypeScript files in `supabase/functions/`, deployed with `supabase functions deploy`.
- **Environments**: Local dev via `supabase start`, remote via `supabase link --project-ref <ref>`.
- **Never** configure database schema, RLS policies, triggers, or functions through the Supabase dashboard. All changes go through migration files so they are version-controlled and reproducible.

## Git Conventions

- Commit messages must be at most 2 sentences/phrases long.
- Commit and push to GitHub after each meaningful file or logical unit of work is complete.
