# Experiment

A polished ML experiment tracking and analytics platform.

## Setup

### 1. Install dependencies
```
npm install
```

### 2. Configure environment variables
Copy `.env.example` to `.env` and fill in your Supabase credentials:
```
cp .env.example .env
```

Required variables:
- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — your Supabase anonymous key

### 3. Set up Supabase
1. Create a Supabase project at supabase.com
2. Run the SQL migration in `supabase/migrations/001_initial_schema.sql` in the Supabase SQL editor
3. Enable email authentication in Authentication > Providers

### 4. Run the app
```
npm run dev
```

### 5. Build for production
```
npm run build
```

## Tech Stack
- React 18 + Vite + TypeScript
- Tailwind CSS
- Supabase (Auth + PostgreSQL)
- React Query
- Recharts
- Lucide React icons
