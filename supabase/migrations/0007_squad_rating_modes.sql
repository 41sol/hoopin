-- US-1 (#13) — Configurable rating modes on the Squad screen.
-- Adds a per-player rating mode + simplified score, and position-specific
-- (line-scoped) sub-skills rated 1–10 for Advanced mode.
--
-- Additive & idempotent: the legacy generic skills (passing/shooting/dribbling/
-- stamina) are left in place but filtered out at read time by line, so this
-- migration touches no existing rows destructively.

-- Per-player rating mode. Defaults to 'advanced' to preserve the existing
-- skill-breakdown experience. Simplified mode stores a single 1–10 overall.
alter table public.players
  add column if not exists rating_mode text not null default 'advanced'
    check (rating_mode in ('simplified','advanced')),
  add column if not exists simple_rating int
    check (simple_rating between 1 and 10);

-- Scope a skill to a pitch line; null = legacy generic skill.
alter table public.skills
  add column if not exists line text
    check (line in ('GK','DEF','MID','FWD'));

-- Position-specific sub-skill sets (each rated 1–10). Keys are line-prefixed so
-- they stay globally unique alongside the legacy generic skills.
insert into public.skills (key, label, sport, line, sort_order) values
  ('gk_shot_stopping','Shot Stopping','football','GK',1),
  ('gk_handling','Handling','football','GK',2),
  ('gk_positioning','Positioning','football','GK',3),
  ('gk_distribution','Distribution','football','GK',4),
  ('gk_reflexes','Reflexes','football','GK',5),
  ('gk_command_of_area','Command of Area','football','GK',6),
  ('def_tackling','Tackling','football','DEF',1),
  ('def_marking','Marking','football','DEF',2),
  ('def_heading','Heading','football','DEF',3),
  ('def_positioning','Positioning','football','DEF',4),
  ('def_strength','Strength','football','DEF',5),
  ('def_passing','Passing','football','DEF',6),
  ('mid_passing','Passing','football','MID',1),
  ('mid_vision','Vision','football','MID',2),
  ('mid_ball_control','Ball Control','football','MID',3),
  ('mid_dribbling','Dribbling','football','MID',4),
  ('mid_stamina','Stamina','football','MID',5),
  ('mid_defensive_work_rate','Defensive Work Rate','football','MID',6),
  ('fwd_finishing','Finishing','football','FWD',1),
  ('fwd_off_the_ball','Off-the-ball Movement','football','FWD',2),
  ('fwd_dribbling','Dribbling','football','FWD',3),
  ('fwd_pace','Pace','football','FWD',4),
  ('fwd_heading','Heading','football','FWD',5),
  ('fwd_composure','Composure','football','FWD',6)
on conflict (key) do nothing;

-- Seed each player's advanced sub-skills (1–10) from their existing 0–100
-- overall (average of the legacy skills), so the migration preserves each
-- player's current standing rather than resetting everyone to a flat default.
with legacy as (
  select ps.player_id, round(avg(ps.value))::int as overall100
  from public.player_skills ps
  join public.skills s on s.id = ps.skill_id and s.line is null
  group by ps.player_id
),
seed as (
  select p.id as player_id, p.line,
         greatest(1, least(10, round(coalesce(l.overall100, 50) / 10.0)::int)) as v10
  from public.players p
  left join legacy l on l.player_id = p.id
)
insert into public.player_skills (player_id, skill_id, value)
select seed.player_id, s.id, seed.v10
from seed
join public.skills s on s.line = seed.line
on conflict (player_id, skill_id) do nothing;

-- Seed each player's simplified rating from the average of their freshly
-- seeded line sub-skills (already on the 1–10 scale).
update public.players p
set simple_rating = sub.v10
from (
  select ps.player_id, round(avg(ps.value))::int as v10
  from public.player_skills ps
  join public.skills s on s.id = ps.skill_id
  where s.line = (select line from public.players where id = ps.player_id)
  group by ps.player_id
) sub
where p.id = sub.player_id and p.simple_rating is null;
