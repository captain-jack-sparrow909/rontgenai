-- Organization workspaces share one atomic monthly usage counter while still
-- retaining the initiating profile for auditability.

create or replace function public.get_usage_units(
  p_profile_id uuid,
  p_organization_id uuid,
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
  where product = p_product
    and created_at >= p_period_start
    and (
      (p_organization_id is not null and organization_id = p_organization_id)
      or
      (p_organization_id is null and profile_id = p_profile_id and organization_id is null)
    );
$$;

create or replace function public.record_usage_if_allowed(
  p_profile_id uuid,
  p_organization_id uuid,
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
  owner_key text := coalesce(p_organization_id::text, p_profile_id::text);
begin
  if p_units <= 0 then raise exception 'usage units must be positive'; end if;
  if owner_key is null then raise exception 'usage owner is required'; end if;

  perform pg_advisory_xact_lock(
    hashtextextended(owner_key || ':' || p_product || ':' || period_start::text, 0)
  );

  select coalesce(sum(event.units), 0)::integer into current_units
  from public.usage_events event
  where event.product = p_product
    and event.created_at >= period_start
    and (
      (p_organization_id is not null and event.organization_id = p_organization_id)
      or
      (p_organization_id is null and event.profile_id = p_profile_id and event.organization_id is null)
    );

  if p_limit >= 0 and current_units + p_units > p_limit then
    return query select false, current_units;
    return;
  end if;

  insert into public.usage_events(
    profile_id, organization_id, product, units, metadata
  ) values (
    p_profile_id, p_organization_id, p_product, p_units, coalesce(p_metadata, '{}'::jsonb)
  );

  return query select true, current_units + p_units;
end;
$$;

revoke all on function public.get_usage_units(uuid, uuid, text, timestamptz) from public;
revoke all on function public.record_usage_if_allowed(uuid, uuid, text, integer, integer, jsonb) from public;
grant execute on function public.get_usage_units(uuid, uuid, text, timestamptz) to service_role;
grant execute on function public.record_usage_if_allowed(uuid, uuid, text, integer, integer, jsonb) to service_role;
