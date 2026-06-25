-- US-4 (#16) — Attendance tracking on the Evaluation screen.
-- A coach logs each player's status (present/late/absent) per session, where a
-- session is identified by the team + date + type (training/match) already
-- captured by the Evaluation screen's session context. One row per player per
-- session; re-marking upserts. Kept independent of `evaluations` so squad-wide
-- attendance doesn't depend on the per-player evaluation submit flow.

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  session_date date not null,
  session_type text not null default 'training' check (session_type in ('training','match')),
  status text not null check (status in ('present','late','absent')),
  updated_at timestamptz not null default now(),
  unique (team_id, player_id, session_date, session_type)
);
create index if not exists attendance_session_idx on public.attendance(team_id, session_date, session_type);
create index if not exists attendance_player_idx on public.attendance(player_id);

-- RLS: enabled, DEMO-OPEN for the anon key (Phase 2 replaces with RBAC).
alter table public.attendance enable row level security;
create policy "demo_all_attendance" on public.attendance for all using (true) with check (true);
