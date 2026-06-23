# Screen 2 — Session/Match Evaluation Form

Status: **implemented & verified against Supabase.** Branch: `feat/evaluate-screen2` (off `main`, which has Screen 1).

## 1. What changed

- Built the **Evaluation form** (`/evaluate`), replacing the placeholder, faithful to the prototype: player selector, session context, 4 criteria with star ratings, coach notes, progress bar, and an animated success state.
- **Wired to Supabase** (writes): submitting creates an `evaluations` row + 4 `evaluation_scores` rows.
- Reuses the squad data already loaded by `SquadProvider` for the player picker, and the same design tokens / UI kit as Screen 1.

## 2. Decisions implemented (from your answers)

1. **Rating control:** 1–5 **stars** in the UI, but stored on a **0–100 scale** (★ × 20) so we can swap controls later without a migration.
2. **Submit effect:** evaluations are **standalone records**, normalized (one score row per criterion) so **Screen 4 (My Journey)** can aggregate radar + trend from them later. Submitting does **not** change Screen 1 skills.
3. **Context:** each evaluation captures **date** (defaults to today), **type** (Training / Match), and an **opponent** (shown for Match).
4. **Layout:** **centered single column** (max-width 640) on all sizes — faithful to the prototype.

Secondary defaults applied: criteria stored in an `eval_criteria` table; generic coach (`"Coach Walid"`); **submit-only** (no history/edit yet); all 4 ratings required to submit, note optional.

## 3. Files added / updated

- `src/screens/EvaluateScreen.jsx` — **new**, the full form + success state.
- `src/App.jsx` — `/evaluate` now renders `EvaluateScreen` (was a placeholder).
- `src/ui/kit.jsx` — added `StarRating`, `Segmented`, shared `primaryBtn`, and `flame`/`calendar` icons.
- `src/lib/api.js` — added `getEvalCriteria()` and `createEvaluation()`.
- `src/data/strings.js` — evaluation strings.
- `src/index.css` — `hp-pop` success animation + range-slider styles (for a future slider option).
- `supabase/migrations/0003_evaluations.sql` — schema + criteria seed (committed for reproducibility).

## 4. Supabase schema created (project `drklujgozwpkqszqtvym`)

RLS enabled, demo-open policies (Phase 2 → RBAC):

- **`eval_criteria`** — `id`, `key` (unique), `label`, `icon`, `sport`, `sort_order`. Seeded with the 4 football criteria: Technical Skill, Tactical Awareness, Work Rate, Discipline & Attitude.
- **`evaluations`** — `id`, `player_id` → players (cascade), `team_id` → teams (set null), `coach_name`, `eval_date` (default today), `eval_type` (check training/match), `opponent`, `note`, `created_at`. Indexed on `player_id` and `eval_date`.
- **`evaluation_scores`** — `id`, `evaluation_id` → evaluations (cascade), `criterion_id` → eval_criteria, `value` (0–100), unique `(evaluation_id, criterion_id)`. Indexed on `evaluation_id`.

No row seed for evaluations (they're created by coaches). The 4 criteria rows are seeded.

## 5. Verification performed

- Form renders live (criteria from DB), desktop (centered, sidebar) and mobile (bottom nav).
- Full submission (Ziad Daher, Match vs Sagesse, 4★ across the board, with a note) **persisted correctly**: 1 evaluation + 4 scores at value 80 (★×20). Success screen shown, no console errors. The test row was then deleted to keep the DB clean.

## 6. Assumptions / notes

1. **No auth** — evaluations recorded under `"Coach Walid"`. Real coach identity comes with auth in Phase 2.
2. **Submit-only** for MVP — no list/edit of past evaluations on this screen (a history view fits naturally with Screen 4).
3. Evaluation **criteria** (technical/tactical/workrate/discipline) are deliberately separate from Screen 1 **skills** (passing/shooting/dribbling/stamina). Technical/Tactical overlap with Screen 4's radar metrics, which is why scores are normalized per criterion.

## 7. Before Screen 3 (Match Lineup Builder)

Nothing blocking to review Screen 2. When ready for **Screen 3**, I'll run discovery and ask about: formations to support, drag-and-drop rules (web + touch), how availability/attendance gates selection, substitutes, saving lineups (and whether a lineup ties to a match/session), and the responsive behavior of the pitch on large screens.

**Please review Screen 2 and approve before I move on.**
