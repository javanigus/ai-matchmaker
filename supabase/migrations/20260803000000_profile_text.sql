-- "Profile Text" — the headline bio from prototype/profile.html, never
-- given a real column or spec until now. Lives on users, not
-- profile_categories: it's not one of the 12 tracked categories (no
-- confidence, no quick_fact, no Visibility toggle — it's always public,
-- same as Basics), but it IS AI-proposed/approved like a category, per
-- founder decision and prd.md's existing "Eliminating blank text boxes"
-- principle ("profile bios" was already named there, just never speced).
alter table public.users add column profile_text text;
alter table public.users add column pending_profile_text text;

-- Always-public, so it belongs in the same public view Basics uses.
-- create or replace preserves the existing published_profile_categories
-- view and this view's own existing columns/grants; only appends one.
create or replace view public.published_profiles
  with (security_invoker = false) as
  select id, name, age, gender, location_city, location_state, location_country, occupation, profile_text
  from public.users
  where published_at is not null;

grant select on public.published_profiles to authenticated;
