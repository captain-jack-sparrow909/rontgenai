-- Phase 1: constraints, indexes, RLS helpers for service + waitlist

-- One active personal subscription row per profile (simplifies upserts)
create unique index if not exists subscriptions_profile_id_uidx
  on public.subscriptions (profile_id)
  where profile_id is not null;

create unique index if not exists subscriptions_org_id_uidx
  on public.subscriptions (organization_id)
  where organization_id is not null;

-- Waitlist uniqueness already (email, product); normalize email via app layer

-- Jobs listing helpers
create index if not exists jobs_profile_created_idx
  on public.jobs (profile_id, created_at desc);

-- Allow service role full access (default). For anon, keep RLS locked down.
-- Authenticated JWT policies can be added once Clerk Supabase third-party auth is wired.

-- Free subscription seed is handled in API ensureProfile.

comment on table public.profiles is 'Clerk users mirrored by api-gateway';
comment on table public.usage_events is 'Metered product usage for plan limits';
comment on table public.jobs is 'Async AI jobs (Inngest / workers)';
