-- US-2 (#14) — Position-specific skill ratings.
-- A player can hold independent sub-skill ratings per position. The active
-- position (players.position) drives the displayed overall; ratings for other
-- positions are retained, so switching a player back to a former position
-- restores that position's ratings rather than losing the progress.

-- Tag each rating with the position it belongs to. Existing ratings become the
-- player's current (active) position ratings.
alter table public.player_skills
  add column if not exists position text;

update public.player_skills ps
set position = coalesce(p.position, p.line)
from public.players p
where ps.player_id = p.id and ps.position is null;

alter table public.player_skills
  alter column position set not null;

-- One rating per (player, position, skill) instead of (player, skill), so the
-- same skill can be scored independently under different positions.
alter table public.player_skills
  drop constraint if exists player_skills_player_id_skill_id_key;
alter table public.player_skills
  add constraint player_skills_player_position_skill_key unique (player_id, position, skill_id);
