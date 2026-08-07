-- Phase 8: Matches, Messages, Unmatch, Compatibility Reports.

-- `matches` had RLS enabled since Phase 0 but no policies (deny-by-
-- default, the now-familiar pattern). Read access for either
-- participant; delete for either participant is literally what Unmatch
-- is — prd.md: "Either person can unmatch, one-sided... immediate and
-- mutual — the conversation and the match disappear from both
-- people's Messages and Matches." No insert/update policy: a client
-- never creates a match directly, only check_and_create_match() does
-- (below), running as security definer.
create policy "participants can view their own matches"
  on public.matches for select
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

create policy "participants can delete (unmatch) their own matches"
  on public.matches for delete
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

-- Real schema gap caught while starting this phase: neither prd.md nor
-- technical-plan.md ever specified a table for real user-to-user
-- messages — the existing `conversations`/`messages` tables are
-- shaped for the AI Matchmaker chat (one real user + the AI, a fixed
-- role enum of 'user'/'assistant'), not two real people. Reusing them
-- would mean bolting peer-to-peer semantics onto a table that already
-- means something else. A dedicated table instead, on delete cascade
-- from `matches` — Unmatch deleting the match row is what makes the
-- whole conversation disappear for both sides (prd.md's own wording),
-- with no separate deletion step needed.
create table public.match_messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  sender_id uuid not null references public.users (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.match_messages enable row level security;

create policy "participants can view messages in their own matches"
  on public.match_messages for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and (auth.uid() = m.user_a_id or auth.uid() = m.user_b_id)
    )
  );

create policy "participants can send messages in their own matches"
  on public.match_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id and (auth.uid() = m.user_a_id or auth.uid() = m.user_b_id)
    )
  );

-- Mutual-like detection. One-way anonymity on Pass/Like (Phase 7's own
-- RLS: a user can only ever read their own profile_decisions rows) is
-- exactly why this can't be a plain client-side query — checking
-- "did they already like me too" means reading someone else's
-- decision, which RLS correctly denies directly. security definer
-- bypasses that internally, but only ever to decide pass/fail on
-- creating a match; it never returns the other person's decision data
-- itself. Same viewer_id-must-equal-auth.uid() guard as Phase 4's
-- published_candidates_for(), for the same reason: without it, any
-- caller could pass someone else's id and probe whether a match should
-- exist for them, indirectly leaking who liked whom.
create or replace function public.check_and_create_match(viewer_id uuid, target_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match_id uuid;
  v_user_a uuid;
  v_user_b uuid;
begin
  if viewer_id is distinct from auth.uid() then
    raise exception 'not authorized';
  end if;

  if not exists (
    select 1 from public.profile_decisions
    where user_id = target_id and target_user_id = viewer_id and decision = 'like'
  ) then
    return null;
  end if;

  -- matches.user_a_id < user_b_id is an existing check constraint —
  -- one canonical row per pair regardless of who liked whom first.
  if viewer_id < target_id then
    v_user_a := viewer_id;
    v_user_b := target_id;
  else
    v_user_a := target_id;
    v_user_b := viewer_id;
  end if;

  insert into public.matches (user_a_id, user_b_id)
  values (v_user_a, v_user_b)
  on conflict (user_a_id, user_b_id) do nothing
  returning id into v_match_id;

  if v_match_id is null then
    select id into v_match_id from public.matches where user_a_id = v_user_a and user_b_id = v_user_b;
  end if;

  return v_match_id;
end;
$$;

grant execute on function public.check_and_create_match(uuid, uuid) to authenticated;

-- `compatibility_reports` had RLS enabled since Phase 0, no policies
-- yet either. Owner-only — a report is private to whoever generated
-- it (prd.md never says the target sees "how compatible you think you
-- are with them"), same reasoning as profile_decisions staying private
-- to the decider.
create policy "users can view own compatibility reports"
  on public.compatibility_reports for select
  using (auth.uid() = user_id);

create policy "users can insert own compatibility reports"
  on public.compatibility_reports for insert
  with check (auth.uid() = user_id);
