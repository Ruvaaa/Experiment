-- Hardening guarantees for SDK ingestion.

alter table experiment_runs
  add column if not exists run_number integer;

alter table experiment_runs
  drop constraint if exists experiment_runs_run_number_positive;
alter table experiment_runs
  add constraint experiment_runs_run_number_positive check (run_number > 0);

create unique index if not exists experiment_runs_experiment_number_unique
  on experiment_runs(experiment_id, run_number);

alter table run_metric_history
  add column if not exists event_timestamp timestamptz;

alter table run_metric_history
  add constraint run_metric_history_step_nonnegative check (step >= 0);

alter table run_metric_history
  drop constraint if exists run_metric_history_epoch_nonnegative;
alter table run_metric_history
  add constraint run_metric_history_epoch_nonnegative check (epoch is null or epoch >= 0);

alter table sdk_api_keys
  add constraint sdk_api_key_hash_format check (key_hash ~ '^[0-9a-f]{64}$');

create or replace function enforce_run_lifecycle()
returns trigger language plpgsql security invoker set search_path = public
as $$
begin
  if old.status in ('completed', 'failed', 'cancelled') and new.status not in ('completed', 'failed', 'cancelled') then
    raise exception 'terminal run status cannot be changed to %', new.status;
  end if;
  if new.status in ('completed', 'failed', 'cancelled') and new.completed_at is null then
    new.completed_at := coalesce(old.completed_at, now());
  end if;
  if new.status not in ('completed', 'failed', 'cancelled') and new.completed_at is not null then
    new.completed_at := null;
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_run_lifecycle_trigger on experiment_runs;
create trigger enforce_run_lifecycle_trigger before update on experiment_runs
for each row execute function enforce_run_lifecycle();

create or replace function assign_run_number()
returns trigger language plpgsql security invoker set search_path = public
as $$
begin
  if new.run_number is null then
    perform pg_advisory_xact_lock(hashtextextended(new.experiment_id::text, 0));
    select coalesce(max(run_number), 0) + 1 into new.run_number
    from experiment_runs where experiment_id = new.experiment_id;
  end if;
  return new;
end;
$$;
drop trigger if exists assign_run_number_trigger on experiment_runs;
create trigger assign_run_number_trigger before insert on experiment_runs
for each row execute function assign_run_number();

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
  return v_count <= greatest(p_limit, 1);
end;
$$;

-- Restrict RPC privileges explicitly.
revoke execute on function create_sdk_api_key(uuid, text) from public;
revoke execute on function revoke_sdk_api_key(uuid) from public;
grant execute on function create_sdk_api_key(uuid, text) to authenticated;
grant execute on function revoke_sdk_api_key(uuid) to authenticated;

-- The internal limiter is callable only by the Edge Function service role.
revoke all on function record_sdk_ingest_request(uuid, integer) from public;
revoke all on function record_sdk_ingest_request(uuid, integer) from anon;
revoke all on function record_sdk_ingest_request(uuid, integer) from authenticated;
grant execute on function record_sdk_ingest_request(uuid, integer) to service_role;

alter default privileges revoke execute on functions from public;
