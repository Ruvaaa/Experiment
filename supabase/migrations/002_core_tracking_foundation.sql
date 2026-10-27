create extension if not exists pgcrypto;

-- Projects are the single workspace/project grouping used throughout the product.
-- There is intentionally no separate "workspace" entity.
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table projects enable row level security;
drop policy if exists "Users own projects" on projects;
create policy "Users own projects" on projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table experiments add column if not exists project_id uuid references projects(id) on delete set null;
alter table experiments add column if not exists task_type text;
alter table experiments add column if not exists git_repository text;
alter table experiments add column if not exists git_commit text;
alter table experiments add column if not exists random_seed bigint;
alter table experiments add column if not exists framework text;
alter table experiments add column if not exists hyperparameters jsonb not null default '{}'::jsonb;
alter table experiments add column if not exists custom_metrics jsonb not null default '{}'::jsonb;
alter table experiments add column if not exists source text not null default 'manual';

alter table experiment_runs add column if not exists status text not null default 'completed';
alter table experiment_runs add column if not exists started_at timestamptz;
alter table experiment_runs add column if not exists completed_at timestamptz;
alter table experiment_runs add column if not exists hyperparameters jsonb not null default '{}'::jsonb;
alter table experiment_runs add column if not exists custom_metrics jsonb not null default '{}'::jsonb;
alter table experiment_runs add column if not exists model_config jsonb not null default '{}'::jsonb;
alter table experiment_runs add column if not exists environment jsonb not null default '{}'::jsonb;
alter table experiment_runs add column if not exists random_seed bigint;
alter table experiment_runs add column if not exists error_message text;
alter table experiment_runs add column if not exists source text not null default 'manual';
alter table experiment_runs add column if not exists client_event_id text;
alter table experiment_runs add column if not exists updated_at timestamptz default now();

alter table experiment_runs drop constraint if exists experiment_runs_status_check;
alter table experiment_runs add constraint experiment_runs_status_check
  check (status in ('queued', 'running', 'completed', 'failed', 'cancelled'));
create unique index if not exists experiment_runs_client_event_unique
  on experiment_runs(experiment_id, client_event_id) where client_event_id is not null;

create table if not exists run_metric_history (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references experiment_runs(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  step bigint not null,
  epoch bigint,
  metrics jsonb not null check (jsonb_typeof(metrics) = 'object'),
  client_event_id text,
  recorded_at timestamptz default now(),
  unique(run_id, client_event_id)
);
alter table run_metric_history enable row level security;
drop policy if exists "Users own run metrics" on run_metric_history;
create policy "Users own run metrics" on run_metric_history for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists experiment_artifacts (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid references experiments(id) on delete cascade not null,
  run_id uuid references experiment_runs(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name text not null,
  kind text not null default 'other',
  uri text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  unique(experiment_id, uri)
);
alter table experiment_artifacts enable row level security;
drop policy if exists "Users own artifacts" on experiment_artifacts;
create policy "Users own artifacts" on experiment_artifacts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The plaintext key is returned only once by create_sdk_api_key and is never stored.
create table if not exists sdk_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references projects(id) on delete cascade not null,
  name text not null check (char_length(trim(name)) between 1 and 100),
  key_hash text not null unique,
  key_prefix text not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now(),
  unique(project_id, name)
);
alter table sdk_api_keys enable row level security;
drop policy if exists "Users view own SDK keys" on sdk_api_keys;
drop policy if exists "Users manage own SDK keys" on sdk_api_keys;
create policy "Users view own SDK keys" on sdk_api_keys for select using (auth.uid() = user_id);
create policy "Users manage own SDK keys" on sdk_api_keys for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function create_sdk_api_key(p_project_id uuid, p_name text)
returns table(id uuid, plaintext_key text, key_prefix text)
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_secret text;
  v_hash text;
  v_id uuid := gen_random_uuid();
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;
  if not exists (select 1 from projects where projects.id = p_project_id and projects.user_id = v_user) then
    raise exception 'Project not found';
  end if;
  if p_name is null or char_length(trim(p_name)) = 0 then
    raise exception 'Key name required';
  end if;

  v_secret := 'exp_' || encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_secret, 'sha256'), 'hex');
  insert into sdk_api_keys(id, user_id, project_id, name, key_hash, key_prefix)
  values (v_id, v_user, p_project_id, trim(p_name), v_hash, left(v_secret, 12));
  id := v_id; plaintext_key := v_secret; key_prefix := left(v_secret, 12);
  return next;
