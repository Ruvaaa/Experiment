-- Keep OAuth and password profiles consistent.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_full_name text;
  v_avatar_url text;
begin
  v_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'user_name'
  );
  v_avatar_url := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture'
  );

  insert into public.profiles (id, username, full_name, avatar_url, updated_at)
  values (
    new.id,
    new.raw_user_meta_data->>'user_name',
    v_full_name,
    v_avatar_url,
    now()
  )
  on conflict (id) do update set
    username = coalesce(profiles.username, excluded.username),
    full_name = coalesce(profiles.full_name, excluded.full_name),
    avatar_url = coalesce(profiles.avatar_url, excluded.avatar_url),
    updated_at = now();
  return new;
end;
$$;
