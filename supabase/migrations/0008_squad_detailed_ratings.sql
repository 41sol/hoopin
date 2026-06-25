-- US-1 (#13) revision — drop Simplified mode; keep the detailed, position-
-- specific ratings only, each scored 0–100 (previously 1–10 in 0007).
--
-- Rescales the line-scoped sub-skills ×10 to preserve each player's standing,
-- then removes the now-unused simplified-mode columns.

-- 1–10 → 0–100. Guarded by value <= 10 so the one-time conversion is idempotent.
update public.player_skills ps
set value = least(100, ps.value * 10)
from public.skills s
where s.id = ps.skill_id
  and s.line is not null
  and ps.value <= 10;

-- Backfill: any player missing sub-skills for their current line (e.g. after a
-- position change to a different line) gets that line's set seeded from their
-- legacy 0–100 overall, so no player is left without ratings to refine.
with legacy as (
  select ps.player_id, round(avg(ps.value))::int as overall100
  from public.player_skills ps
  join public.skills s on s.id = ps.skill_id and s.line is null
  group by ps.player_id
)
insert into public.player_skills (player_id, skill_id, value)
select p.id, s.id, greatest(0, least(100, coalesce(l.overall100, 50)))
from public.players p
join public.skills s on s.line = p.line
left join legacy l on l.player_id = p.id
on conflict (player_id, skill_id) do nothing;

alter table public.players
  drop column if exists rating_mode,
  drop column if exists simple_rating;
