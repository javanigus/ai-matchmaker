-- blocks had RLS enabled since Phase 0 with no policies. Unlike Liked
-- Me (anonymous until mutual), a block relationship is bilateral and
-- both parties are already known participants once the row exists --
-- same reasoning already applied to matches' own SELECT policy
-- (auth.uid() in (user_a_id, user_b_id)), so no security-definer
-- function is needed here.
create policy "participants can read a block between them"
  on public.blocks for select
  using (auth.uid() in (blocker_id, blocked_id));

-- Only the blocker creates the block (and can't block themself).
create policy "a user can block someone as themself"
  on public.blocks for insert
  with check (auth.uid() = blocker_id and blocker_id <> blocked_id);

-- Only the blocker unblocks -- matches prd.md's "reviewed and
-- unblocked from Settings", implicitly blocker-only management.
create policy "a user can remove their own outgoing block"
  on public.blocks for delete
  using (auth.uid() = blocker_id);
