-- Raw chat messages (the AI Matchmaker conversation table, NOT
-- match_messages) are working material for producing durable
-- structured understanding (My Profile categories, AI Memory), not a
-- permanent transcript -- deleted 30 days after they're sent, for
-- every user, one uniform rule (prd.md, technical-plan.md). pg_cron
-- chosen over a Vercel Cron + Route Handler: zero new moving parts
-- (no vercel.json, no new endpoint, no shared secret to manage) for
-- what's genuinely just a single DELETE statement -- fits this
-- project's own "no infra beyond what's proven necessary" principle
-- exactly. Debuggable via `select * from cron.job_run_details`.
create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'retention-messages-30d',
  '0 3 * * *',
  $$ delete from public.messages where created_at < now() - interval '30 days' $$
);