end;
$$;

create or replace function revoke_sdk_api_key(p_key_id uuid)
returns void language sql security definer set search_path = public, pg_temp
as $$
  update sdk_api_keys set revoked_at = now()
  where id = p_key_id and user_id = auth.uid();
$$;

create or replace function delete_user()
returns void language sql security definer set search_path = public, auth
as $$
  delete from auth.users where id = auth.uid();
$$;

-- Prevent cross-user references and server-created records from escaping ownership.
create or replace function enforce_core_tracking_owner()
returns trigger language plpgsql security invoker set search_path = public
as $$
begin
  if new.project_id is not null and not exists (
    select 1 from projects where id = new.project_id and user_id = new.user_id
  ) then
    raise exception 'project owner does not match experiment owner';
  end if;
  if new.model_id is not null and not exists (
    select 1 from models where id = new.model_id and user_id = new.user_id
  ) then
    raise exception 'model owner does not match experiment owner';
  end if;
  if new.dataset_id is not null and not exists (
    select 1 from datasets where id = new.dataset_id and user_id = new.user_id
  ) then
    raise exception 'dataset owner does not match experiment owner';
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_core_tracking_owner_trigger on experiments;
create trigger enforce_core_tracking_owner_trigger before insert or update on experiments
for each row execute function enforce_core_tracking_owner();

create or replace function enforce_run_owner()
returns trigger language plpgsql security invoker set search_path = public
as $$
begin
  if not exists (
    select 1 from experiments e where e.id = new.experiment_id and e.user_id = new.user_id
  ) then
    raise exception 'run owner does not match experiment owner';
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_run_owner_trigger on experiment_runs;
create trigger enforce_run_owner_trigger before insert or update on experiment_runs
for each row execute function enforce_run_owner();

create or replace function enforce_metric_owner()
returns trigger language plpgsql security invoker set search_path = public
as $$
begin
  if not exists (
    select 1 from experiment_runs r where r.id = new.run_id and r.user_id = new.user_id
  ) then
    raise exception 'metric owner does not match run owner';
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_metric_owner_trigger on run_metric_history;
create trigger enforce_metric_owner_trigger before insert or update on run_metric_history
for each row execute function enforce_metric_owner();

create index if not exists experiments_project_idx on experiments(project_id);
create index if not exists runs_status_idx on experiment_runs(status);
create index if not exists runs_experiment_created_idx on experiment_runs(experiment_id, created_at);
create index if not exists metric_history_run_step_idx on run_metric_history(run_id, step);

-- Minute-bucket rate limiting is enforced by ingestion requests on the server.
create table if not exists sdk_api_key_usage (
  key_id uuid references sdk_api_keys(id) on delete cascade not null,
  bucket_start timestamptz not null,
  request_count integer not null default 0,
  primary key (key_id, bucket_start)
);
alter table sdk_api_key_usage enable row level security;

create or replace function record_sdk_ingest_request(p_key_id uuid, p_limit integer default 120)
returns boolean language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_bucket timestamptz := date_trunc('minute', now());
  v_count integer;
begin
  insert into sdk_api_key_usage(key_id, bucket_start, request_count)
  values (p_key_id, v_bucket, 1)
  on conflict (key_id, bucket_start)
  do update set request_count = sdk_api_key_usage.request_count + 1
  returning request_count into v_count;
  return v_count <= p_limit;
end;
$$;
