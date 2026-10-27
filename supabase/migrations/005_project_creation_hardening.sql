-- Guarantee project creation through the browser client after OAuth login.
create extension if not exists pgcrypto with schema extensions;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table projects add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table projects add column if not exists name text;
alter table projects add column if not exists description text;
alter table projects add column if not exists created_at timestamptz default now();
alter table projects add column if not exists updated_at timestamptz default now();
alter table projects alter column user_id set default auth.uid();
alter table projects alter column user_id set not null;
alter table projects alter column name set not null;
alter table projects enable row level security;

drop policy if exists "Users own projects" on projects;
drop policy if exists "Users can manage their projects" on projects;
create policy "Users own projects" on projects
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on projects to authenticated;

-- SDK key RPCs must stay executable by authenticated browser sessions, while key
-- records remain accessible only through the owning-user RLS policy.
drop function if exists create_sdk_api_key(uuid, text);
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
  if p_project_id is null then
    raise exception 'Project required';
  end if;
  if not exists (
    select 1 from projects where projects.id = p_project_id and projects.user_id = v_user
  ) then
    raise exception 'Project not found or you do not own it';
  end if;
  if p_name is null or char_length(trim(p_name)) = 0 then
    raise exception 'Key name required';
  end if;

  v_secret := 'exp_' || encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_secret, 'sha256'), 'hex');
  insert into sdk_api_keys(id, user_id, project_id, name, key_hash, key_prefix)
  values (v_id, v_user, p_project_id, trim(p_name), v_hash, left(v_secret, 12));
  id := v_id;
  plaintext_key := v_secret;
  key_prefix := left(v_secret, 12);
  return next;
end;
$$;

revoke execute on function create_sdk_api_key(uuid, text) from public;
revoke execute on function create_sdk_api_key(uuid, text) from anon;
grant execute on function create_sdk_api_key(uuid, text) to authenticated;
grant execute on function revoke_sdk_api_key(uuid) to authenticated;
grant select on sdk_api_keys to authenticated;

notify pgrst, 'reload schema';
