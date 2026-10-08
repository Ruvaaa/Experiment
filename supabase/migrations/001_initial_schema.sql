-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Datasets
create table datasets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  task_type text,
  num_samples integer,
  num_classes integer,
  source text,
  notes text,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table datasets enable row level security;
create policy "Users own datasets" on datasets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Models
create table models (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  model_type text,
  framework text,
  description text,
  notes text,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table models enable row level security;
create policy "Users own models" on models for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Experiments
create table experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  model_id uuid references models(id) on delete set null,
  dataset_id uuid references datasets(id) on delete set null,
  status text default 'active',
  is_favorite boolean default false,
  tags text[] default '{}',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table experiments enable row level security;
create policy "Users own experiments" on experiments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Experiment Runs
create table experiment_runs (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid references experiments(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  run_number integer not null,
  accuracy numeric(6,4),
  precision_score numeric(6,4),
  recall numeric(6,4),
  f1_score numeric(6,4),
  loss numeric(10,6),
  epochs integer,
  learning_rate numeric(10,8),
  batch_size integer,
  training_time_seconds numeric,
  notes text,
  created_at timestamptz default now()
);
alter table experiment_runs enable row level security;
create policy "Users own runs" on experiment_runs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Notes
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  content text,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table notes enable row level security;
create policy "Users own notes" on notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Milestones
create table user_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  milestone_type text not null,
  achieved_at timestamptz default now()
);
alter table user_milestones enable row level security;
create policy "Users own milestones" on user_milestones for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
