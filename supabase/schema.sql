-- LinkedIn Ads Launcher — Supabase schema
-- Run in the Supabase SQL editor (or `supabase db push`).

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_email text not null,
  audience_id text not null,
  audience_name text not null,
  daily_budget numeric(12, 2) not null check (daily_budget > 0),
  currency char(3) not null default 'USD',
  destination_url text not null,
  tracked_url text not null,
  image_url text not null,
  status text not null default 'draft'
    check (status in ('draft', 'launching', 'active', 'failed')),
  linkedin_campaign_id text,
  linkedin_creative_id text,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists campaigns_created_at_idx
  on public.campaigns (created_at desc);

create index if not exists campaigns_user_email_idx
  on public.campaigns (user_email);

-- Per-user LinkedIn OAuth connection (token + target ad account).
create table if not exists public.linkedin_connections (
  user_email text primary key,
  access_token text not null default '',
  refresh_token text,
  expires_at timestamptz,
  ad_account_id text,
  organization_urn text,
  connected_at timestamptz not null default now()
);

alter table public.linkedin_connections enable row level security;

-- Storage bucket for creative images (public read for ad serving).
insert into storage.buckets (id, name, public)
values ('ad-creatives', 'ad-creatives', true)
on conflict (id) do nothing;

-- Row Level Security: the app writes via the service-role key (which bypasses
-- RLS), so keep RLS enabled and add policies only if you expose the anon key.
alter table public.campaigns enable row level security;
