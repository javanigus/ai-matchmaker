-- Fixes a gap in the initial schema: prd.md lists Name as one of the five
-- Required Fields, but the consolidated schema never actually added a
-- name column to public.users.
alter table public.users add column name text;

-- Standard Supabase pattern: a public.users row is created automatically
-- whenever a new auth.users row is created, rather than relying on
-- application code to remember to do it. security definer so it can
-- write to public.users regardless of the (currently policy-less) RLS
-- on that table.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
