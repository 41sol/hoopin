# Screen 4 — My Journey (progress dashboard)

Status: **implemented & verified against Supabase.** Branch: `feat/journey-screen4` (off `main`, which has Screens 1–3). Read-only.

## 1. What changed

- Built the **My Journey** dashboard (`/journey`), replacing the placeholder, faithful to the prototype: player switcher, motivational hero, radar chart, metric breakdown, and a trend chart with a timeframe toggle.
- **Wired to Supabase:** the radar reads the player's current skills (Screen 1), and the trend aggregates the player's evaluations (Screen 2) by month.
- **Seeded 6 months of evaluations** for every player so the dashboard is populated and demonstrable.

## 2. Decisions implemented (from your answers)

1. **Radar = current Screen 1 skills** — axes are Passing / Shooting / Dribbling / Stamina (short codes PAS/SHO/DRI/STA on the chart), values from the player's `player_skills`. A breakdown grid lists each skill with its value.
2. **Trend = monthly overall from Screen 2 evaluations** — each evaluation's "overall" is the average of its 4 criterion scores; those are bucketed by month and averaged, oldest → newest.
3. **Seeded historical evaluations** — one evaluation per player per month for the last 6 months (72 evaluations, 288 scores), trending upward (ported from the prototype's per-player trend arrays).
4. **Two-column on desktop** — hero on top, then radar and trend side by side (`.journey-grid` at 900px); stacks on mobile.

Secondary defaults applied: read-only coach view; the player switcher lists **all** players (scrollable); **no benchmark/comparison**; empty state when a player has fewer than 2 months of evaluations.

### Small deviation worth noting
The prototype's timeframe toggle was "Last month / Last 6 months", where "last month" showed 4 weekly points. Since you chose **monthly bucketing**, a "last month" view collapses to a single point (no line). I changed the toggle to **Last 3 months / Last 6 months** — both render a real trend line. Easy to revisit if you'd prefer weekly granularity for a short-range view (would need weekly-cadence evaluations).

## 3. Files added / updated

- `src/screens/JourneyScreen.jsx` — **new**: switcher, hero, radar, breakdown, trend, timeframe toggle, empty/loading/error states.
- `src/ui/charts.jsx` — **new**: `RadarChart` + `TrendChart` (ported SVG charts).
- `src/lib/api.js` — added `getPlayerTrend()` (monthly aggregation of a player's evaluations).
- `src/ui/kit.jsx` — added `up` and `trophy` icons.
- `src/data/strings.js` — journey strings.
- `src/index.css` — `.journey-grid` responsive layout.
- `src/App.jsx` — `/journey` now renders `JourneyScreen`.
- `supabase/migrations/0005_seed_journey.sql` — evaluation seed.

## 4. Supabase changes

No new tables — Screen 4 reads existing `player_skills` (Screen 1) and `evaluations` / `evaluation_scores` (Screen 2). The migration **seeds** 6 months of evaluations per player.

## 5. Verification performed

- Renders live on **desktop** (radar | trend side by side) and **mobile** (stacked, bottom nav).
- Radar matches the player's DB skills (spot-checked against the database); breakdown values agree.
- Trend draws from seeded evaluations; **player switch** reloads the trend; **timeframe toggle** works (e.g. Karim: +12 over the last 3 months = 84 − 72, X-axis Apr→Jun; +22 over 6 months).
- Hero delta and attendance% are correct per player. No current console errors.

## 6. Note from the build

The seed initially inserted only 3 rows: an uncorrelated `not exists (select 1 from evaluations)` guard **inside** the data-modifying CTE self-interferes in Postgres (rows become visible mid-statement). Fixed by dropping that guard and marking the source CTE `materialized`; the committed migration reflects the working version and documents the gotcha.

## 7. Before Screen 5 (Announcement & RSVP Board)

Nothing blocking to review Screen 4. Screen 5 is the last one — when ready I'll ask about announcement fields and authorship, audience targeting, RSVP options/among whom, the response tally (the prototype shows a coach-view summary), pinning/ordering, expiry/archive, and whether posting is in scope or just RSVP for now.

**Please review Screen 4 and approve before I move on.**
