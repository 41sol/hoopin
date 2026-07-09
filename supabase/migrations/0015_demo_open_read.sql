-- Demo / static-view mode for the `main` branch app (which has no auth flow).
-- Grants the anonymous browser role READ-ONLY access to the app-data tables so
-- the UI can display existing data without signing in.
--
-- ⚠️ Security note: the publishable anon key ships in the browser bundle, so this
-- makes these tables effectively PUBLICLY READABLE. Identity/tenancy tables
-- (users, academy_memberships, academies, team_assignments) are intentionally
-- EXCLUDED and remain locked to authenticated members only.
--
-- To revert (re-lock everything to authenticated users), drop these policies:
--   do $$ declare t text; begin
--     foreach t in array array['teams','skills','players','player_skills',
--       'eval_criteria','evaluations','evaluation_scores','skill_evaluations',
--       'skill_evaluation_scores','skill_ratings','formations','lineups',
--       'lineup_slots','announcements','announcement_rsvps','attendance']
--     loop execute format('drop policy if exists demo_open_anon_read on public.%I;', t); end loop;
--   end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'teams','skills','players','player_skills','eval_criteria','evaluations',
    'evaluation_scores','skill_evaluations','skill_evaluation_scores','skill_ratings',
    'formations','lineups','lineup_slots','announcements','announcement_rsvps','attendance'
  ]
  loop
    execute format('drop policy if exists demo_open_anon_read on public.%I;', t);
    execute format('create policy demo_open_anon_read on public.%I for select to anon using (true);', t);
  end loop;
end $$;
