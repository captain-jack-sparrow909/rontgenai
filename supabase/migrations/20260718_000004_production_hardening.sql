-- Production hardening: durable job leasing, retries, request correlation,
-- idempotency, and artifact retention metadata.

alter table public.jobs
  add column if not exists request_id text,
  add column if not exists source_fingerprint text,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists max_attempts integer not null default 3,
  add column if not exists available_at timestamptz not null default now(),
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by text,
  add column if not exists last_heartbeat_at timestamptz;

alter table public.jobs
  drop constraint if exists jobs_attempt_count_check,
  add constraint jobs_attempt_count_check check (
    attempt_count >= 0 and max_attempts between 1 and 10
  );

create index if not exists jobs_worker_claim_idx
  on public.jobs (status, available_at, created_at)
  where status = 'queued';

drop index if exists public.jobs_owner_fingerprint_uidx;
create unique index if not exists jobs_product_fingerprint_uidx
  on public.jobs (product, type, source_fingerprint)
  where source_fingerprint is not null;

alter table public.artifacts
  add column if not exists expires_at timestamptz,
  add column if not exists deleted_at timestamptz;

create index if not exists artifacts_retention_idx
  on public.artifacts (expires_at)
  where expires_at is not null and deleted_at is null;

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text,
  payload_hash text not null,
  status text not null default 'processing'
    check (status in ('processing', 'processed', 'failed')),
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, event_id)
);

alter table public.webhook_events enable row level security;
create index if not exists webhook_events_received_idx
  on public.webhook_events (received_at desc);

create or replace function public.claim_next_job(
  p_worker_id text,
  p_stale_after_seconds integer default 900
)
returns setof public.jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed public.jobs%rowtype;
begin
  -- Recover work abandoned by a crashed worker. The attempt counter prevents
  -- poison jobs from being retried forever.
  update public.jobs
  set status = case when attempt_count >= max_attempts then 'failed' else 'queued' end,
      error = case
        when attempt_count >= max_attempts then coalesce(error, 'Worker lease expired')
        else error
      end,
      available_at = case
        when attempt_count >= max_attempts then available_at
        else now() + interval '15 seconds'
      end,
      locked_at = null,
      locked_by = null,
      last_heartbeat_at = null,
      updated_at = now()
  where status = 'running'
    and coalesce(last_heartbeat_at, locked_at, updated_at)
      < now() - make_interval(secs => greatest(30, p_stale_after_seconds));

  select * into claimed
  from public.jobs
  where status = 'queued'
    and available_at <= now()
    and attempt_count < max_attempts
    and locked_at is null
  order by available_at asc, created_at asc
  for update skip locked
  limit 1;

  if not found then
    return;
  end if;

  update public.jobs
  set locked_at = now(),
      locked_by = left(p_worker_id, 200),
      last_heartbeat_at = now(),
      attempt_count = attempt_count + 1,
      updated_at = now()
  where id = claimed.id
  returning * into claimed;

  return next claimed;
end;
$$;

create or replace function public.retry_job(
  p_job_id uuid,
  p_error text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed integer;
begin
  update public.jobs
  set status = case when attempt_count >= max_attempts then 'failed' else 'queued' end,
      error = left(coalesce(p_error, 'Job failed'), 4000),
      available_at = now() + make_interval(
        secs => least(300, greatest(5, (power(2, greatest(0, attempt_count - 1)) * 5)::integer))
      ),
      locked_at = null,
      locked_by = null,
      last_heartbeat_at = null,
      updated_at = now()
  where id = p_job_id;

  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

create or replace function public.complete_job_lease(p_job_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed integer;
begin
  update public.jobs
  set locked_at = null,
      locked_by = null,
      last_heartbeat_at = null,
      updated_at = now()
  where id = p_job_id;

  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

create or replace function public.get_usage_units(
  p_profile_id uuid,
  p_product text,
  p_period_start timestamptz
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(units), 0)::integer
  from public.usage_events
  where profile_id = p_profile_id
    and product = p_product
    and created_at >= p_period_start;
$$;

create or replace function public.record_usage_if_allowed(
  p_profile_id uuid,
  p_product text,
  p_units integer,
  p_limit integer,
  p_metadata jsonb default '{}'::jsonb
)
returns table(allowed boolean, used integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  period_start timestamptz := date_trunc('month', now() at time zone 'UTC') at time zone 'UTC';
  current_units integer;
begin
  if p_units <= 0 then
    raise exception 'usage units must be positive';
  end if;

  -- Serialize charges for one profile/product/month without locking unrelated
  -- customers or products.
  perform pg_advisory_xact_lock(
    hashtextextended(p_profile_id::text || ':' || p_product || ':' || period_start::text, 0)
  );

  select coalesce(sum(event.units), 0)::integer into current_units
  from public.usage_events event
  where event.profile_id = p_profile_id
    and event.product = p_product
    and event.created_at >= period_start;

  if p_limit >= 0 and current_units + p_units > p_limit then
    return query select false, current_units;
    return;
  end if;

  insert into public.usage_events(profile_id, product, units, metadata)
  values (p_profile_id, p_product, p_units, coalesce(p_metadata, '{}'::jsonb));

  return query select true, current_units + p_units;
end;
$$;

revoke all on function public.claim_next_job(text, integer) from public;
revoke all on function public.retry_job(uuid, text) from public;
revoke all on function public.complete_job_lease(uuid) from public;
revoke all on function public.get_usage_units(uuid, text, timestamptz) from public;
revoke all on function public.record_usage_if_allowed(uuid, text, integer, integer, jsonb) from public;
grant execute on function public.claim_next_job(text, integer) to service_role;
grant execute on function public.retry_job(uuid, text) to service_role;
grant execute on function public.complete_job_lease(uuid) to service_role;
grant execute on function public.get_usage_units(uuid, text, timestamptz) to service_role;
grant execute on function public.record_usage_if_allowed(uuid, text, integer, integer, jsonb) to service_role;
