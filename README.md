# KnowThyNeighbor

People are tired of AI slop. They crave real human interaction. KnowThyNeighbor is a simple tool that connects couples in your neighborhood for shared meals — dinners, lunches, and brunches.

## How It Works

1. **Create a profile** — Basic info: name, age, kids, ethnicity, and calendar availability
2. **Set your preference** — Hosting or visiting
3. **Search nearby couples** — Find matches within a 15-mile radius
4. **Chat** — Message through the in-app chat to plan your meal
5. **Meet** — Share a real meal with real people

## Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/) (App Router) deployed on [Vercel](https://vercel.com/)
- **Backend**: [Supabase](https://supabase.com/) (Auth, Postgres + PostGIS, Realtime, Row Level Security)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [OrbStack](https://orbstack.dev/) (or Docker Desktop) — required for local Supabase
- [Vercel CLI](https://vercel.com/docs/cli) (optional, for deployments)

### Local Development

```bash
# Clone the repo
git clone https://github.com/AmitKulkarni23/knowthyneighbor.git
cd knowthyneighbor

# Install frontend dependencies
cd frontend && bun install

# Set up environment variables
cp .env.example .env.local
# Fill in your Supabase project URL and anon key

# Start OrbStack (or Docker Desktop), then start local Supabase
supabase start

# Run the dev server (automatically connects to local Supabase via .env.development.local)
cd frontend && bun run dev
```

The dev server uses `.env.development.local` which points to the local Supabase stack. Production builds use `.env.local` which points to the hosted Supabase project. No file swapping needed.

### Local Supabase

```bash
# Start local Supabase (OrbStack/Docker must be running)
supabase start

# Reset database (re-runs all migrations + seed data)
supabase db reset

# Stop local Supabase
supabase stop

# Supabase Studio (browse/edit data visually)
# http://127.0.0.1:54323
```

Test users are seeded automatically (e.g. `pat@example.com` / `password123`). See `supabase/seed.sql` for all test data.

### Remote Supabase

```bash
# Apply migrations to remote
supabase db push

# Apply supabase/config.toml (auth URLs, email templates) to remote — db push does not include it
supabase config push
```

## Project Structure

```
knowthyneighbor/
├── docs/          # Design docs and architecture notes
├── frontend/      # Next.js application
├── supabase/      # Database migrations and config
├── CLAUDE.md      # AI assistant context
└── README.md
```

## License

TBD
