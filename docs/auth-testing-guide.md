Hoopin Auth — Local Testing Guide
=================================

Covers how to run the Supabase auth flow (issues #52–#58) locally and exercise
every authentication scenario. The DB migrations and Edge Functions are already
applied to the hosted project `drklujgozwpkqszqtvym`.

Prerequisites
-------------

1. `cp .env.example .env` and fill in:
   ```
   VITE_SUPABASE_URL=https://drklujgozwpkqszqtvym.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon/publishable key from Dashboard → API>
   ```
2. `npm install`
3. `npm run dev` → http://localhost:5173

One-time hosted config (Dashboard)
----------------------------------

These can't be set via SQL/MCP and are the only manual steps:

- **Auth → Hooks → Custom Access Token:** enable, point at
  `public.custom_access_token_hook`. *(Optional for the app to work — it reads the
  active academy from `app_metadata` — but required for the `active_academy_id`
  JWT claim from #54 to appear.)*
- **Auth → Providers → Email:** confirm **"Enable signup" is OFF** (invite-only).
- **Auth → URL Configuration:** add `http://localhost:5173` to redirect allowlist.
- **(Prod)** configure custom SMTP so invite emails send; enable leaked-password
  protection.

Seeded test account
-------------------

A coach already exists on the hosted DB for testing (rotate or delete before any
real use):

| Field | Value |
|-------|-------|
| Email | `coach@hoopin.test` |
| Password | `HoopinCoach123!` |
| Role | `coach` in **Default Academy** (slug `default`) |
| Team | assigned to **Beirut Strikers** |

Scenarios
---------

### 1. Unauthenticated → forced login (#53)
- Visit `http://localhost:5173/` or `/default/squad` while logged out.
- **Expect:** redirect to `/login` (branded, no sign-up link).

### 2. Invalid credentials (#53)
- Submit a wrong email/password.
- **Expect:** stays on `/login`, inline error "Invalid login credentials".

### 3. Successful login + tenant routing (#53, #55)
- Log in as the coach.
- **Expect:** lands on `/default/squad`; the Beirut Strikers roster renders.
- **Behind the scenes:** `set-active-academy` pins `app_metadata.active_academy_id`,
  the session refreshes, and RLS lets the coach read the team.

### 4. RLS enforcement / regression (#57)
- While logged in, the squad, evaluations, lineups, board all load (the coach is
  team-assigned).
- **Negative:** open the browser console and run a session-less read — it returns
  nothing because anon matches no policy:
  ```js
  const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/players?select=id`,
    { headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY } });
  await r.json(); // []  (RLS denies anon)
  ```

### 5. Unknown / unauthorized academy (#55)
- Navigate to `/atletico-madrid/squad`.
- **Expect:** "Access denied" screen (RLS returns no academy row for a
  non-member, so the slug resolves to denied).

### 6. Logout (#53)
- Click the sign-out icon (top-right of the header).
- **Expect:** session cleared, back to `/login`; revisiting a protected route
  redirects to login again.

### 7. Academy switching (#55) — multi-academy users
- The switcher (sidebar `<select>`) only appears when you belong to >1 academy.
- To test: invite/seed a second academy + membership for the coach, then switch —
  the URL changes to `/:slug/squad`, the token re-scopes (`refreshSession`), and
  the squad reloads for the new tenant. No manual logout needed.

### 8. Invite flow (#58)
- As an admin/coach (logged in), call the Edge Function:
  ```js
  const { data, error } = await supabase.functions.invoke('invite-user', {
    body: { email: 'newcoach@example.com', name: 'New Coach',
            academy_id: '<academy uuid>', role: 'coach', team_ids: ['<team uuid>'] }
  });
  ```
- **Expect:** `{ ok: true, user_id, membership_id }`; an `academy_memberships`
  row with `status='invited'`; a set-password email (needs SMTP in prod).
- **Guard checks:** a `player`/`scout` caller → 403; inviting `role:'admin'` as a
  non-admin → 403; re-inviting the same email → idempotent (`reinvited: true`).
- **First login → active:** when the invited user confirms and signs in, the
  trigger flips their membership `invited → active`.

Bootstrapping the first admin (no users yet)
--------------------------------------------

The invite function needs an existing admin/coach, so the first user is seeded
directly. The token text columns MUST be `''` (not NULL) or GoTrue returns
500 "Database error querying schema":

```sql
with new_user as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    phone_change, phone_change_token, email_change_token_current, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'admin@youracademy.com', crypt('ChangeMe123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{"name":"Admin"}'::jsonb,
    '', '', '', '', '', '', '', ''
  ) returning id, email
)
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select id::text, id, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
       'email', now(), now(), now()
from new_user;

-- grant an active admin membership in the default academy
insert into public.academy_memberships (user_id, academy_id, role, status)
select u.id, a.id, 'admin', 'active'
from auth.users u, public.academies a
where u.email = 'admin@youracademy.com' and a.slug = 'default';
```
