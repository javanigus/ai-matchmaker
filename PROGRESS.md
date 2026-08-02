# PROGRESS.md — AI Matchmaker Build Log

> Updated at every checkpoint (or end of session). Read this, plus `git log --oneline -20` and `docs/PLAN.md`'s current phase, at the start of any new session — that's the entire context-reconstruction ritual, no need to re-read the whole codebase.

## Current status

**Phase:** 0 — project setup, in progress.
**Next checkpoint:** create the Supabase project and an OpenRouter API key (both need the founder to sign up/click through — see below), push the consolidated schema via the Supabase CLI, wire Supabase Auth, confirm an OpenRouter round-trip from a test API route, then deploy to Vercel.

## Done

- Full product spec (`docs/prd.md`, `docs/vision.md`, `docs/technical-plan.md`).
- Full static click-through mockup (`prototype/`) — every page, iterated and settled. Treat as the permanent UX reference; don't re-derive copy/layout from memory.
- `docs/PLAN.md` — phase → checkpoint build order.
- GitHub repo created (`javanigus/ai-matchmaker`) and connected to Vercel (project imported, Next.js preset selected, no successful deploy yet — expected, there was no app to build until now).
- Next.js scaffolded at the repo root (App Router, TypeScript, Tailwind v4, ESLint) via `create-next-app`. `src/app/globals.css`'s `@theme` block carries the prototype's accent color palette and serif font choice (confirmed compiled into real CSS custom properties, not just copied text). `package.json` renamed from the scaffold default to `ai-matchmaker`. Dev server verified booting and responding 200 on a real local run.
- `README.md` gained a "Running the app" section.

## Left

Rest of Phase 0 (Supabase project + schema push + Auth, OpenRouter key + round-trip test, first real Vercel deploy), then everything in `docs/PLAN.md` Phases 1 through 10.

## Deviations from the plan

None yet.

## Known open bugs

None yet — no real code exists.

## Open decisions not yet made

- Transactional email provider: Supabase's built-in SMTP (default, start here) vs. adding Resend later.
- Photo moderation provider (`prd.md` → Trust & Safety, still an open question there too) — needs a decision by Phase 9.
- What account deletion actually cascades (Phase 10) — decide and document when that checkpoint is reached, not before it's needed.
