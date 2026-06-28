-- US-16 (#58): invite-only provisioning lifecycle — the "first login flips the
-- membership to active" half. The invite itself (creating the auth user + email)
-- is done by the invite-user Edge Function; handle_new_user (#52) already mirrors
-- the profile into public.users.
--
-- When GoTrue sets email_confirmed_at (the user clicked the set-password link and
-- established a password), promote any 'invited' memberships for that user to
-- 'active'.

create or replace function public.handle_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.academy_memberships
       set status = 'active'
     where user_id = new.id
       and status = 'invited';
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.handle_email_confirmed();

-- Trigger function: not meant to be callable via the API.
revoke execute on function public.handle_email_confirmed() from anon, authenticated, public;
