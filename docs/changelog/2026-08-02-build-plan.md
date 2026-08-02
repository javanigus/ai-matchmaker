# 2026-08-02 — Added the real-build plan: PLAN.md + PROGRESS.md

## What changed

**`docs/PLAN.md`** (new) and **`PROGRESS.md`** (new, repo root): the checkpointed build roadmap for the real (non-prototype) app, following the same process used to build Renodar — spec first, mock it before touching a real stack, plan as a resumable roadmap committed to the repo, then execute one checkpoint at a time.

`PLAN.md` covers: context (pointing at the already-complete spec docs and `prototype/` as the permanent UX reference), a consolidated data model (pulling together every table already defined piecemeal across `technical-plan.md`, plus designing the ones that weren't specified yet — `photos`, `profile_decisions`, `saved_profiles`, `matches`, `blocks`, `reports`, `compatibility_reports`, `notifications`), an 11-phase build order (Phase 0 setup through Phase 10 Coach/notifications/settings) with a concrete demo/verification target per phase, a verification standard (real Supabase project, two real test accounts wherever permissions matter, honest empty states, DB-level constraints), and the exact three-step ritual for resuming context cold in a new session.

`PROGRESS.md` is the initial template — current phase, done/left, deviations, known bugs, open decisions not yet made (email provider, photo moderation provider) — to be updated at every checkpoint once building starts.

## Why it changed

Founder request, directly modeled on `how-i-built-this-app.md` from the Renodar repo (a workflow retrospective the founder had written after that build) — asked for the same resumable-plan approach here before starting the real build. Unlike Renodar, this project already had steps 1 and 2 of that process done (the spec and the mockups), so this pass focused on turning the existing, already-detailed design into a concrete, checkpointed build order rather than redoing earlier steps.
