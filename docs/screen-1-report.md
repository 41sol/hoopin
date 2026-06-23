# Screen 1 — Player Performance Profile (Squad + Profile)

Status: **implemented & verified against Supabase.** This step also carried the
**Vite + React migration** and the shared **responsive app shell**, since Screen 1
is the first screen to need them.

## 1. What changed

- **Migrated the prototype from a single self-contained `index.html` (React + Babel via CDN) to a real Vite + React app** with ES modules, `.env`-managed secrets, and `react-router-dom` routing. The old phone-frame / double-click-to-run model is gone, per the agreed direction.
- **Full fluid, responsive web layout (no phone frame):**
  - **Sidebar** navigation on desktop / large tablet (viewport ≥ 900px).
  - **Bottom-tab** navigation on mobile (< 900px).
  - Content is centered with a max width and reflows; squad cards use a responsive grid (1 → 2 → 3 columns); the profile uses a 2-column (Skills | Attendance) layout on wide screens and stacks on narrow ones.
- **Screen 1 is fully wired to Supabase** (reads + writes), preserving the prototype's visual design (tokens, Sora/Plus Jakarta Sans, card styling, gradient hero, skill bars, availability dots).
- **Squad list:** search by name, **filter** by availability (All / Available / Maybe / Unavailable), **sort** by Overall or Name, grouped by line (GK / DEF / MID / FWD). Overall is derived (avg of skills).
- **Profile:** editable **skill ratings** (steppers, Coach view) and editable **identity** (name, number, position, availability, age, height, weight, foot) directly in the hero. Both **save immediately** to Supabase on Save; the in-memory squad cache updates so the list reflects changes without a reload.
- **Attendance card** is kept as illustrative/dummy data for now (real per-player attendance arrives with Screen 3), but the attendance % is read from the player record.
- Screens 2–5 are routed to a friendly **placeholder** so navigation works end-to-end while we build screen by screen.

## 2. Files added / updated

**Tooling / config**
- `package.json`, `vite.config.js` — Vite + React + Supabase + Router.
- `index.html` — replaced the inlined prototype with a Vite entry point.
- `.gitignore` — added `node_modules`, `dist`, `.env*` (keeps `.env.example`).
- `.env.example` — documents the two required env vars. (`.env` holds the real key locally and is gitignored.)
- `.claude/launch.json` — preview server switched to `hoopin-vite` (`npm run dev`, port 5173). *(gitignored)*

**App source (`src/`)**
- `main.jsx`, `App.jsx` — entry + router (`/squad`, `/squad/:playerId`, plus placeholders).
- `index.css` — global tokens (ported verbatim) + the responsive shell (sidebar / header / bottom nav).
- `lib/supabase.js` — Supabase client from env vars.
- `lib/api.js` — data access: `getTeam`, `getSkills`, `getPlayers`, `updatePlayer`, `savePlayerSkills`.
- `state/squad.jsx` — `SquadProvider` / `useSquad` shared cache for the list + profile routes.
- `ui/kit.jsx` — ported UI kit (Icon, Avatar, Card, Pill, SkillBar, SkillChip, SectionLabel, AvailDot, `ratingColor`, `overall`).
- `data/strings.js` — UI strings (English only for now; structured for i18n later).
- `data/static.js` — front-end-only constants (dummy attendance log, line labels, positions, feet).
- `components/AppShell.jsx` — sidebar + header + bottom nav + `<Outlet/>`.
- `components/StateNote.jsx` — shared loading / empty / error message.
- `screens/SquadScreen.jsx` — squad list (search / sort / filter / grouped grid).
- `screens/ProfileScreen.jsx` — profile + edit/save for skills and identity.
- `screens/Placeholder.jsx` — stub for screens 2–5.

**Database (`supabase/migrations/`)** — committed for reproducibility:
- `0001_init_schema.sql`, `0002_seed_screen1.sql`.

## 3. Supabase schema created (project `drklujgozwpkqszqtvym`)

Four tables in `public` (RLS enabled, **demo-open** policies for the anon key — to be replaced with role-based policies in Phase 2):

- **`teams`** — `id` (uuid pk), `name`, `age_group`, `sport` (default `football`), `created_at`. *Multi-team ready.*
- **`skills`** — `id`, `key` (unique), `label`, `sport`, `sort_order`, `created_at`. *Skills modeled as a table.*
- **`players`** — `id`, `team_id` → teams, `name`, `number`, `position`, `line` (check GK/DEF/MID/FWD), `age`, `height_cm`, `weight_kg`, `foot` (check Left/Right), `availability` (check in/maybe/out), `attendance_pct`, `created_at`. Index on `team_id`.
- **`player_skills`** — `id`, `player_id` → players (cascade), `skill_id` → skills, `value` (0–100), unique `(player_id, skill_id)`. Index on `player_id`.

## 4. Seed data

Ported the prototype's hardcoded data into the DB:
- 1 team (**Beirut Strikers · U16 · football**)
- 4 skills (Passing, Shooting, Dribbling, Stamina)
- **12 players** with full identity + availability + attendance %
- **48 player_skills** rows (4 per player)

Seeds are idempotent (natural keys: single team; unique player `number`; unique skill `key`).

## 5. Verification performed

- Squad list renders live from Supabase, grouped/sorted/filtered correctly (desktop, mobile, wide desktop).
- Profile renders live data; **skill save** persisted to `player_skills` (verified in DB) and **identity save** persisted to `players` (verified in DB). No console errors. Test edits were reverted.
- Responsive breakpoint confirmed: sidebar ≥ 900px, bottom nav < 900px.

## 6. Assumptions made

1. **Coach view only** — no auth yet; the app behaves as a coach (full read + edit). RLS is demo-open for the anon key.
2. **Breakpoint at 900px** for sidebar↔bottom-nav (covers large tablets in landscape with the sidebar). Easy to change if you prefer a different threshold.
3. **i18n/RTL and theming (the prototype's Tweaks panel)** are intentionally not reintroduced this round — fixed English + green/light theme. Strings are structured so i18n can return later.
4. **`attendance_pct`** is stored as a simple per-player number (illustrative); the attendance *log* is still dummy front-end data until Screen 3.
5. Used the **publishable** Supabase key (`sb_publishable_…`) in `.env` for the browser client.

## 7. What I need from you before Screen 2

Nothing blocking to review Screen 1. When you're ready for **Screen 2 (Session/Match Evaluation Form)**, I'll run discovery and ask the screen-specific questions (rating scales vs sliders, per-session/match/player scoping, draft vs final submission, who can submit, where evaluations are stored and whether they should feed the profile/journey screens, etc.).

**Please review Screen 1 and approve before I move on.**
