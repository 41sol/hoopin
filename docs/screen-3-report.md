# Screen 3 — Match Lineup Builder

Status: **implemented & verified against Supabase.** Branch: `feat/lineup-screen3` (off `main`, which has Screens 1–2).

## 1. What changed

- Built the **drag-and-drop lineup builder** (`/lineup`), replacing the placeholder, faithful to the prototype: formation pitch, draggable tokens, bench, auto-fill, and a save button.
- **Wired to Supabase** for formations (read) and lineups (read + write), tied to a match.
- Added a reusable **`ErrorBoundary`** so a screen error no longer blanks the whole app (it shows the message and recovers on navigation).

## 2. Decisions implemented (from your answers)

1. **Saving = lineups tied to a match, history kept.** Each save persists a `lineups` row (formation + match date + opponent) and its 11 `lineup_slots`. A **Load lineup** dropdown lists saved lineups (newest first); picking one repopulates the pitch. Saving again while one is loaded updates it.
2. **Warn-but-allow availability.** Any player can be placed; a banner lists players in the XI marked unavailable (e.g. *"1 player marked unavailable in the lineup: Tarek"*) and updates live as you drag. Tokens/bench dots show availability colour.
3. **Pitch + bench side by side on desktop**, stacked on mobile (`.lineup-grid` switches at 900px). The bench is a horizontal scroller on mobile and wraps on desktop.
4. **Formations live in a DB table** (`formations`, slots as JSONB), so they're editable without a code change. The chosen formation is stored on the saved lineup.

Secondary defaults applied: coach-only (no auth); **pointer-event** drag-and-drop (mouse + touch), no DnD library; bench = "not on the pitch" (no separate subs entity); auto-fill re-runs on formation change.

## 3. Files added / updated

- `src/screens/LineupScreen.jsx` — **new**: pitch, tokens, bench, auto-fill, pointer drag-and-drop, match context, save/load.
- `src/components/ErrorBoundary.jsx` — **new**, used in `AppShell` around the routed screen.
- `src/components/AppShell.jsx` — wraps `<Outlet/>` in the boundary.
- `src/App.jsx` — `/lineup` now renders `LineupScreen`.
- `src/ui/kit.jsx` — added the `download` icon.
- `src/data/strings.js` — lineup strings.
- `src/index.css` — `.lineup-grid` / `.bench-list` responsive layout.
- `supabase/migrations/0004_lineups.sql` — schema + formation seed.

## 4. Supabase schema created (project `drklujgozwpkqszqtvym`)

RLS enabled, demo-open policies (Phase 2 → RBAC):

- **`formations`** — `id`, `name` (unique), `sort_order`, `slots` (jsonb: `[{slot,x,y,line}]`). Seeded with **4-3-3, 4-4-2, 3-5-2** from the prototype.
- **`lineups`** — `id`, `team_id` → teams (cascade), `formation_id` → formations, `name`, `match_date`, `opponent`, `created_at`. Indexed on `team_id`.
- **`lineup_slots`** — `id`, `lineup_id` → lineups (cascade), `slot_index`, `player_id` → players (set null on delete), unique `(lineup_id, slot_index)`. Indexed on `lineup_id`.

Formations are seeded; lineups are created by coaches (none seeded).

## 5. Verification performed

- Renders live (formations from DB) on **desktop** (pitch + bench side by side) and **mobile** (stacked, bottom nav).
- **Auto-fill** places 11 by line/availability; because there are only 2 non-out forwards for 3 attacking slots, an unavailable forward lands in the XI and the **warning banner** correctly flags it.
- **Drag-and-drop** verified via simulated pointer events: dragging Bassel from the bench onto the ST slot swapped Jad out to the bench and updated the warning to two players, live.
- **Save → DB** verified: one `lineups` row + 11 `lineup_slots` with correct slot→player mapping; the saved lineup then appeared in the Load dropdown. Test lineup deleted afterward to keep the DB clean.

## 6. Bug fixed during build

`unavailableStarters.map(firstName)` passed player **objects** to a function expecting a name string (`name.split is not a function`), crashing the screen on load because auto-fill does seat an unavailable forward. Fixed to `map(p => firstName(p.name))`. The new `ErrorBoundary` surfaced the message instead of a blank page.

## 7. Before Screen 4 (My Journey)

Nothing blocking to review Screen 3. Screen 4 (radar + trend) is read-only and is the natural consumer of the **evaluations** from Screen 2 — when ready I'll ask how to aggregate them (which metrics map to the radar, how the trend is bucketed over time, date ranges, benchmark/comparison, and empty-state behaviour for players with few evaluations).

**Please review Screen 3 and approve before I move on.**
