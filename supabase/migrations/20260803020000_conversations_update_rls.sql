-- Real bug caught via founder testing: the abuse-guard streak update in
-- chat/route.ts (no_progress_streak) was silently failing on every
-- single turn — conversations only ever got a select/insert policy in
-- Phase 2 (20260802050000_onboarding_rls.sql), never an update one, and
-- a service-role-less client update against a denying RLS policy fails
-- quietly (0 rows affected, no thrown error) unless the response is
-- explicitly checked. Same class of silent-Supabase-failure bug as
-- Phase 2's short_summary/ai_summary column mismatch.
create policy "users can update own conversations"
  on public.conversations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
