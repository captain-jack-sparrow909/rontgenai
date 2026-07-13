-- Röntgen AI · initial schema (Supabase Postgres)
-- Apply via Supabase CLI or SQL editor.
-- Strategy: Free/Pro = personal (org_id null). Team = Clerk Organization id.

create extension if not exists "pgcrypto";

-- Profiles mirror Clerk users (synced on first login / webhook later)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Organizations map to Clerk Organizations (Team plan)
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  organization_id uuid references public.organizations (id) on delete set null,
  plan text not null default 'free' check (plan in ('free', 'pro', 'team')),
  status text not null default 'active'
    check (status in ('active', 'trialing', 'past_due', 'canceled', 'none')),
  provider text not null default 'paddle',
  paddle_customer_id text,
  paddle_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_owner_chk check (
    profile_id is not null or organization_id is not null
  )
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  organization_id uuid references public.organizations (id) on delete set null,
  product text not null
    check (product in ('blueprint', 'pulse', 'atlas', 'sentinel', 'forge', 'radar')),
  units integer not null default 1 check (units > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_profile_created_idx
  on public.usage_events (profile_id, created_at desc);
create index if not exists usage_events_product_created_idx
  on public.usage_events (product, created_at desc);

create table if not exists public.artifacts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  organization_id uuid references public.organizations (id) on delete set null,
  product text not null,
  r2_key text not null,
  content_type text,
  size_bytes bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  organization_id uuid references public.organizations (id) on delete set null,
  product text not null,
  type text not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'failed', 'canceled')),
  input jsonb not null default '{}'::jsonb,
  result jsonb,
  error text,
  inngest_run_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_status_created_idx on public.jobs (status, created_at desc);

create table if not exists public.github_installations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  organization_id uuid references public.organizations (id) on delete set null,
  installation_id bigint not null unique,
  account_login text,
  account_type text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  product text,
  created_at timestamptz not null default now(),
  unique (email, product)
);

-- RLS: enable; policies refined when service role + Clerk JWT template are ready
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_events enable row level security;
alter table public.artifacts enable row level security;
alter table public.jobs enable row level security;
alter table public.github_installations enable row level security;
alter table public.waitlist enable row level security;

-- Service role bypasses RLS; anon/authenticated policies added in a later migration
-- after Clerk Supabase JWT integration is configured.
