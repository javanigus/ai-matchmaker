-- Phase 6 follow-up: ordinary (post-baseline) chat now follows the same
-- two-step questioning pattern onboarding uses to fill in a missing
-- profile category, per founder request. Onboarding can track "did we
-- already ask the quick-pick question" purely from profile_categories'
-- own confidence columns, because onboarding's extraction is live and
-- per-turn. Ordinary chat's extraction is batched at session-close
-- (technical-plan.md), so that same signal doesn't exist turn-to-turn —
-- profile_categories won't reflect a mid-session answer until the
-- session actually closes. These two columns are real, deterministic
-- conversation-level state instead, matching this app's own established
-- lesson (see profile_categories.pending_source_event_id's history,
-- and onboarding's focusCategory) that letting the model track its own
-- state across turns is unreliable — code tracks it, the model only
-- phrases the question.
alter table public.conversations
  add column active_category text,
  add column active_category_step smallint;
