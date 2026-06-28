-- Admin dashboard: soft-delete for user accounts.
-- A deactivated user is also banned at the auth layer (auth.admin) by the
-- admin-users Edge Function; this flag mirrors that state for display/queries.
alter table public.users add column if not exists deactivated_at timestamptz;
