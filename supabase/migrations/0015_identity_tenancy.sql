-- US-10 (#52): Identity & tenancy relational data model.
-- Implements docs/authentication-architecture.md §2 with the Supabase Auth
-- decision: the "Users" entity is a profile mirror of auth.users (uuid sub),
-- superseding the earlier text `app_users` design. This migration is written
-- idempotently so it reconciles a database that still carries the Keycloak-era
-- identity tables (empty `app_users` / text-keyed memberships) onto the
-- Supabase-native schema, while also applying cleanly to a fresh database.

-- ---------- Enums ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'membership_role') then
    create type public.membership_role as enum ('admin', 'coach', 'scout', 'player');
  end if;
  if not exists (select 1 from pg_type where typname = 'membership_status') then
    create type public.membership_status as enum ('invited', 'active');
  end if;
end $$;

-- ---------- Academies (tenant root) ----------
-- `slug` drives /:academy_slug routing (US-13).
create table if not exists public.academies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

-- ---------- Users: profile mirror of auth.users ----------
-- PK = auth.users.id (the IdP `sub`); rows are created by handle_new_user().
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  created_at timestamptz not null default now()
);

-- ---------- Reconcile legacy Keycloak-era identity tables ----------
-- These were provisioned out-of-band with a text `app_users` PK and text-check
-- roles. They are empty, so we drop and recreate them keyed to auth.users.
-- (IF EXISTS keeps this a no-op on a fresh database.)
drop table if exists public.team_assignments cascade;
drop table if exists public.academy_memberships cascade;
drop table if exists public.app_users cascade;

-- ---------- Academy memberships ----------
-- A user's role + status within one academy. §2 constraint 2: at most one row
-- per (user, academy).
create table public.academy_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  academy_id uuid not null references public.academies(id) on delete cascade,
  role public.membership_role not null,
  status public.membership_status not null default 'invited',
  created_at timestamptz not null default now()
);
create unique index academy_memberships_user_academy_uidx
  on public.academy_memberships (user_id, academy_id);
create index academy_memberships_user_idx on public.academy_memberships (user_id);
create index academy_memberships_academy_idx on public.academy_memberships (academy_id);

-- ---------- Team assignments ----------
-- Which teams a membership is scoped to (coaches/players). §2 constraint 3 is
-- enforced implicitly: a team belongs to an academy, and team access is gated
-- through the membership in that academy (see US-14 can_access_team).
create table public.team_assignments (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.academy_memberships(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (membership_id, team_id)
);
create index team_assignments_membership_idx on public.team_assignments (membership_id);
create index team_assignments_team_idx on public.team_assignments (team_id);

-- ---------- teams.academy_id (a team belongs to exactly one academy, §2 c1) ----------
alter table public.teams add column if not exists academy_id uuid references public.academies(id);
create index if not exists teams_academy_idx on public.teams (academy_id);

-- Backfill: ensure a 'default' academy exists and attach any orphaned teams so
-- the existing single-team app keeps working, then enforce NOT NULL.
insert into public.academies (slug, name)
  select 'default', 'Default Academy'
  where not exists (select 1 from public.academies where slug = 'default');

update public.teams
  set academy_id = (select id from public.academies where slug = 'default' limit 1)
  where academy_id is null;

alter table public.teams alter column academy_id set not null;

-- ---------- Mirror new auth accounts into public.users ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- RLS ----------
-- Enabled now; the actual self-/membership-scoped policies land in US-15 (#57)
-- and reuse the helper functions defined in US-14 (#56).
alter table public.academies enable row level security;
alter table public.users enable row level security;
alter table public.academy_memberships enable row level security;
alter table public.team_assignments enable row level security;
