# Experiment

A polished, production-quality ML experiment tracking and analytics platform. Record experiments, track runs, compare models, and analyze performance over time — all in one clean dashboard.

![Stack](https://img.shields.io/badge/React-18-blue?style=flat-square) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?style=flat-square) ![Supabase](https://img.shields.io/badge/Supabase-auth%20%2B%20db-green?style=flat-square) ![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=flat-square)

---

## Features

- **Experiments** — create, edit, duplicate, archive, and favorite experiments
- **Runs** — track multiple runs per experiment with full metrics and hyperparameters
- **Compare** — side-by-side comparison of experiments/runs with best-value highlighting
- **Analytics** — charts for accuracy over time, performance by model, training time, and more
- **Datasets & Models** — manage reusable dataset and model records
- **Notes** — lightweight workspace notes with tagging and search
- **Authentication** — Supabase email/password auth with persistent sessions and RLS
- **Dashboard** — greeting, summary stats, recent activity, quick-add modal, day streak

---

## Quick Start

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier is fine)

### 1. Install dependencies

```bash
npm install
```

### 2. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for provisioning (~1 minute)
3. Go to **Project Settings → API**
4. Copy your **Project URL** and **anon public** key

### 3. Configure environment variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
# Windows PowerShell
Copy-Item .env.example .env
```

Then open `.env` and fill in your real credentials:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ Without real values here the app will show **"NetworkError when attempting to fetch resource"** — that's Supabase rejecting the placeholder URL, not a bug in the code.

### 4. Run the database migration

1. In your Supabase dashboard, open the **SQL Editor**
2. Create a **New Query**
3. Paste the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Click **Run**

This creates all tables (profiles, experiments, experiment_runs, datasets, models, notes, milestones), enables Row Level Security on each, and adds a trigger that auto-creates a profile when a new user signs up.

### 5. Enable email authentication

In your Supabase dashboard:

1. Go to **Authentication → Providers**
2. Confirm **Email** is enabled (it is by default)
3. Optionally disable **Confirm email** during development so you can sign up and log in immediately without clicking a confirmation link

> To disable email confirmation: **Authentication → Email Templates → Confirm signup** → toggle off "Enable email confirmations" in **Authentication → Settings**.

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and create your account.

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL (from Project Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key (from Project Settings → API) |

These are the only two variables required. Never commit your `.env` file — it is listed in `.gitignore`.

---

## Project Structure

```
src/
  components/
    auth/         # ProtectedRoute
    layout/       # Sidebar, PageLayout
    ui/           # Button, Card, Badge, Input, Modal, EmptyState, etc.
  contexts/
    AuthContext   # Supabase session, profile, sign in/out
    ToastContext  # Global toast notifications
  lib/
    supabase.ts   # Supabase client
    utils.ts      # Formatting, date helpers
    hooks/        # React Query hooks for every entity
  pages/
    auth/         # LoginPage, SignUpPage, ResetPasswordPage
    DashboardPage, ExperimentsPage, ExperimentDetailPage
    ComparePage, AnalyticsPage, DatasetsPage
    ModelsPage, NotesPage, SettingsPage
  types/
    index.ts      # All domain types (no `any`)
supabase/
  migrations/
    001_initial_schema.sql   # Full schema + RLS policies + trigger
```

---

## Tech Stack

| Tool | Purpose |
|---|---|
| React 18 + Vite | UI framework and build tool |
| TypeScript (strict) | Type safety |
| Tailwind CSS | Styling and design system |
| Supabase | Authentication and PostgreSQL database |
| @tanstack/react-query | Data fetching, caching, and mutations |
| React Router v6 | Client-side routing |
| Recharts | Analytics charts |
| React Hook Form + Zod | Form handling and validation |
| Lucide React | Icon library |
| date-fns | Date formatting |

---

## Database Schema

All tables have Row Level Security enabled. Users can only access their own rows.

```
profiles          — extends auth.users (full_name, username, avatar_url)
experiments       — core experiment records (links to models + datasets)
experiment_runs   — individual runs with metrics + hyperparameters
datasets          — reusable dataset records
models            — reusable model records
notes             — workspace notes
user_milestones   — milestone tracking (first experiment, etc.)
```

A PostgreSQL trigger (`on_auth_user_created`) automatically creates a `profiles` row when a new user signs up, populated from the signup form's `full_name` metadata.

---

## Building for Production

```bash
npm run build
```

Output lands in `dist/`. The bundle is ~1.1 MB unminified — if you want to reduce it, add route-based code splitting with `React.lazy()`.

---

## Troubleshooting

**"NetworkError when attempting to fetch resource" on signup/login**
→ Your `.env` file is missing or has placeholder values. Follow step 3 above.

**Sign up succeeds but I can't log in / data doesn't appear**
→ Email confirmation is enabled. Check your inbox for a confirmation email, or disable email confirmations in Supabase Authentication settings for development.

**Tables don't exist / queries fail**
→ The SQL migration hasn't been run yet. Follow step 4 above.

**Profile not created after signup**
→ The `handle_new_user` trigger requires the migration to have been run. Re-run the SQL migration, then create a new account.

---

## Python SDK

The complete beginner's guide to installation, every public argument, metrics, framework integrations, errors, retries, security, and troubleshooting is in [USAGE.md](USAGE.md).
