-- A dedicated maintenance row used by the authenticated Render keepalive route.
-- Its presence is the state: one call inserts it and the next call deletes it.

create table if not exists public.keepalive_pulses (
  id text primary key check (id = 'render-cron'),
  created_at timestamptz not null default now()
);

comment on table public.keepalive_pulses is
  'Single maintenance row toggled by the authenticated API keepalive endpoint';

alter table public.keepalive_pulses enable row level security;
revoke all on table public.keepalive_pulses from public, anon, authenticated;

create or replace function public.toggle_keepalive_pulse()
returns table(action text, performed_at timestamptz)
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
  pulse_time timestamptz := clock_timestamp();
begin
  -- Serialize calls so overlapping cron requests still alternate correctly.
  perform pg_advisory_xact_lock(
    hashtextextended('rontgenai:render-cron-keepalive', 0)
  );

  if exists (
    select 1 from public.keepalive_pulses where id = 'render-cron'
  ) then
    delete from public.keepalive_pulses where id = 'render-cron';
    return query select 'deleted'::text, pulse_time;
  else
    insert into public.keepalive_pulses (id, created_at)
    values ('render-cron', pulse_time);
    return query select 'inserted'::text, pulse_time;
  end if;
end;
$$;

revoke all on function public.toggle_keepalive_pulse() from public, anon, authenticated;
grant execute on function public.toggle_keepalive_pulse() to service_role;
