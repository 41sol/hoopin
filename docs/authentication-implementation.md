Hoopin Authentication — Supabase Implementation Guide
=====================================================

This is the concrete, provider-specific companion to
`authentication-architecture.md` (the IdP-agnostic blueprint). The chosen IdP is
**Supabase Auth (GoTrue)**. Where Supabase differs from the generic blueprint,
the deviation is called out explicitly. Section numbers are referenced from the
GitHub issues (#52–#58).

1. System topology with Supabase
--------------------------------

The blueprint's four tiers collapse because Supabase provides identity, JWT
validation, and the database as one platform:

| Blueprint tier            | Supabase realization |
|---------------------------|----------------------|
| 1. Client (Web App)       | React + `@supabase/supabase-js`; in-app `/login` (§2) |
| 2. Identity Provider      | Supabase Auth (GoTrue), email/password, sign-up disabled |
| 3. Application Backend / PEP | **No Express/JWKS tier.** PEP = Postgres RLS + helper functions; privileged ops = Edge Functions (§1.4) |
| 4. Core Relational DB     | Postgres (`public.*`), the source of truth for tenancy (#52) |

### 1.4 Where the Policy Enforcement Point lives

JWT signature/expiry validation happens inside Supabase + PostgREST on every
request — there is no `jwks-rsa` middleware to write. The §6 guard levels are
implemented as three `security definer` SQL helpers (migration `0016`):

- **Level 1 — academy:** `is_academy_member(p_academy)`
- **Level 2 — role:** `has_academy_role(p_academy, p_roles)`
- **Level 3 — team:** `can_access_team(p_team)` (admin/scout bypass; coach/player
  confined to `team_assignments`)

These are consumed by the RLS policies (#57) and mirrored for privileged Edge
Functions by `supabase/functions/_shared/auth.ts` (`getCaller`, `callerHasRole`).

2. Client tier (#53, #55)
-------------------------

### 2.1 Login

Supabase has no hosted Universal Login. We own a small `/login` route that calls
`supabase.auth.signInWithPassword({ email, password })`. Session state and the
`signIn` / `signOut` API live in `src/state/auth.jsx`, which subscribes to
`supabase.auth.onAuthStateChange`. `ProtectedRoute` in `src/App.jsx` redirects
unauthenticated users to `/login`.

### 2.4 Multi-tenant routing

Routes are nested under `/:academy_slug` (e.g. `/default/squad`). The slug is
resolved to `academies.id`; the app verifies the caller holds an **active**
membership before rendering, otherwise it shows an access-denied state. RLS is
the real boundary — the UI check is convenience only.

> **Deviation from blueprint §5:** Supabase has no "organization" parameter at
> login. Tenant context is applied **post-login**: the active academy is stored
> in `auth.users.app_metadata.active_academy_id`; switching calls the
> `set-active-academy` Edge Function and then `supabase.auth.refreshSession()` so
> the next JWT carries the new claim.

3. Identity, claims & provisioning
----------------------------------

### 3.1 Invite-only provisioning (#58)

Self-registration is disabled (`enable_signup = false`). The `invite-user` Edge
Function (service role, guarded to `admin`/`coach`) calls
`auth.admin.inviteUserByEmail`, which creates the `auth.users` row and sends the
set-password email in one step. The membership (`status = 'invited'`) and team
assignments are inserted **after**, keyed on the returned `user.id`.

> **Ordering deviation from blueprint §3:** the blueprint inserts the membership
> before creating the IdP user; Supabase creates the user first and returns its
> id, so membership insert follows.

A trigger on `auth.users` flips matching memberships `invited -> active` on first
login (when `email_confirmed_at` becomes non-null). `handle_new_user` (#52)
mirrors the profile into `public.users`.

### 3.2 Custom claims (#54)

A `custom_access_token_hook(event jsonb)` Postgres function, registered under
`[auth.hook.custom_access_token]`, promotes **only** `active_academy_id` into the
JWT (from `app_metadata`, falling back to the first active membership).

> **Deviation from blueprint §4:** `roles` and `teams` are intentionally NOT
> inlined into the token — for multi-team users that bloats it. They are resolved
> per-query inside RLS from the tables. Read the academy claim in SQL via
> `auth.jwt() ->> 'active_academy_id'`.

### 3.4 RLS policies (#57)

The `demo_all_*` policies are dropped and replaced by policies that call the
Level 1–3 helpers. Team-scoped tables use `can_access_team(team_id)`;
academy-scoped tables use `is_academy_member(academy_id)`; identity tables are
self-/membership-scoped. `WITH CHECK` blocks cross-tenant writes.

4. Environment & configuration
------------------------------

Client (`.env`, Vite — safe for the browser):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Edge Functions (set as function secrets, NEVER shipped to the browser):

```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Auth config (`supabase/config.toml` / Dashboard → Authentication):

- `enable_signup = false`
- `[auth.hook.custom_access_token]` enabled, pointing at the Postgres function
- `additional_redirect_urls` restricted to known app origins (invite links)
- custom SMTP configured in production for invite deliverability

5. Data-access approach (resolves #56 AC)
-----------------------------------------

- **Normal reads/writes:** the browser keeps calling Supabase directly with the
  **anon key**, now constrained by RLS. A valid session upgrades the request role
  to `authenticated`; the policies do the rest. No bespoke API server.
- **Privileged / cross-tenant ops:** go through Edge Functions using the
  service-role key (`invite-user`, `set-active-academy`). Each verifies the
  caller JWT (`getCaller`) and enforces a membership/role check (`callerHasRole`)
  before acting, because the service role bypasses RLS.
