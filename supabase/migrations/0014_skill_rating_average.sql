-- #48 — Dynamic skill suggestion from a true moving average.
-- A canonical log of every per-skill rating data point a player receives, so the
-- Technical Skills card can suggest the true running average across ALL ratings
-- (advanced-eval star ratings + manual squad edits) instead of a capped ±10
-- nudge. `source` records how each point was captured.

create table if not exists public.skill_ratings (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  position text not null,
  skill_id uuid not null references public.skills(id) on delete cascade,
  value int not null check (value between 0 and 100),
  source text not null default 'eval' check (source in ('eval','manual')),
  created_at timestamptz not null default now()
);
create index if not exists skill_ratings_lookup_idx
  on public.skill_ratings(player_id, position, skill_id);

-- RLS: enabled, DEMO-OPEN for the anon key (Phase 2 replaces with RBAC).
alter table public.skill_ratings enable row level security;
create policy "demo_all_skill_ratings" on public.skill_ratings for all using (true) with check (true);

-- Backfill the existing advanced-eval star ratings as historical data points
-- (value = stars × 20, on the 0–100 squad scale), keeping each session's date so
-- the running average has the player's prior ratings to build on.
insert into public.skill_ratings (player_id, position, skill_id, value, source, created_at)
select se.player_id, se.position, ses.skill_id, least(100, ses.stars * 20), 'eval', se.created_at
from public.skill_evaluation_scores ses
join public.skill_evaluations se on se.id = ses.skill_evaluation_id
where ses.stars > 0;
