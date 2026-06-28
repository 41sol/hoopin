-- US-12 (#54): Custom Access Token Hook.
--
-- Enriches every issued JWT with the caller's active academy so RLS can read it
-- via `auth.jwt() ->> 'active_academy_id'` without a per-request round trip.
--
-- Deviation from blueprint §4: only `active_academy_id` is promoted into the
-- token. `roles` and `teams` are deliberately NOT inlined (they bloat the token
-- for multi-team users); they are resolved per-query inside RLS from the tables.
--
-- The hook is invoked by GoTrue as the `supabase_auth_admin` role, so it is NOT
-- security definer; instead we grant that role the access it needs (execute on
-- the function + a SELECT path to academy_memberships) and revoke execute from
-- everyone else, per the Supabase auth-hook guidance.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  claims   jsonb;
  v_user   uuid;
  v_academy uuid;
begin
  claims := event -> 'claims';
  v_user := (event ->> 'user_id')::uuid;

  -- Prefer the academy pinned in app_metadata (set when switching tenants, #55).
  v_academy := nullif(event #>> '{claims,app_metadata,active_academy_id}', '')::uuid;

  -- Fall back to the user's first active membership.
  if v_academy is null then
    select m.academy_id
      into v_academy
      from public.academy_memberships m
     where m.user_id = v_user
       and m.status = 'active'
     order by m.created_at asc
     limit 1;
  end if;

  if v_academy is not null then
    claims := jsonb_set(claims, '{active_academy_id}', to_jsonb(v_academy::text));
    event := jsonb_set(event, '{claims}', claims);
  end if;

  return event;
end;
$$;

-- Only GoTrue may run the hook.
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- Let the auth admin role read memberships from within the hook.
grant usage on schema public to supabase_auth_admin;
grant select on public.academy_memberships to supabase_auth_admin;
drop policy if exists auth_admin_read_memberships on public.academy_memberships;
create policy auth_admin_read_memberships on public.academy_memberships
  as permissive for select to supabase_auth_admin
  using (true);
