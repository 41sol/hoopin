-- US-3 (#15) — Advanced technical evaluation that feeds back into Squad ratings.
-- Coaches star-rate a player's position sub-skills (the US-1/US-2 sets); the
-- session is stored, a per-skill adjustment is suggested against the current
-- squad rating, and the outcome (applied or declined) is recorded.

-- Team-level preference: when on, suggestions apply automatically (no review).
alter table public.teams
  add column if not exists auto_apply_eval boolean not null default false;

-- An advanced technical evaluation session for a player at a given position.
create table if not exists public.skill_evaluations (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  position text not null,
  coach_name text,
  eval_date date not null default current_date,
  applied boolean not null default false,      -- outcome: were the suggestions applied?
  applied_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists skill_evaluations_player_idx on public.skill_evaluations(player_id);

-- Per sub-skill: the star rating, the squad value at eval time, the suggested
-- delta, and the value actually applied (null when declined).
create table if not exists public.skill_evaluation_scores (
  id uuid primary key default gen_random_uuid(),
  skill_evaluation_id uuid not null references public.skill_evaluations(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  stars int not null check (stars between 0 and 5),
  prev_value int check (prev_value between 0 and 100),
  suggested_delta int not null default 0,
  applied_value int check (applied_value between 0 and 100),
  unique (skill_evaluation_id, skill_id)
);
create index if not exists skill_evaluation_scores_eval_idx on public.skill_evaluation_scores(skill_evaluation_id);

-- RLS: enabled, DEMO-OPEN for the anon key (Phase 2 replaces with RBAC).
alter table public.skill_evaluations enable row level security;
alter table public.skill_evaluation_scores enable row level security;

create policy "demo_all_skill_evaluations" on public.skill_evaluations for all using (true) with check (true);
create policy "demo_all_skill_evaluation_scores" on public.skill_evaluation_scores for all using (true) with check (true);
