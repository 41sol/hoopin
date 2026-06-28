-- US-14 (#56): Backend authorization Policy Enforcement Point.
--
-- Architecture decision (see docs/authentication-implementation.md §1): with
-- Supabase there is no standalone Express/JWKS API tier. JWT validation is done
-- by Supabase/PostgREST on every request, so the PEP lives in Postgres. The §6
-- guard levels become the three security-definer helpers below, consumed by the
-- US-15 RLS policies. Privileged / cross-tenant operations run as Edge Functions
-- with the service-role key (see supabase/functions/_shared/auth.ts).
--
-- The helpers are SECURITY DEFINER with a pinned search_path so they can read the
-- membership/assignment tables without tripping RLS recursion when called from
-- inside a policy on those same tables.

-- ---------- Level 1: academy membership (coarse) ----------
create or replace function public.is_academy_member(p_academy uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.academy_memberships m
    where m.user_id = auth.uid()
      and m.academy_id = p_academy
      and m.status = 'active'
  );
$$;

-- ---------- Level 2: role within an academy (medium) ----------
create or replace function public.has_academy_role(p_academy uuid, p_roles public.membership_role[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.academy_memberships m
    where m.user_id = auth.uid()
      and m.academy_id = p_academy
      and m.status = 'active'
      and m.role = any (p_roles)
  );
$$;

-- ---------- Level 3: team access (fine-grained) ----------
-- admin/scout get academy-wide access (the §6 bypass); coaches/players are
-- confined to teams they are explicitly assigned to. Implicit hierarchy (§2 c3)
-- is automatic: every path joins through an active membership in the team's
-- academy, so there is no team access without academy membership.
create or replace function public.can_access_team(p_team uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  with team_academy as (
    select academy_id from public.teams where id = p_team
  )
  select
    exists (
      select 1
      from public.academy_memberships m
      join team_academy ta on ta.academy_id = m.academy_id
      where m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('admin', 'scout')
    )
    or exists (
      select 1
      from public.academy_memberships m
      join public.team_assignments tasg on tasg.membership_id = m.id
      join team_academy ta on ta.academy_id = m.academy_id
      where m.user_id = auth.uid()
        and m.status = 'active'
        and tasg.team_id = p_team
    );
$$;

-- These run inside RLS evaluation for end-user roles, so they must be executable
-- by them. SECURITY DEFINER means the body still runs with the owner's rights.
grant execute on function public.is_academy_member(uuid) to authenticated, anon;
grant execute on function public.has_academy_role(uuid, public.membership_role[]) to authenticated, anon;
grant execute on function public.can_access_team(uuid) to authenticated, anon;

-- ---------- Reference protection (worked example) ----------
-- Replace the demo-open players policy with a team-scoped one. This is the
-- reference implementation for US-15 (#57), which applies the same pattern to
-- the remaining domain tables. Only authenticated callers with team access pass;
-- the anon key (no session) matches no policy and is denied.
drop policy if exists demo_all_players on public.players;
create policy players_team_access on public.players
  for all
  to authenticated
  using (public.can_access_team(team_id))
  with check (public.can_access_team(team_id));
