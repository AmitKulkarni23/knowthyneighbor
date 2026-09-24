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

- Node.js 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Vercel CLI](https://vercel.com/docs/cli) (optional, for deployments)

### Local Development

```bash
# Clone the repo
git clone https://github.com/AmitKulkarni23/knowthyneighbor.git
cd knowthyneighbor

# Install frontend dependencies
cd frontend && npm install

# Set up environment variables
cp .env.example .env.local
# Fill in your Supabase project URL and anon key

# Run the dev server
npm run dev
```

### Supabase Setup

```bash
# Start local Supabase
supabase start

# Apply migrations
supabase db push
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
