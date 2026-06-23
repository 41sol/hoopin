-- Screen 3 — Match Lineup Builder.
-- Formation templates live in the DB (editable without a code change). A lineup
-- is tied to a match (date + opponent) and keeps history; lineup_slots map a
-- formation slot index to a player.

create table if not exists public.formations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  slots jsonb not null,          -- [{ slot, x, y, line }] in pitch %-coords
  created_at timestamptz not null default now()
);

create table if not exists public.lineups (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  formation_id uuid not null references public.formations(id),
  name text,
  match_date date,
  opponent text,
  created_at timestamptz not null default now()
);
create index if not exists lineups_team_idx on public.lineups(team_id);

create table if not exists public.lineup_slots (
  id uuid primary key default gen_random_uuid(),
  lineup_id uuid not null references public.lineups(id) on delete cascade,
  slot_index int not null,
  player_id uuid references public.players(id) on delete set null,
  unique (lineup_id, slot_index)
);
create index if not exists lineup_slots_lineup_idx on public.lineup_slots(lineup_id);

-- RLS: enabled, DEMO-OPEN for the anon key (Phase 2 -> RBAC).
alter table public.formations enable row level security;
alter table public.lineups enable row level security;
alter table public.lineup_slots enable row level security;
create policy "demo_all_formations" on public.formations for all using (true) with check (true);
create policy "demo_all_lineups" on public.lineups for all using (true) with check (true);
create policy "demo_all_lineup_slots" on public.lineup_slots for all using (true) with check (true);

-- Seed formation templates (ported from the prototype's FORMATIONS constant).
insert into public.formations (name, sort_order, slots) values
('4-3-3', 1, '[
  {"slot":"GK","x":50,"y":90,"line":"GK"},
  {"slot":"LB","x":18,"y":70,"line":"DEF"},
  {"slot":"CB","x":39,"y":74,"line":"DEF"},
  {"slot":"CB","x":61,"y":74,"line":"DEF"},
  {"slot":"RB","x":82,"y":70,"line":"DEF"},
  {"slot":"CM","x":30,"y":48,"line":"MID"},
  {"slot":"CM","x":50,"y":52,"line":"MID"},
  {"slot":"CM","x":70,"y":48,"line":"MID"},
  {"slot":"LW","x":22,"y":24,"line":"FWD"},
  {"slot":"ST","x":50,"y":18,"line":"FWD"},
  {"slot":"RW","x":78,"y":24,"line":"FWD"}
]'::jsonb),
('4-4-2', 2, '[
  {"slot":"GK","x":50,"y":90,"line":"GK"},
  {"slot":"LB","x":18,"y":71,"line":"DEF"},
  {"slot":"CB","x":39,"y":75,"line":"DEF"},
  {"slot":"CB","x":61,"y":75,"line":"DEF"},
  {"slot":"RB","x":82,"y":71,"line":"DEF"},
  {"slot":"LM","x":18,"y":47,"line":"MID"},
  {"slot":"CM","x":40,"y":50,"line":"MID"},
  {"slot":"CM","x":60,"y":50,"line":"MID"},
  {"slot":"RM","x":82,"y":47,"line":"MID"},
  {"slot":"ST","x":38,"y":20,"line":"FWD"},
  {"slot":"ST","x":62,"y":20,"line":"FWD"}
]'::jsonb),
('3-5-2', 3, '[
  {"slot":"GK","x":50,"y":90,"line":"GK"},
  {"slot":"CB","x":28,"y":74,"line":"DEF"},
  {"slot":"CB","x":50,"y":77,"line":"DEF"},
  {"slot":"CB","x":72,"y":74,"line":"DEF"},
  {"slot":"LM","x":14,"y":48,"line":"MID"},
  {"slot":"CM","x":35,"y":52,"line":"MID"},
  {"slot":"CM","x":50,"y":55,"line":"MID"},
  {"slot":"CM","x":65,"y":52,"line":"MID"},
  {"slot":"RM","x":86,"y":48,"line":"MID"},
  {"slot":"ST","x":38,"y":22,"line":"FWD"},
  {"slot":"ST","x":62,"y":22,"line":"FWD"}
]'::jsonb)
on conflict (name) do nothing;
