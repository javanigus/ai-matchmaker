-- Drop + recreate match_messages' select/insert policies from
-- 20260809000000_phase8_matches_messages.sql, each gaining a block
-- exclusion. This is real, DB-enforced denial -- a client can't
-- bypass it -- and it's naturally reversible: deleting the blocks row
-- (unblock) immediately re-permits both, no soft-delete bookkeeping
-- needed. Matches prd.md's "hidden not deleted": match_messages rows
-- are never touched here, only reachability changes.
drop policy "participants can view messages in their own matches" on public.match_messages;
drop policy "participants can send messages in their own matches" on public.match_messages;

create policy "participants can view messages in their own matches"
  on public.match_messages for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and (auth.uid() = m.user_a_id or auth.uid() = m.user_b_id)
        and not exists (
          select 1 from public.blocks b
          where (b.blocker_id = m.user_a_id and b.blocked_id = m.user_b_id)
             or (b.blocker_id = m.user_b_id and b.blocked_id = m.user_a_id)
        )
    )
  );

create policy "participants can send messages in their own matches"
  on public.match_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id and (auth.uid() = m.user_a_id or auth.uid() = m.user_b_id)
        and not exists (
          select 1 from public.blocks b
          where (b.blocker_id = m.user_a_id and b.blocked_id = m.user_b_id)
             or (b.blocker_id = m.user_b_id and b.blocked_id = m.user_a_id)
        )
    )
  );
