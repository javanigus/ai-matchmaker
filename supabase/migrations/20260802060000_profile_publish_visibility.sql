-- Phase 3: two things.
--
-- 1. ai_memory_events had RLS enabled (initial schema) but no policies at
-- all, so the consolidated-paragraph insert added in the chat route this
-- phase would otherwise be silently denied under the user's own session.
create policy "users can view own memory events"
  on public.ai_memory_events for select
  using (auth.uid() = user_id);

create policy "users can insert own memory events"
  on public.ai_memory_events for insert
  with check (auth.uid() = user_id);

-- 2. docs/PLAN.md's data model section is explicit: "a user's
-- profile_categories/Basics ... are readable by others only once
-- published_at is set, and only the fields visible = true covers." A
-- normal RLS policy can't do this alone — RLS is row-level, and the
-- users table also holds columns that must never be exposed to other
-- users regardless of publish state (email, baseline_reached_at). So
-- this uses the standard Postgres pattern instead: a view owned by the
-- migration role (not security_invoker), which runs with the owner's
-- privileges and therefore bypasses the base tables' owner-only RLS
-- entirely — safety comes from the view's own column list and WHERE
-- clause, not from the underlying table's policy. Grant select only to
-- authenticated, never anon.
create view public.published_profiles
  with (security_invoker = false) as
  select id, name, age, gender, location_city, location_state, location_country, occupation
  from public.users
  where published_at is not null;

grant select on public.published_profiles to authenticated;

create view public.published_profile_categories
  with (security_invoker = false) as
  select pc.user_id, pc.category, pc.ai_summary, pc.confidence, pc.quick_fact
  from public.profile_categories pc
  join public.users u on u.id = pc.user_id
  where pc.visible = true
    and u.published_at is not null;

grant select on public.published_profile_categories to authenticated;
