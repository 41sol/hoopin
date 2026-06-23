# Screen 5 — Announcement & RSVP Board

Status: **implemented & verified against Supabase.** Branch: `feat/board-screen5` (off `main`, which has Screens 1–4). **This is the final MVP screen.**

## 1. What changed

- Built the **Announcement & RSVP Board** (`/board`), replacing the placeholder, faithful to the prototype: announcement cards with author, tag, pinned banner, body, RSVP buttons, and a coach-view response summary (stacked bar + tallies).
- **Full CRUD** on announcements (create / edit / delete via a modal form) and **per-respondent RSVPs** persisted to Supabase, with tallies computed from real rows.
- Seeded the 3 prototype announcements + realistic squad RSVPs.

## 2. Decisions implemented (from your answers)

1. **Full CRUD** — a "New announcement" button opens a modal (title, message, tag, tag colour, RSVP on/off, deadline, pin). Each card has **edit** and **delete** actions (delete confirms first). New announcements are authored as the coach ("Coach Walid · Head Coach").
2. **Per-respondent RSVPs + seeded squad** — `announcement_rsvps` holds one row per player; tallies (Attending / Maybe / Absent) are counted from those rows. The squad's responses are seeded so the board looks populated.
3. **Fixed player persona** — with no auth, the RSVP buttons act as player **#10 (Karim)**. Tapping I'm in / Maybe / Can't persists his row and updates the tally; tapping the active choice again clears it.
4. **Two-column card grid** on desktop (`.board-grid` at 900px), single column on mobile. Pinned announcements sort first, then newest.

Secondary defaults applied: team-wide audience (no targeting); no expiry/archive; `created_at` drives the relative "time" ("2h ago"); deadline is a free-text label.

## 3. Files added / updated

- `src/screens/BoardScreen.jsx` — **new**: board, announcement card, RSVP buttons, coach-view summary, and the create/edit modal form.
- `src/lib/api.js` — added `getAnnouncements`, `createAnnouncement`, `updateAnnouncement`, `deleteAnnouncement`, `setRsvp`.
- `src/ui/kit.jsx` — added `pin` and `trash` icons.
- `src/data/strings.js` — board strings.
- `src/index.css` — `.board-grid` layout + modal styles.
- `src/App.jsx` — `/board` now renders `BoardScreen`.
- `supabase/migrations/0006_board.sql` — schema + seed.

## 4. Supabase schema created (project `drklujgozwpkqszqtvym`)

RLS enabled, demo-open policies (Phase 2 → RBAC):

- **`announcements`** — `id`, `team_id` → teams (cascade), `author_name`, `author_role`, `tag`, `tag_color` (check brand/accent/blue/green/muted), `title`, `body`, `pinned`, `has_rsvp`, `deadline`, `created_at`. Indexed on `team_id`.
- **`announcement_rsvps`** — `id`, `announcement_id` → announcements (cascade), `player_id` → players (cascade), `status` (check in/maybe/out), `updated_at`, unique `(announcement_id, player_id)`. Indexed on `announcement_id`.

Seeded: 3 announcements + 23 squad RSVPs (the match call-up intentionally has no response from the persona, so one card shows the "not yet responded" state).

## 5. Verification performed

- Board renders live on **desktop** (two-column, pinned first) and **mobile** (stacked, bottom nav).
- **RSVP** verified end-to-end: clicking I'm in persisted player #10's row and moved the tally 11 → 12 (confirmed in the DB), then was reverted.
- **Create** verified: a new pinned announcement appeared first and was confirmed in the DB.
- **Edit** verified: the modal prefilled, and saving updated the title live.
- **Delete** verified: the announcement was removed and the list returned to the 3 seeded ones.
- No current console errors. Test rows cleaned up; final state is 3 announcements / 23 RSVPs.

## 6. Note on roles

The app is currently a single "coach" experience (consistent with Screens 1–4): the coach posts/edits/deletes and sees the response summary. RSVP is inherently a player/parent action, so — with no auth yet — the RSVP buttons act as a fixed player persona. Real role separation (players RSVP, coaches manage) comes with auth in Phase 2.

## 7. Project status

**All 5 MVP screens are now implemented on Vite + React + Supabase, responsive (mobile / tablet / desktop), and faithful to the prototype:**
1. Player Performance Profile · 2. Session/Match Evaluation · 3. Match Lineup Builder · 4. My Journey · 5. Announcement & RSVP Board.

Suggested next steps (Phase 2): real authentication + role-based RLS to replace the demo-open policies; the per-role views (player/parent/scout); and the remaining FRD "nice to have" features.

**Please review Screen 5 and approve.**
