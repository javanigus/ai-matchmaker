-- Phase 1: a user can read and update their own users row (insert is
-- handled by the handle_new_user() trigger, not the client, so no
-- insert policy needed there). user_ethnicities is a list the user
-- manages directly, so it gets full CRUD on their own rows.

create policy "users can view own row"
  on public.users for select
  using (auth.uid() = id);

create policy "users can update own row"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "users can view own ethnicities"
  on public.user_ethnicities for select
  using (auth.uid() = user_id);

create policy "users can insert own ethnicities"
  on public.user_ethnicities for insert
  with check (auth.uid() = user_id);

create policy "users can delete own ethnicities"
  on public.user_ethnicities for delete
  using (auth.uid() = user_id);
