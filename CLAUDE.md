# KnowThyNeighbor

A neighborhood social dining app that connects couples for shared meals. In a world saturated with AI-generated content, KnowThyNeighbor brings back real human interaction — one dinner at a time.

## What It Does

Couples create a simple profile (name, age, kids, ethnicity, calendar availability), mark whether they want to host or visit, and search for similar couples within a 15-mile radius. Once matched, they chat through the in-app messaging interface to plan a lunch or dinner together.

## Design Principles

- **Human-first**: No AI slop. Real profiles, real conversations, real meals.
- **Simple onboarding**: Minimal profile info — just enough to find compatible dining partners.
- **Local focus**: 15-mile radius search keeps it neighborly.
- **Chat-to-meet flow**: Browse → Chat → Decide meal type → Meet in person.

## Tech Stack

- **Frontend**: Next.js (App Router) on Vercel
- **Backend**: Supabase (Auth, Postgres, Row Level Security, Realtime)
- **Styling**: TBD
- **Runtime**: Node.js / Bun

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

## Data Model (Planned)

Core tables: `profiles`, `couples`, `availability`, `matches`, `messages`, `meals`. Profiles hold individual info. Couples link two profiles. Availability stores calendar slots. Messages power the chat. Meals record planned/completed meetups.

## Key Behaviors

- Auth via Supabase (magic link or OAuth — TBD)
- Couples create a shared profile with basic info
- Search by radius uses PostGIS for geolocation queries
- Real-time chat via Supabase Realtime
- Host/visit preference filtering in search results
- Meal type selection (lunch, dinner, brunch) during chat

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

## Architecture

- **No API routes on Vercel.** Next.js is the frontend. All data access through the Supabase JS client with RLS policies for authorization.
- **Supabase Realtime** for chat messaging between matched couples.
- **PostGIS** extension on Supabase Postgres for geolocation-based neighbor search.

## Git Conventions

- Commit messages must be at most 2 sentences/phrases long.
- Commit and push to GitHub after each meaningful file or logical unit of work is complete.
