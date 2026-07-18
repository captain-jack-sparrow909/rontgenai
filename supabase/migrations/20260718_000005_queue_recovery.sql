-- Recover every abandoned lease state, including a worker that exits after
-- claiming but before changing queued -> running.

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
  stale_before timestamptz := now() - make_interval(
    secs => greatest(30, p_stale_after_seconds)
  );
begin
  if nullif(trim(p_worker_id), '') is null then
    raise exception 'worker id is required';
  end if;

  -- Claimed but not started: release the lease without consuming another
  -- attempt until a worker successfully claims it again.
  update public.jobs
  set locked_at = null,
      locked_by = null,
      last_heartbeat_at = null,
      updated_at = now()
  where status = 'queued'
    and locked_at is not null
    and coalesce(last_heartbeat_at, locked_at) < stale_before;

  -- Started work or a processor-recorded failure whose worker disappeared
  -- before it could finalize retry state.
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
  where status in ('running', 'failed')
    and locked_at is not null
    and coalesce(last_heartbeat_at, locked_at, updated_at) < stale_before;

  select * into claimed
  from public.jobs
  where status = 'queued'
    and available_at <= now()
    and attempt_count < max_attempts
    and locked_at is null
  order by available_at asc, created_at asc
  for update skip locked
  limit 1;

  if not found then return; end if;

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

revoke all on function public.claim_next_job(text, integer) from public;
grant execute on function public.claim_next_job(text, integer) to service_role;
