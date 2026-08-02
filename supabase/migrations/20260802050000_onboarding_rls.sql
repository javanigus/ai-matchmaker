-- Phase 2: the onboarding chat route runs server-side but acts as the
-- signed-in user (their own session, not the service role) — same
-- pattern as Phase 1's Basics form — so it needs real RLS policies,
-- not a service-role bypass.

create policy "users can view own conversations"
  on public.conversations for select
  using (auth.uid() = user_id);

create policy "users can insert own conversations"
  on public.conversations for insert
  with check (auth.uid() = user_id);

-- messages has no user_id column directly — ownership is via its
-- conversation, so the policy checks through that relationship.
create policy "users can view own messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
        and conversations.user_id = auth.uid()
    )
  );

create policy "users can insert own messages"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
        and conversations.user_id = auth.uid()
    )
  );

-- Full CRUD on their own rows for now. The finer-grained rule (only
-- Phase 3's Approve action should ever write ai_summary/confidence
-- directly, not the client) is enforced by which code paths exist
-- today, not by a column-level restriction — nothing yet calls
-- anything except pending_*/full_summary/quick_fact, so there's no
-- real path to misuse this policy. Worth revisiting if Phase 3's
-- Approve ends up going through a server-only RPC instead.
create policy "users can view own categories"
  on public.profile_categories for select
  using (auth.uid() = user_id);

create policy "users can insert own categories"
  on public.profile_categories for insert
  with check (auth.uid() = user_id);

create policy "users can update own categories"
  on public.profile_categories for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
