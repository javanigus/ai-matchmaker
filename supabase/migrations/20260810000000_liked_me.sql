-- "Liked Me" (prototype/matches.html's second tab) — per founder
-- decision (asked directly, not assumed): show people who liked the
-- viewer before they've decided, unlike Phase 8's default of keeping
-- Likes one-directional until mutual. Reading another user's own
-- profile_decisions row is exactly what Phase 7's RLS denies directly
-- (owner-only), so this needs the same security-definer shape as
-- check_and_create_match()/get_target_categories_for_report(): a
-- viewer_id = auth.uid() guard, and it only ever returns *who* liked
-- the viewer, never the liker's own decision row itself (no feedback
-- text, no rating — just the fact of the Like, which is now a
-- deliberately public-to-the-liked-person fact per this decision).
--
-- Excludes anyone already matched — that pair belongs on the Mutual
-- tab, not here, to avoid listing the same person twice across tabs.
create or replace function public.get_users_who_liked_me(viewer_id uuid)
returns table (liker_id uuid, liked_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if viewer_id is distinct from auth.uid() then
    raise exception 'not authorized';
  end if;

  return query
  select pd.user_id, pd.created_at
  from public.profile_decisions pd
  where pd.target_user_id = viewer_id
    and pd.decision = 'like'
    and not exists (
      select 1 from public.matches m
      where (m.user_a_id = viewer_id and m.user_b_id = pd.user_id)
         or (m.user_a_id = pd.user_id and m.user_b_id = viewer_id)
    );
end;
$$;

grant execute on function public.get_users_who_liked_me(uuid) to authenticated;
