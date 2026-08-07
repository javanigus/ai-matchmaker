-- Phase 7 (Match Browsing & Feedback): profile_decisions and
-- saved_profiles had RLS enabled since the initial schema but no
-- policies at all (deny-by-default, same pattern every table follows
-- until its own phase adds real policies) — owner-only full CRUD, same
-- shape as every other user-owned table in this app. Neither table
-- gets a policy letting the *target* user read rows about themselves —
-- prd.md's "Match Browsing & Feedback" section assumes one-way
-- anonymity on Pass/Like until a mutual Like creates a match (Phase 8),
-- so a decision or save about someone is only ever visible to the
-- person who made it.
create policy "users can view own profile decisions"
  on public.profile_decisions for select
  using (auth.uid() = user_id);

create policy "users can insert own profile decisions"
  on public.profile_decisions for insert
  with check (auth.uid() = user_id);

create policy "users can update own profile decisions"
  on public.profile_decisions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete own profile decisions"
  on public.profile_decisions for delete
  using (auth.uid() = user_id);

create policy "users can view own saved profiles"
  on public.saved_profiles for select
  using (auth.uid() = user_id);

create policy "users can insert own saved profiles"
  on public.saved_profiles for insert
  with check (auth.uid() = user_id);

create policy "users can delete own saved profiles"
  on public.saved_profiles for delete
  using (auth.uid() = user_id);

-- Real gap caught while wiring up the Decision feedback rules
-- (prd.md -> Match Browsing & Feedback -> "Decision feedback rules"):
-- the rule depends on tracing a saved-then-decided profile back to the
-- *specific* recommendation that originally surfaced it, but
-- saved_profiles only ever recorded `source` (a bare "recommendation"
-- vs "search" label), never the actual recommendation_id — so by the
-- time someone decides on something they saved days ago, the id
-- needed to satisfy "required once per recommendation_id" would
-- already be gone. Storing it directly on the save preserves it.
alter table public.saved_profiles
  add column recommendation_id uuid;

alter table public.saved_profiles
  add constraint saved_profiles_source_check check (source in ('recommendation', 'search'));
