-- Hoopin — Screen 1 schema: teams, skills, players, player_skills.
-- Multi-team ready; football-only skills for now; demo-open RLS (Phase 2 will
-- replace the permissive policies with role-based access control).

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age_group text,
  sport text not null default 'football',
  created_at timestamptz not null default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  sport text not null default 'football',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  number int,
  position text,
  line text check (line in ('GK','DEF','MID','FWD')),
  age int,
  height_cm int,
  weight_kg int,
  foot text check (foot in ('Left','Right')),
  availability text not null default 'in' check (availability in ('in','maybe','out')),
  attendance_pct numeric(4,2),
  created_at timestamptz not null default now()
);
create index if not exists players_team_idx on public.players(team_id);

create table if not exists public.player_skills (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  value int not null default 0 check (value between 0 and 100),
  unique (player_id, skill_id)
);
create index if not exists player_skills_player_idx on public.player_skills(player_id);

-- Row Level Security: enabled, but DEMO-OPEN for the anon key.
-- TODO(Phase 2): replace with coach/player/parent role policies.
alter table public.teams enable row level security;
alter table public.skills enable row level security;
alter table public.players enable row level security;
alter table public.player_skills enable row level security;

create policy "demo_all_teams" on public.teams for all using (true) with check (true);
create policy "demo_all_skills" on public.skills for all using (true) with check (true);
create policy "demo_all_players" on public.players for all using (true) with check (true);
create policy "demo_all_player_skills" on public.player_skills for all using (true) with check (true);
