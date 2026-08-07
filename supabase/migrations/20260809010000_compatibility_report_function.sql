-- Compatibility Reports (prd.md): "Matching always reasons over
-- everything the AI knows regardless of what a user has chosen to make
-- visible to others" — a deliberate product decision, not an oversight,
-- so this reasons over the target's full approved category data
-- (ai_summary, quick_fact), not just what's marked Visible on their
-- public profile. profile_categories RLS is owner-only, so reading
-- someone else's full category data needs a security-definer function,
-- same pattern as published_candidates_for() (Phase 4) and
-- check_and_create_match() (this phase) — viewer_id must equal
-- auth.uid(), and the target must actually be published (published_at
-- not null), so this can't be used to pull private data for someone
-- who was never public in the first place.
--
-- The caller's own category data doesn't need this — a normal RLS-
-- scoped `select ... where user_id = auth.uid()` already works, since
-- reading your own row was always allowed.
create or replace function public.get_target_categories_for_report(viewer_id uuid, target_id uuid)
returns table (category text, ai_summary text, quick_fact text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if viewer_id is distinct from auth.uid() then
    raise exception 'not authorized';
  end if;

  if not exists (select 1 from public.users where id = target_id and published_at is not null) then
    raise exception 'target is not published';
  end if;

  return query
  select pc.category, pc.ai_summary, pc.quick_fact
  from public.profile_categories pc
  where pc.user_id = target_id and pc.ai_summary is not null;
end;
$$;

grant execute on function public.get_target_categories_for_report(uuid, uuid) to authenticated;
