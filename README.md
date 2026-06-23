# Hoopin

> A specialized digital platform to modernize and streamline the operations of youth sports academies in Lebanon.

Many academies still rely on fragmented tools — paper notebooks, Excel sheets, and WhatsApp groups — for tracking data and communicating. **Hoopin** digitizes this ecosystem with a centralized suite of tools for tracking athletic performance, simplifying evaluations, managing match-day logistics, and connecting coaches, players, and parents.

## Goals

- **Single source of truth** for every player's metrics, skills, and attendance.
- **Fast, mobile-first** data entry built for the pace of the pitch and the court.
- **Role-based, privacy-conscious** access that protects minors' data.
- **Motivation through visibility** — players and parents see concrete evidence of growth.

## User Roles

System Admin · Academy Director · Coach · Player · Parent · Scout

Data visibility is strictly role-based (e.g. players see only their own profiles; coaches see their assigned rosters).

## Delivery Phases

The product is delivered in two phases.

### ✅ MVP (Must Have)

Core foundational features that establish the data structure and deliver daily operational value to coaches.

| # | Feature | Description |
|---|---------|-------------|
| 4.1 | **Centralized Player Performance Profiles** | A digital dashboard storing basic athletic metrics (height, weight, age, position), core skill ratings, and attendance history. |
| 4.2 | **Simplified Session & Match Evaluation Templates** | A mobile-friendly form for coaches to rate players post-session via 1–5 star scales or sliders across technical, tactical, work-rate, and discipline criteria. |
| 4.3 | **Match Lineup Builder & Attendance Tracker** | A drag-and-drop tactical board for standard formations (4-3-3, 4-4-2, …), cross-referencing player availability against weekly attendance. |
| 4.4 | **Player Progress Dashboard & Growth Tracking** | A "My Journey" view for players and parents using trend lines and spider/radar charts to visualize improvement over time. |
| 4.5 | **Internal Academy Announcement & RSVP Board** | A communication hub for schedules, location changes, and call-ups with one-tap RSVP and real-time attendance summaries. |

### ⭐ Phase 2 (Nice to Have)

Advanced features for gamification, nationwide scouting, talent discovery, and community expansion — built once the core user base is established.

| # | Feature | Description |
|---|---------|-------------|
| 4.6 | **"Verified Talent" Scouting Showcase** | An opt-in discovery portal with advanced filters letting scouts find verified, data-backed talent. |
| 4.7 | **"Virtual Combine" Skills Challenges** | Monthly standardized challenges with player submissions, coach verification, and nationwide leaderboards. |
| 4.8 | **Automated Video "Highlight Reel" Generator** | Upload and tag clips that auto-compile into a shareable highlight reel linked to verified stats. |
| 4.9 | **"Pro-Club Proximity" Benchmark** | Gap analysis comparing a player's stats against anonymized First-Division youth academy baselines, adjusted by age and position. |
| 4.10 | **"Hyper-Local Transfer Market" & Loan Simulation** | An internal marketplace and secure messaging for temporary player loans and transfers between academies. |
| 4.11 | **"Grassroots El Clásico" Neutral Scouting Festivals** | Automated matchmaking pairing evenly matched academies for showcase tournaments with QR-coded digital rosters. |

## Non-Functional Considerations

- **Mobile-First Design** — optimized for use on football pitches and basketball courts, especially the coach and player interfaces.
- **Performance** — evaluation and attendance entry must load and submit in under 2 seconds.
- **Localization** — interface supports Arabic, English, and French.
- **Offline Tolerance** — basic caching (e.g. offline evaluation storage) that syncs when connectivity is restored, for unstable 3G/4G regions.
- **Security** — secure storage for video and profile data (e.g. AWS S3 with token access) and strict Role-Based Access Control (RBAC) to protect minors' data.

## Tech stack

- **Frontend:** Vite + React 18, `react-router-dom`. Design tokens and components ported from the original prototype (Sora + Plus Jakarta Sans, green/light theme). Fully responsive — sidebar nav on desktop/large tablet, bottom-tab nav on mobile.
- **Backend:** Supabase (Postgres + RLS).

## Development

```bash
npm install
cp .env.example .env   # then fill in VITE_SUPABASE_ANON_KEY
npm run dev            # http://localhost:5173
```

Environment variables (see `.env.example`):

| Var | Description |
|-----|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable/anon key (safe for the browser) |

Database schema and seed data live in `supabase/migrations/`. Per-screen build notes are in `docs/`.

## Status

Early development, built screen by screen. **Screen 1 (Player Performance Profile)** is live on Supabase — see [`docs/screen-1-report.md`](docs/screen-1-report.md). Scope and acceptance criteria are tracked in the project's Functional Requirements Document (FRD v1.0).

---

© 41sol — All rights reserved.
