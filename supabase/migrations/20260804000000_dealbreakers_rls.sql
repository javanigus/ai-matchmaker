-- Phase 4: dealbreakers_structured and dealbreakers_custom had RLS
-- enabled since the initial schema but no policies at all (deny-by-
-- default, per PLAN.md's "policies deferred to each feature's own
-- phase" note) — owner-only full CRUD, same pattern as every other
-- user-owned table in this app.
create policy "users can view own structured dealbreakers"
  on public.dealbreakers_structured for select
  using (auth.uid() = user_id);

create policy "users can insert own structured dealbreakers"
  on public.dealbreakers_structured for insert
  with check (auth.uid() = user_id);

create policy "users can update own structured dealbreakers"
  on public.dealbreakers_structured for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete own structured dealbreakers"
  on public.dealbreakers_structured for delete
  using (auth.uid() = user_id);

create policy "users can view own custom dealbreakers"
  on public.dealbreakers_custom for select
  using (auth.uid() = user_id);

create policy "users can insert own custom dealbreakers"
  on public.dealbreakers_custom for insert
  with check (auth.uid() = user_id);

create policy "users can delete own custom dealbreakers"
  on public.dealbreakers_custom for delete
  using (auth.uid() = user_id);
