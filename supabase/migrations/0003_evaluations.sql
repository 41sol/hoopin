-- Screen 2 — Session/Match Evaluation.
-- Criteria modeled as a table (like skills). Evaluations are standalone records
-- with a date/type/opponent context, scored 0-100 per criterion (the UI uses
-- 1-5 stars mapped to 20/40/60/80/100 so the scale can change without migration).
-- Normalized scores feed Screen 4 (My Journey) aggregation later.

create table if not exists public.eval_criteria (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  icon text,
  sport text not null default 'football',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  coach_name text,
  eval_date date not null default current_date,
  eval_type text not null default 'training' check (eval_type in ('training','match')),
  opponent text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists evaluations_player_idx on public.evaluations(player_id);
create index if not exists evaluations_date_idx on public.evaluations(eval_date);

create table if not exists public.evaluation_scores (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  criterion_id uuid not null references public.eval_criteria(id) on delete cascade,
  value int not null check (value between 0 and 100),
  unique (evaluation_id, criterion_id)
);
create index if not exists evaluation_scores_eval_idx on public.evaluation_scores(evaluation_id);

-- RLS: enabled, DEMO-OPEN for the anon key (Phase 2 replaces with RBAC).
alter table public.eval_criteria enable row level security;
alter table public.evaluations enable row level security;
alter table public.evaluation_scores enable row level security;

create policy "demo_all_eval_criteria" on public.eval_criteria for all using (true) with check (true);
create policy "demo_all_evaluations" on public.evaluations for all using (true) with check (true);
create policy "demo_all_evaluation_scores" on public.evaluation_scores for all using (true) with check (true);

-- Seed the football criteria (ported from the prototype's 4 criteria).
insert into public.eval_criteria (key, label, icon, sport, sort_order) values
  ('technical',  'Technical Skill',       'football', 'football', 1),
  ('tactical',   'Tactical Awareness',    'lineup',   'football', 2),
  ('workrate',   'Work Rate',             'flame',    'football', 3),
  ('discipline', 'Discipline & Attitude', 'whistle',  'football', 4)
on conflict (key) do nothing;
