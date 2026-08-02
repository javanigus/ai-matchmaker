# PLAN.md — AI Matchmaker Build Plan

> Status: Active build plan
> Companion file: [`PROGRESS.md`](../PROGRESS.md) (repo root) — the running build log, updated every checkpoint.

This plan follows the same process used to build Renodar (see `how-i-built-this-app.md` in that repo): spec first, mock it before touching a real stack, plan as a checkpointed roadmap committed to the repo, then execute one small checkpoint at a time — code, commit, verify against the real backend, fix, repeat. Steps 1 and 2 of that process are already done here — `docs/prd.md`, `docs/vision.md`, and `docs/technical-plan.md` are the spec (more detailed than a typical `AGENT.md`), and `prototype/` is the static HTML/Tailwind mockup, already clicked through and iterated on page by page. This file is step 3 and 4: the stack decision (already made in `technical-plan.md`) turned into a phase → checkpoint build order.

**Sessions on this project are short and intermittent.** The plan is built around that: every checkpoint is sized to be finishable and committable within a session or part of one, never left mid-checkpoint. See "Working Across Sessions" at the bottom for the exact ritual to resume cold.

---

## 1. Context

**What exists already:**
- `docs/prd.md` — accepted product requirements, extremely detailed (My Profile's category model, Dealbreakers, AI Memory, Match Browsing & Feedback including Unmatch, Trust & Safety, Compatibility Reports, Monetization, MVP scope).
- `docs/technical-plan.md` — architecture, onboarding data flow (the two-call extraction model, live vs. batched extraction, failure handling), Dealbreakers' SQL-filter design, routing/retention rules, sequencing.
- `docs/vision.md` — mission, positioning, guiding principles.
- `prototype/` — a full static click-through mockup of every page (no framework, no backend, mock data only). This is the permanent UX reference during the real build, the same way Renodar's `/mockup` folder was — every exact field, badge, category, and edge-case UI (the "Not set — required to publish" Ethnicity state, the pending-update Approve/Edit/Keep-current-text pattern, the Publish validation banner) came out of that stage and shouldn't be re-derived from memory during the real build. When in doubt about exact copy or layout, check `prototype/` first.

**What's explicitly deferred** (see `prd.md` → MVP, "Deliberately out of scope"): AI Profile Coach's bespoke prioritization logic (ship a simple "here are 2-3 gaps" prompt instead), photo "story" analysis sophistication, the full Free/Premium tier build-out, native mobile.

**Stack** (see `technical-plan.md` → Architecture): Next.js (App Router), Tailwind, Supabase (Postgres + Auth + Storage), OpenRouter (LLM access layer, tool-use/structured output), Vercel. Transactional email provider (Supabase's built-in SMTP vs. adding Resend later) is an open first-session decision, not yet made — default to Supabase Auth's built-in email to start, matching "boring, one vendor for as much as possible" until there's a real reason to add a second one.

**Accounts needed before Phase 0:** Supabase project, Vercel project, an OpenRouter API key. That's it to start — no email provider account needed on day one if using Supabase's built-in SMTP.

---

## 2. Data model (consolidated)

`technical-plan.md` defines these piecemeal across several sections; this is the consolidated reference so schema decisions get made deliberately once, not ad hoc per feature. Treat this as the source of truth for Phase 0's migrations — update it in place if a table changes shape during the build, the same way `technical-plan.md` itself gets corrected when reality disagrees with the plan.

**Already fully specified in `technical-plan.md`:**
```
users                (…, age, gender, location_city, location_state, location_country, occupation,
                       baseline_reached_at, published_at)
user_ethnicities     (user_id, ethnicity)
profile_categories   (user_id, category, ai_summary, full_summary, confidence, visible, updated_at,
                       pending_summary, pending_confidence, pending_source_event_id, quick_fact)
dealbreakers_structured (user_id, attribute, value)
dealbreakers_custom  (id, user_id, text, created_at)
conversations        (id, user_id, started_at)
messages             (id, conversation_id, role, content, created_at)
ai_memory_events     (id, user_id, session_id, summary_text, source, created_at)
```

**Not yet specified anywhere — designed here, needed for Phases 4 and 6–9:**
```
photos               (id, user_id, type [learning|profile], storage_path, caption, ai_caption,
                       moderation_status [pending|approved|rejected], position, created_at)
profile_decisions    (id, user_id, target_user_id, decision [pass|like], recommendation_id NULLABLE,
                       feedback_given BOOLEAN, feedback_text, feedback_reasons, created_at)
                       -- recommendation_id NULL means the profile came from manual Search
                       -- (see prd.md → Decision feedback rules: Search never requires feedback)
saved_profiles       (id, user_id, target_user_id, source, created_at)
                       -- Save is explicitly not a decision (prd.md); separate table, not a
                       -- decision variant, so it never gets swept up in decision-feedback logic
matches              (id, user_a_id, user_b_id, matched_at)
                       -- created when profile_decisions shows both directions are 'like';
                       -- deleted on Unmatch (cascades conversation/messages for that pair)
blocks               (id, blocker_id, blocked_id, created_at)
reports              (id, reporter_id, reported_id, reason, details, status, created_at)
compatibility_reports (id, user_id, target_user_id, overall_level, summary_text,
                        category_levels JSONB, generated_at)
                       -- cached on generation, not recomputed on every view — generated
                       -- only on request (prd.md), so avoid re-billing an LLM call per view
notifications        (id, user_id, type, payload JSONB, read_at, created_at)
```

RLS is the default assumption everywhere: a user can read/write their own rows; a user's `profile_categories`/Basics/Dealbreakers are readable by others only once `published_at` is set, and only the fields `visible = true` covers; blocked pairs are excluded from every read path (Search, Recommendations, Matches, messaging) at the RLS level, not just filtered in application code, so a client bug can't leak a blocked user through.

---

## 3. Build order — phases and checkpoints

Each phase lists a **demo** — the concrete thing to actually click through or verify to call it done, matching Renodar's precedent of never leaving "done" ambiguous. Checkpoints inside a phase are commit points; stop at a checkpoint boundary if a session is ending, never mid-checkpoint.

### Phase 0 — Project setup
- Scaffold Next.js + Tailwind (reuse the prototype's accent color palette and serif font choice from `prototype/*.html`'s `tailwind.config`, so the real app matches the mockup instead of drifting).
- Create the Supabase project; push the consolidated schema above via the Supabase CLI (`supabase db push`), not the dashboard SQL editor.
- Wire up Supabase Auth (email/password, matching `prototype/signup.html`'s fields: Name, Email, Password).
- Set up the OpenRouter API key in env; a throwaway script or API route confirming a chat completion round-trips.
- Deploy the empty skeleton to Vercel.
- **Demo:** a deployed, empty Next.js app; signing up creates a real `users` row; a test API route proves OpenRouter is reachable.

### Phase 1 — Basics, and gating My Profile behind it
- Basics form (Age, Gender, Location, Occupation, Ethnicity) matching `prototype/profile.html`'s Basics modal, writing to `users` + `user_ethnicities`.
- Publish button + validation (blocks on any empty required field, matching the mockup's behavior).
- Routing rule from `technical-plan.md` → "Routing before baseline is reached": redirect to onboarding for any profile-dependent page when `baseline_reached_at` is null. (Onboarding conversation itself isn't built yet — Phase 2 — so for now this just proves the redirect logic against a stub.)
- **Demo:** fill in and Publish Basics; attempt Publish with a field missing and see the named validation error; confirm a fresh account visiting My Profile redirects somewhere sane before onboarding exists.

### Phase 2 — Onboarding conversation → category extraction
*This is the hardest technical piece and the milestone `technical-plan.md` explicitly names as proving the rest of the build — do this before anything else depends on it.*
- `conversations`/`messages` tables wired to a real chat UI matching `prototype/onboarding.html`.
- Live turn-by-turn chat completion via OpenRouter (system prompt = matchmaker persona + current profile snapshot).
- Live, per-turn structured-output extraction call: category updates (`pending_summary`/`pending_confidence`/`full_summary`), quick facts, and required fields, per `technical-plan.md`'s schema.
- The four extraction-failure-handling modes (schema-constrained output, retry-then-fallback-model, fabricated-evidence check, no AI-review layer) — build these in from the start, not bolted on after.
- "Building your Compatibility Profile" progress card, wired to the real baseline check (`baseline categories at Medium+, pending or approved, ÷ total baseline categories`).
- `baseline_reached_at` fires once, for real, off this logic.
- **Demo:** have a full onboarding conversation against the real LLM; watch `profile_categories` populate with genuine extracted pending drafts (verify directly in the Supabase table, not just the UI); watch the progress bar reach 100% and confirm `baseline_reached_at` is set.

### Phase 3 — My Profile: review, approve, Publish for real
- Pending-update UI (Approve / Edit / Keep current text) wired to Phase 2's real pending drafts.
- Full summary modal, Visibility toggles, category Edit.
- Quick-fact selects wired to real `quick_fact` values.
- The deferred AI Memory consolidated paragraph, fired once at `baseline_reached_at`.
- Publish, now gated on both required fields *and* the routing rule actually working end to end.
- **Demo:** review and approve/edit the pending drafts from Phase 2's onboarding session; confirm approved text is what's used everywhere else, not the pending draft; Publish; confirm a second test account can now see the published profile and could not before.

### Phase 4 — Dealbreakers
- `dealbreakers_structured` + `dealbreakers_custom` wired to the form in `prototype/profile.html`.
- The SQL `WHERE`-clause filter function `technical-plan.md` describes, provable directly (a query or script showing a candidate with a disqualifying attribute is excluded).
- **Demo:** set structured and custom dealbreakers; run the filter against two seeded test profiles, one that should pass and one that shouldn't; confirm it's actually excluded, not just visually hidden.

### Phase 5 — Search
- Search wired to real published profiles; filters wired to the real structured fields/quick facts (the exact enums already aligned in `prototype/search.html` — reuse them verbatim, don't re-derive).
- Pre-onboarding banner state (from `technical-plan.md`'s routing section) wired to a real `baseline_reached_at` check, replacing the persistent AI panel until baseline is reached.
- **Demo:** browse real profiles before and after completing onboarding on a test account; confirm filters actually narrow results against real data; confirm Search stays reachable pre-baseline while other pages redirect.

### Phase 6 — Ongoing AI Matchmaker chat + AI Memory
- Persistent chat panel, now using the normal *batched*, session-close extraction (not live/per-turn — that's onboarding-only).
- AI Memory timeline wired to real `ai_memory_events`, Confirmed/AI inferred status derived correctly.
- **Demo:** have an ordinary post-onboarding conversation; confirm session-close (not live) extraction produces a pending draft; confirm a new AI Memory entry appears with the right Status.

### Phase 7 — Match Browsing & Feedback
- Pass/Like/Save/Undo wired to `profile_decisions`/`saved_profiles`.
- Decision feedback rules: required once per `recommendation_id`, never required for Search-originated or Saved-then-decided-from-Search profiles.
- **Demo:** Pass and Like from AI Recommendations (feedback required first time only) and from Search (never required); Undo a decision and confirm it reverts to undecided; Save and later decide on a saved profile, confirming the origin-based feedback rule still applies correctly.

### Phase 8 — Matches, Messages, Unmatch, Compatibility Reports
- Mutual-like detection creates a `matches` row.
- Messaging wired to real conversations between matched users.
- Unmatch: confirm dialog, deletes the match and conversation for both sides, verified with two real test accounts.
- Block: hides (not deletes) per `prd.md`'s clarified distinction from Unmatch.
- Compatibility Report: the real LLM prompt reasoning over two people's `profile_categories`, cached in `compatibility_reports` on generation.
- **Demo:** two test accounts mutually Like, land in Matches, message each other; one unmatches and both accounts confirm the conversation is gone; generate a real Compatibility Report between two seeded profiles and read the actual explanation, not a mock.

### Phase 9 — Trust & Safety + data retention
- Photo moderation (pick a provider — this was an open question in `prd.md`, decide it here), Report, Block wired for real, verified with two test accounts (confirm a blocked user is actually excluded from Search/Recommendations/Matches at the RLS level, not just hidden in the UI).
- Scheduled job: delete `messages` rows older than 30 days.
- **Demo:** report and block another test account, confirm mutual invisibility; seed a `messages` row with an old `created_at`, run the retention job, confirm it's deleted and nothing else is.

### Phase 10 — AI Profile Coach, notifications, settings
- Coach: the simple "here are 2-3 gaps" prompt (not a ranking algorithm — MVP scope is explicit about this), reading real profile gaps.
- Notifications wired to real events (likes, matches, messages, photo moderation results).
- Settings: blocked list management, delete account (with what "delete" actually cascades — decide and document alongside this checkpoint).
- **Demo:** confirm the Coach surfaces genuine gaps from a real, intentionally-incomplete test profile; trigger a couple of real notifications; delete a test account and confirm what should disappear actually does.

---

## 4. Verification, every phase

Matching Renodar's precedent exactly, since it caught real bugs a looser standard would have missed:
- **Verify against the live Supabase project, not just a passing build.** Where permissions matter (RLS, Block, Unmatch, Publish visibility), test with *two* real accounts and confirm the forbidden action is actually rejected by the database, not just hidden by the UI.
- **Anything involving real pixels needs a real browser check**, not just a script — flag it honestly as "still needs a real browser" rather than marking it done on a passing API test.
- **Honest empty states over fake data** — if a feature has no real data source yet, show a real empty state (this project already does this well in the prototype; keep doing it in the real build).
- **DB-level constraints alongside client-side validation** — RLS policies, uniqueness, and ownership rules enforced in Postgres, not just hidden buttons.
- **The extraction-failure-handling modes are load-bearing, not a nice-to-have** — Phase 2 specifically should be tested with a deliberately uncooperative conversation (vague answers, a message that doesn't map cleanly to any category) to confirm the fail-open behavior actually holds, not just the happy path.

**Local dev server is the fast loop; commit+push is a checkpoint boundary, not a per-edit reflex.** Iterate against `next dev` locally — instant feedback, no reason to wait on a Vercel build to check a typo fix. Commit and push once a checkpoint is actually done and verified locally; that push is what triggers the Vercel deploy, which then serves as a secondary confirmation (does this also build and work in the real deployed environment), not the primary way of checking whether a small change worked.

**Every checkpoint deploying straight to the live Vercel URL is a pre-launch-only choice.** It's fine now — there are no real users yet, so a broken or half-finished checkpoint being briefly live costs nothing, and it's genuinely useful to catch deploy-specific issues (missing env vars, build-time errors that don't reproduce locally) immediately rather than in a pile later. Once there are real users, revisit this — move to a branch/preview-deploy flow where only finished phases reach production, rather than every checkpoint.

---

## 5. Working across sessions

Same ritual as Renodar, because it's the whole reason this file exists: at the start of any new session (including after a restart, or weeks later), reconstruct context from exactly three things, in order:
1. `git log --oneline -20`
2. `PROGRESS.md`
3. This file's current phase/checkpoint

No need to re-read the whole codebase from scratch every time. Commit at every checkpoint, not just phase-end. Update `PROGRESS.md` at the end of every session or checkpoint — current phase, what's done, what's left, any deviations from this plan and why, known open bugs. Never leave the tip of the branch mid-checkpoint without an explicit `WIP` marker in the commit message.

If a framework/library assumption in this plan turns out to be stale by the time it's actually implemented (the Renodar build hit this with `create-next-app` shipping breaking changes between plan and implementation) — check the installed package's own bundled docs before writing code against it, and update this plan in place the moment the drift is discovered, rather than letting it go quietly stale.
