# PROGRESS.md — AI Matchmaker Build Log

> Updated at every checkpoint (or end of session). Read this, plus `git log --oneline -20` and `docs/PLAN.md`'s current phase, at the start of any new session — that's the entire context-reconstruction ritual, no need to re-read the whole codebase.

## Current status

**Phase:** Not started — `docs/PLAN.md` is written, real build hasn't begun yet.
**Next checkpoint:** Phase 0 — project setup (scaffold Next.js + Tailwind, create Supabase project, push consolidated schema, wire Supabase Auth, confirm OpenRouter round-trips, deploy empty skeleton to Vercel).

## Done

- Full product spec (`docs/prd.md`, `docs/vision.md`, `docs/technical-plan.md`).
- Full static click-through mockup (`prototype/`) — every page, iterated and settled. Treat as the permanent UX reference; don't re-derive copy/layout from memory.
- `docs/PLAN.md` — phase → checkpoint build order.

## Left

Everything in `docs/PLAN.md` — Phases 0 through 10.

## Deviations from the plan

None yet.

## Known open bugs

None yet — no real code exists.

## Open decisions not yet made

- Transactional email provider: Supabase's built-in SMTP (default, start here) vs. adding Resend later.
- Photo moderation provider (`prd.md` → Trust & Safety, still an open question there too) — needs a decision by Phase 9.
- What account deletion actually cascades (Phase 10) — decide and document when that checkpoint is reached, not before it's needed.
