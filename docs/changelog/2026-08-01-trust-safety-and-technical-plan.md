# 2026-08-01 — Trust & Safety mockups, accepted technical plan

## What changed

**`docs/technical-plan.md` (new file):** documents the accepted plan for moving from the `prototype/` click-through to the real product — architecture (relational schema instead of a literal graph database, Next.js + Supabase + Claude API + Vercel, the session-summary pipeline as both UX and cost/latency control, no custom ML), build sequencing (core loop first, AI Profile Coach ranking/photo story analysis/full monetization/native mobile deferred), and go-to-market notes (niche/geo-first launch to solve marketplace liquidity before matching quality, a "concierge" first cohort, monetization kept to zero or one tier at MVP). Calibrated throughout to a solo founder coding it themselves, validating fast rather than building for scale on day one.

**`docs/prd.md`:** added a new **Trust & Safety** section — photo moderation (every upload checked before it can appear publicly), Report (reason + optional detail, anonymous, team-reviewed), and Block (mutual, immediate, reversible, unblock available from Settings) — explicitly called out as MVP-required, not deferred.

**`README.md`:** added `technical-plan.md` to the documented structure and refreshed the PRD's section list (was still listing "Compatibility Graph," which no longer exists as a section).

**`prototype/`:** built the Trust & Safety features as mockups before any real build work starts, per the founder's instruction to prototype first:
- `profile-view.html` and `messages.html` — a "•••" menu with Report (reason radio list + optional detail → confirmation toast) and Block (confirm modal → reversible "blocked" banner replacing the decision/conversation area, with Undo).
- `settings.html` — a new Safety section listing blocked users with Unblock.
- `profile.html` — an "Under review" state on a photo thumbnail demonstrating moderation before a photo can go public.
- `app.js` — added `initReportAndBlock()` (one shared function wiring both pages via the same data attributes) and `initSettingsBlockedList()`; refactored the photo-lightbox like button's name lookup into a shared `profileFirstName()` helper.

## Why it changed

Founder decision, following a business/technical recommendations discussion: the product's real build should stay simple enough for a solo founder to ship (managed services over custom infrastructure, no custom ML, defer scale-oriented work), validate fast, and treat Trust & Safety as a non-negotiable MVP basic rather than a later add-on — cheap to get right early, expensive to retrofit. Per explicit instruction, Trust & Safety was mocked up in the prototype first, and the technical/business plan itself was captured in `docs/` now so it's ready to reference when real build work begins.
