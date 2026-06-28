-- US-15 (#57): tenant-, role- & team-aware RLS, replacing the demo-open policies.
--
-- The database is the final enforcement layer (blueprint §1 layer 4): even a
-- direct query with the anon key is constrained here. Policies are scoped to
-- `authenticated` and delegate to the US-14 (#56) security-definer helpers, so
-- the anon role (a session-less request) matches nothing and is denied — which
-- is what forces login.
--
-- Scoping model:
--   * Tenant catalogs (skills, formations, eval_criteria) — readable by any
--     authenticated user; not tenant data.
--   * Academy-scoped (teams, academies) — is_academy_member / has_academy_role.
--   * Team-scoped (players + all player/team children) — can_access_team, routed
--     through the owning team so the §2-c3 implicit hierarchy is automatic.
--   * Identity (users, memberships, assignments) — self-/membership-scoped.

-- ---------- Drop all remaining demo-open policies ----------
drop policy if exists demo_all_teams on public.teams;
drop policy if exists demo_all_skills on public.skills;
drop policy if exists demo_all_player_skills on public.player_skills;
drop policy if exists demo_all_eval_criteria on public.eval_criteria;
drop policy if exists demo_all_evaluations on public.evaluations;
drop policy if exists demo_all_evaluation_scores on public.evaluation_scores;
drop policy if exists demo_all_skill_evaluations on public.skill_evaluations;
drop policy if exists demo_all_skill_evaluation_scores on public.skill_evaluation_scores;
drop policy if exists demo_all_skill_ratings on public.skill_ratings;
drop policy if exists demo_all_attendance on public.attendance;
drop policy if exists demo_all_announcements on public.announcements;
drop policy if exists demo_all_announcement_rsvps on public.announcement_rsvps;
drop policy if exists demo_all_lineups on public.lineups;
drop policy if exists demo_all_lineup_slots on public.lineup_slots;
drop policy if exists demo_all_formations on public.formations;
drop policy if exists demo_all_academies on public.academies;
-- (demo_all_players was already replaced in 0016; demo_all_app_users dropped with the table.)

-- ======================================================================
-- Shared catalogs (read-only for any authenticated user)
-- ======================================================================
create policy skills_read on public.skills
  for select to authenticated using (true);
create policy formations_read on public.formations
  for select to authenticated using (true);
create policy eval_criteria_read on public.eval_criteria
  for select to authenticated using (true);

-- ======================================================================
-- Academy-scoped
-- ======================================================================
create policy academies_member_read on public.academies
  for select to authenticated using (public.is_academy_member(id));

create policy teams_member_read on public.teams
  for select to authenticated using (public.is_academy_member(academy_id));
create policy teams_staff_write on public.teams
  for all to authenticated
  using (public.has_academy_role(academy_id, array['admin','coach']::public.membership_role[]))
  with check (public.has_academy_role(academy_id, array['admin','coach']::public.membership_role[]));

-- ======================================================================
-- Team-scoped: players (policy added in 0016) and their children
-- ======================================================================
create policy player_skills_team_access on public.player_skills
  for all to authenticated
  using (exists (select 1 from public.players p where p.id = player_id and public.can_access_team(p.team_id)))
  with check (exists (select 1 from public.players p where p.id = player_id and public.can_access_team(p.team_id)));

create policy evaluations_team_access on public.evaluations
  for all to authenticated
  using (exists (select 1 from public.players p where p.id = player_id and public.can_access_team(p.team_id)))
  with check (exists (select 1 from public.players p where p.id = player_id and public.can_access_team(p.team_id)));

create policy evaluation_scores_team_access on public.evaluation_scores
  for all to authenticated
  using (exists (
    select 1 from public.evaluations e join public.players p on p.id = e.player_id
    where e.id = evaluation_id and public.can_access_team(p.team_id)))
  with check (exists (
    select 1 from public.evaluations e join public.players p on p.id = e.player_id
    where e.id = evaluation_id and public.can_access_team(p.team_id)));

create policy skill_evaluations_team_access on public.skill_evaluations
  for all to authenticated
  using (exists (select 1 from public.players p where p.id = player_id and public.can_access_team(p.team_id)))
  with check (exists (select 1 from public.players p where p.id = player_id and public.can_access_team(p.team_id)));

create policy skill_evaluation_scores_team_access on public.skill_evaluation_scores
  for all to authenticated
  using (exists (
    select 1 from public.skill_evaluations se join public.players p on p.id = se.player_id
    where se.id = skill_evaluation_id and public.can_access_team(p.team_id)))
  with check (exists (
    select 1 from public.skill_evaluations se join public.players p on p.id = se.player_id
    where se.id = skill_evaluation_id and public.can_access_team(p.team_id)));

create policy skill_ratings_team_access on public.skill_ratings
  for all to authenticated
  using (exists (select 1 from public.players p where p.id = player_id and public.can_access_team(p.team_id)))
  with check (exists (select 1 from public.players p where p.id = player_id and public.can_access_team(p.team_id)));

create policy attendance_team_access on public.attendance
  for all to authenticated
  using (public.can_access_team(team_id))
  with check (public.can_access_team(team_id));

create policy announcements_team_access on public.announcements
  for all to authenticated
  using (public.can_access_team(team_id))
  with check (public.can_access_team(team_id));

create policy announcement_rsvps_team_access on public.announcement_rsvps
  for all to authenticated
  using (exists (select 1 from public.announcements a where a.id = announcement_id and public.can_access_team(a.team_id)))
  with check (exists (select 1 from public.announcements a where a.id = announcement_id and public.can_access_team(a.team_id)));

create policy lineups_team_access on public.lineups
  for all to authenticated
  using (public.can_access_team(team_id))
  with check (public.can_access_team(team_id));

create policy lineup_slots_team_access on public.lineup_slots
  for all to authenticated
  using (exists (select 1 from public.lineups l where l.id = lineup_id and public.can_access_team(l.team_id)))
  with check (exists (select 1 from public.lineups l where l.id = lineup_id and public.can_access_team(l.team_id)));

-- ======================================================================
-- Identity (self-/membership-scoped)
-- ======================================================================
create policy users_self_read on public.users
  for select to authenticated using (id = auth.uid());
create policy users_self_update on public.users
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Members see their own academy's memberships; staff manage them. (The auth-admin
-- read policy from 0017 stays for the access-token hook.)
create policy memberships_member_read on public.academy_memberships
  for select to authenticated
  using (user_id = auth.uid() or public.is_academy_member(academy_id));
create policy memberships_staff_write on public.academy_memberships
  for all to authenticated
  using (public.has_academy_role(academy_id, array['admin','coach']::public.membership_role[]))
  with check (public.has_academy_role(academy_id, array['admin','coach']::public.membership_role[]));

create policy team_assignments_member_read on public.team_assignments
  for select to authenticated
  using (exists (
    select 1 from public.academy_memberships m
    where m.id = membership_id and (m.user_id = auth.uid() or public.is_academy_member(m.academy_id))));
create policy team_assignments_staff_write on public.team_assignments
  for all to authenticated
  using (exists (
    select 1 from public.academy_memberships m
    where m.id = membership_id and public.has_academy_role(m.academy_id, array['admin','coach']::public.membership_role[])))
  with check (exists (
    select 1 from public.academy_memberships m
    where m.id = membership_id and public.has_academy_role(m.academy_id, array['admin','coach']::public.membership_role[])));

-- ======================================================================
-- Hardening: trim the RPC surface of the helper functions.
-- Postgres grants EXECUTE to PUBLIC on every new function, so we revoke from
-- PUBLIC (which also covers anon) and re-grant only to authenticated — all
-- policies above are `to authenticated`, so anon never needs the helpers. This
-- stops the SECURITY DEFINER helpers from being callable session-less via
-- /rest/v1/rpc. handle_new_user is a trigger function and should not be callable
-- at all.
-- ======================================================================
revoke execute on function public.is_academy_member(uuid) from public, anon;
revoke execute on function public.has_academy_role(uuid, public.membership_role[]) from public, anon;
revoke execute on function public.can_access_team(uuid) from public, anon;
grant execute on function public.is_academy_member(uuid) to authenticated;
grant execute on function public.has_academy_role(uuid, public.membership_role[]) to authenticated;
grant execute on function public.can_access_team(uuid) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
