-- #47 — Soft-delete (deactivate) players.
-- A player can be marked inactive: hidden from active roster views but their
-- record is retained in the database (never destroyed), so history, evaluations
-- and past lineups stay intact. Additive & backward compatible — existing
-- players default to active.

alter table public.players
  add column if not exists active boolean not null default true;

-- Roster reads filter by (team_id, active); index the pair they query on.
create index if not exists players_team_active_idx on public.players(team_id, active);
