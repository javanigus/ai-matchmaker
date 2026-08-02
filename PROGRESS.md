# PROGRESS.md — AI Matchmaker Build Log

> Updated at every checkpoint (or end of session). Read this, plus `git log --oneline -20` and `docs/PLAN.md`'s current phase, at the start of any new session — that's the entire context-reconstruction ritual, no need to re-read the whole codebase.

## Current status

**Phase:** 0 — complete. All three demo criteria met for real: deployed empty-then-real Next.js app; signing up creates a real `users` row (verified via direct signup + a service-role query, not just code review); a test API route proves OpenRouter is reachable.
**Next checkpoint:** Phase 1 — Basics form + gating My Profile behind it (see `docs/PLAN.md`).

**One honest gap:** everything above was verified at the API/backend level (curl against Supabase's Auth REST API, service-role queries) — genuinely proves the trigger, RLS, and OpenRouter mechanisms work. `src/app/signup/page.tsx` itself (the actual React form) has *not* been driven through a real browser yet — it's straightforward state/fetch wiring calling the exact same `supabase.auth.signUp()` already proven working, low risk, but per this project's own verification standard ("anything involving real pixels needs a real browser check"), that specific check is still open. Worth a quick manual click-through before treating the signup *page* (not just the underlying mechanism) as done.

App is live at https://ai-matchmaker-ruddy.vercel.app — first real production deploy succeeded (build output showed `ƒ Proxy (Middleware)`, confirming proxy.ts was picked up in the actual Vercel build, not just local dev; live URL verified responding 200).

## Done

- Full product spec (`docs/prd.md`, `docs/vision.md`, `docs/technical-plan.md`).
- Full static click-through mockup (`prototype/`) — every page, iterated and settled. Treat as the permanent UX reference; don't re-derive copy/layout from memory.
- `docs/PLAN.md` — phase → checkpoint build order.
- GitHub repo created (`javanigus/ai-matchmaker`) and connected to Vercel (project imported, Next.js preset selected).
- Next.js scaffolded at the repo root (App Router, TypeScript, Tailwind v4, ESLint) via `create-next-app`. `src/app/globals.css`'s `@theme` block carries the prototype's accent color palette and serif font choice (confirmed compiled into real CSS custom properties, not just copied text). `package.json` renamed to `ai-matchmaker`. Dev server verified booting locally. `README.md` gained a "Running the app" section.
- Supabase project created (`ai-matchmaker`, "Automatic RLS" enabled at project level). `.env.local`/`.env.example` set up with the new-format key names (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`/`SUPABASE_SERVICE_ROLE_KEY` — Supabase's current naming, replacing legacy anon/service_role terminology).
- `@supabase/supabase-js` + `@supabase/ssr` installed; browser client (`src/lib/supabase/client.ts`) and server client (`src/lib/supabase/server.ts`) written per Supabase's current SSR pattern.
- `src/proxy.ts` — session-refresh only for now (not the full baseline-redirect routing rule yet, since there's nothing real to redirect to/from until Phase 1). **Important:** this is `proxy.ts`/`export function proxy()`, not `middleware.ts`/`middleware()` — Next.js 16 renamed it, and a leftover `middleware.ts` is silently ignored at build time with no error. Verified for real: dev server request timing showed `proxy.ts: 108ms`, confirming Next.js actually picked it up.
- Consolidated schema (`supabase/migrations/20260802000000_initial_schema.sql`) — all 16 tables from `PLAN.md` §2, RLS enabled on every one (deny-by-default; policies deferred to each feature's own phase, not written speculatively here). One schema decision made while writing real SQL that `PLAN.md` had left implicit: `users.id` references `auth.users(id)` directly (standard Supabase pattern). Pushed and verified via `supabase migration list` (applied on both local and remote). RLS's deny-by-default behavior itself is *not* yet proven (queried `users` anonymously, got `[]`/200 — correct-looking, but the table is also just genuinely empty right now, so this doesn't distinguish "RLS is working" from "there's no data yet"); real proof needs two test accounts, which is exactly Phase 1's own demo criterion — deferring to there rather than overclaiming now.

- Vercel project linked via CLI (`javanigus-projects/ai-matchmaker`). All four runtime env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`) set across Production/Preview/Development (note: `--sensitive` isn't allowed on Development — Vercel only supports it for Production/Preview, so Development's copies are stored as regular encrypted values instead). `SUPABASE_DB_URL`/`SUPABASE_DB_PASSWORD`/`SUPABASE_ACCESS_TOKEN` deliberately *not* added to Vercel — they're local-CLI-only, never needed by the deployed app.
- OpenRouter round-trip confirmed for real (`src/app/api/test-openrouter/route.ts` → `{"ok":true,"model":"openai/gpt-4o-mini","reply":"pong"}`). Root cause of the earlier `401 User not found` was a stale, unrelated `OPENROUTER_API_KEY` set as a Windows user-level environment variable on this machine (unknown origin, predates this project) — real OS env vars always take precedence over `.env.local` in Next.js. Removed from the registry; required a full VS Code/Claude Code restart to actually take effect, since registry changes don't propagate to already-running process trees. Worth remembering for future debugging on this machine if an env var ever seems to have a value it shouldn't. Temporary debug diagnostics added during the investigation have been removed from the route.
- Supabase Auth wired: `src/app/signup/page.tsx` (Name/Email/Password, matching `prototype/signup.html` — visual polish and the mockup's Google OAuth option deliberately deferred, not needed to prove the mechanism) calling `supabase.auth.signUp()`. A `handle_new_user()` trigger (`supabase/migrations/20260802010000_auth_trigger.sql`) creates the matching `public.users` row automatically on `auth.users` insert — also fixed a real gap caught while writing this migration: `name` was missing from the schema entirely, even though `prd.md` lists it as a Required Field. Verified genuinely end to end: signed up a real test account via the Auth REST API directly, confirmed the trigger created a `public.users` row with the correct `name` via a service-role query, confirmed anonymous access to that row is genuinely denied (not just "table is empty" — there was real data this time), then deleted the test account and confirmed the FK cascade cleaned up the `public.users` row too. Nothing orphaned.

## Left

Everything in `docs/PLAN.md` Phases 1 through 10, starting with Phase 1 (Basics form + gating My Profile).

## Deviations from the plan

None yet.

## Known open bugs

None yet — no real code exists.

## Open decisions not yet made

- Transactional email provider: Supabase's built-in SMTP (default, start here) vs. adding Resend later.
- Photo moderation provider (`prd.md` → Trust & Safety, still an open question there too) — needs a decision by Phase 9.
- What account deletion actually cascades (Phase 10) — decide and document when that checkpoint is reached, not before it's needed.
