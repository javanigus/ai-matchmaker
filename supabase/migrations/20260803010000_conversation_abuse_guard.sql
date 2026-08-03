-- Per founder request: guard against a chat session that never makes
-- real progress (gibberish, refusal to answer, spam) — track consecutive
-- turns where extraction genuinely found nothing, per conversation, and
-- stop engaging once it crosses a threshold rather than keep spending
-- API calls on an unproductive session.
alter table public.conversations add column no_progress_streak int not null default 0;
