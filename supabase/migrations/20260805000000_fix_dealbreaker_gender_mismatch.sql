-- Real bug caught while starting Phase 5 (Search hits the same enum
-- question for its own Gender filter): the Gender dealbreaker's option
-- list ("Women"/"Men"/"Non-binary" — natural phrasing for a preference
-- about a partner, matching prototype/profile.html's dealbreaker modal)
-- doesn't match the profile's own Gender field ("Woman"/"Man"/
-- "Non-binary" — singular, matching prototype/profile.html's Basics
-- modal and src/app/profile/basics-form.tsx). The original
-- published_candidates_for compared these directly (`p.gender =
-- v_gender`), which meant "Women" was never equal to "Woman" — any
-- user with a Gender dealbreaker set got zero candidates, silently,
-- ever since Phase 4 shipped. Fixed with an explicit translation
-- before the comparison; every other clause is unchanged from
-- 20260804010000_dealbreaker_filter_function.sql.
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

  -- Translate the dealbreaker's plural phrasing to the profile's own
  -- singular Gender values before comparing (see comment above).
  v_gender := case v_gender
    when 'Women' then 'Woman'
    when 'Men' then 'Man'
    else v_gender
  end;

  return query
  select p.id
  from published_profiles p
  where p.id <> viewer_id
    and (v_age_min is null or p.age >= v_age_min)
    and (v_age_max is null or p.age <= v_age_max)
    and (v_gender is null or p.gender = v_gender)
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
