-- Third revision of published_candidates_for, same pattern as
-- 20260805000000's gender-mismatch fix: identical body, one added
-- clause. Recommendations is the only page that actually routes
-- through this RPC (Search queries published_profiles directly), so
-- this is where Block's "excluded from AI Recommendations" guarantee
-- (prd.md) is enforced at the RPC/RLS layer -- a client bug can't
-- leak a blocked user through here.
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
    )
    and not exists (
      select 1 from blocks b
      where (b.blocker_id = viewer_id and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = viewer_id)
    );
end;
$$;
