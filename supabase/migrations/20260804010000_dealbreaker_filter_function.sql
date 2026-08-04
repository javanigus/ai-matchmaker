-- Phase 4: structured dealbreakers become a literal SQL filter, per
-- technical-plan.md ("Structured dealbreakers become a literal SQL
-- WHERE clause, applied before any LLM call"). Distance is deliberately
-- not implemented here — it needs lat/lng, which nothing in this schema
-- captures yet (only city/state/country text); the founder's own
-- decision was to defer it rather than grow Dealbreakers into a
-- geocoding project. The other six (age, gender, religion, ethnicity,
-- children, education) map cleanly to existing columns/quick_facts.
--
-- security definer + reading from published_profiles/
-- published_profile_categories (Phase 3's public-view mechanism) plus
-- user_ethnicities directly: ethnicity isn't in the published view yet
-- (a real gap — prd.md lists it as an always-public Required Field, but
-- Phase 3 never added it there, since nothing needed it until now).
-- Reading the base table here is still safe: this function never
-- returns ethnicity itself, only uses it internally to decide pass/
-- fail, and only for candidates already confirmed published via the
-- published_profiles join.
create or replace function public.published_candidates_for(viewer_id uuid)
returns table (candidate_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_age_min int;
  v_age_max int;
  v_gender text;
  v_children text;
  v_education text;
  v_religions text[];
  v_ethnicities text[];
begin
  -- Real safety gap caught while writing this: granting execute broadly
  -- and trusting the caller to only ever pass their own id would let
  -- anyone probe another user's filtered candidate set (and, from that,
  -- indirectly infer their dealbreakers) just by passing a different
  -- viewer_id. This function never returns dealbreaker values directly,
  -- but the candidate list itself is derived from them, so it still
  -- needs this guard.
  if viewer_id is distinct from auth.uid() then
    raise exception 'not authorized';
  end if;

  select value::int into v_age_min from dealbreakers_structured where user_id = viewer_id and attribute = 'age_min' limit 1;
  select value::int into v_age_max from dealbreakers_structured where user_id = viewer_id and attribute = 'age_max' limit 1;
  select value into v_gender from dealbreakers_structured where user_id = viewer_id and attribute = 'gender' limit 1;
  select value into v_children from dealbreakers_structured where user_id = viewer_id and attribute = 'children' limit 1;
  select value into v_education from dealbreakers_structured where user_id = viewer_id and attribute = 'education_min' limit 1;
  select array_agg(value) into v_religions from dealbreakers_structured where user_id = viewer_id and attribute = 'religion';
  select array_agg(value) into v_ethnicities from dealbreakers_structured where user_id = viewer_id and attribute = 'ethnicity';

  return query
  select p.id
  from published_profiles p
  where p.id <> viewer_id
    and (v_age_min is null or p.age >= v_age_min)
    and (v_age_max is null or p.age <= v_age_max)
    and (v_gender is null or p.gender = v_gender)
    -- "Must want children" is a whitelist on the candidate's own stated
    -- desire; "Must not have children" excludes anyone who already has
    -- them (a different question from whether they want more) — the two
    -- options aren't opposites of the same check, so they're handled as
    -- genuinely separate conditions, not a single equality flip.
    and (
      v_children is null
      or (v_children = 'Must want children' and exists (
        select 1 from published_profile_categories pc
        where pc.user_id = p.id and pc.category = 'family' and pc.quick_fact = 'Wants children'
      ))
      or (v_children = 'Must not have children' and exists (
        select 1 from published_profile_categories pc
        where pc.user_id = p.id and pc.category = 'family'
          and pc.quick_fact is not null and pc.quick_fact <> 'Has children'
      ))
    )
    and (
      v_education is null
      or (v_education = 'Bachelor''s degree or higher' and exists (
        select 1 from published_profile_categories pc
        where pc.user_id = p.id and pc.category = 'career'
          and pc.quick_fact in ('Bachelor''s degree', 'Master''s degree', 'Doctorate')
      ))
      or (v_education = 'Graduate degree' and exists (
        select 1 from published_profile_categories pc
        where pc.user_id = p.id and pc.category = 'career'
          and pc.quick_fact in ('Master''s degree', 'Doctorate')
      ))
    )
    and (
      v_religions is null or exists (
        select 1 from published_profile_categories pc
        where pc.user_id = p.id and pc.category = 'religion_spirituality'
          and pc.quick_fact = any(v_religions)
      )
    )
    and (
      v_ethnicities is null or exists (
        select 1 from user_ethnicities ue
        where ue.user_id = p.id and ue.ethnicity = any(v_ethnicities)
      )
    );
end;
$$;

-- Callable by any authenticated user — safe because of the auth.uid()
-- guard above, which restricts it to computing a caller's own filtered
-- candidate set, never someone else's.
grant execute on function public.published_candidates_for(uuid) to authenticated;
