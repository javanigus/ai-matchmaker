-- Phase 6: ongoing (post-baseline) chat needs two things the onboarding-only
-- schema didn't: telling an onboarding conversation apart from an ordinary
-- one (so onboarding/page.tsx's "most recent conversation" query can't
-- accidentally pick up an ordinary chat thread, and vice versa), and a way
-- to know a session has already been through session-close extraction so
-- it's never processed twice.
alter table public.conversations
  add column kind text not null default 'onboarding' check (kind in ('onboarding', 'ongoing'));
alter table public.conversations
  add column closed_at timestamptz;

-- Durable record of which categories a given AI Memory event touched,
-- independent of whatever happens to those categories' pending drafts
-- afterward (approving one clears profile_categories.pending_source_event_id
-- — see category-card.tsx's approvePending/keepCurrentText — so that
-- column alone can't answer "what did this event originally update" once
-- time has passed). Also what lets an AI Memory entry derive its own
-- Confirmed/AI inferred status (docs/prd.md -> AI Memory): AI inferred
-- while any of these categories still has a live pending draft pointing
-- back at this event's id, Confirmed once none do.
alter table public.ai_memory_events
  add column categories text[] not null default '{}';
