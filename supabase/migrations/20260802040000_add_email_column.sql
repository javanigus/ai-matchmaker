-- Email lives canonically in auth.users, but that table isn't reachable
-- through the normal app queries (Postgres' auth schema isn't exposed via
-- the REST API), so it's copied here for things like a future Settings
-- page. Kept in sync on signup only for now — a change to someone's email
-- later wouldn't propagate here; that's a deferred concern, not something
-- Phase 1 needs (no account-settings/email-change flow exists yet).
alter table public.users add column email text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  return new;
end;
$$;
