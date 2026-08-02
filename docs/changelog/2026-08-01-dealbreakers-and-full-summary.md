# 2026-08-01 — Dealbreakers as a structured exception, short/full category summaries

## What changed

**`docs/prd.md`:**
- Added a new **Dealbreakers** section: hard requirements about a partner, structurally distinct from My Profile's narrative categories (no AI-written prose, no confidence, no spectrum). Split into **structured dealbreakers** (a fixed set of enumerable attributes — age range, gender, distance, religion, ethnicity/cultural background, citizenship, children, education level — set through a plain form, a deliberate and narrow exception to "the AI Matchmaker is the only editor," using the same reasoning that already exempts Required Fields) and **custom dealbreakers** (free text, added directly or surfaced via conversation/browsing feedback, best-effort rather than a guaranteed filter). The whole list is private by default — used only for filtering, never displayed publicly or disclosed to anyone it excludes.
- Cross-referenced Dealbreakers from Match Browsing & Feedback (the existing "confirmed hard dealbreaker" mention) and from Matching (structured dealbreakers apply as a hard filter before any compatibility reasoning happens).
- Added **"A full detailed view"** to My Profile's category model: alongside the short, curated, editable summary, every category keeps a longer, read-only version that preserves specific personally-meaningful details the short version would trim for length, opened via a "See everything I've picked up" link.

**`docs/technical-plan.md`:**
- Added **"Dealbreakers: structured, not conversational"**: the technical case for why structured dealbreakers should be a form, not a conversation — they're simple facts with no ambiguity for a model to interpret, and routing them through extraction would add cost and exactly the failure surface the extraction-failure-handling section exists to manage. Documented as two tables (`dealbreakers_structured`, `dealbreakers_custom`), with structured ones compiling to a literal SQL `WHERE` clause applied before any LLM call.
- Added a Go-to-market note flagging the O(n²) pairwise-LLM-comparison cost problem once past the concierge-first-cohort phase, and named Dealbreakers' SQL filter as the mechanism that already solves the first, cheapest layer of it.
- Updated the extraction call description and `profile_categories` data model to produce and store two summaries per category (`ai_summary` short, `full_summary` long) instead of one — the full version writes directly on every extraction (no pending/approval gate), since it's never public and never read by matching.

## Why it changed

Founder-driven design discussion: real dating profiles show very specific hard requirements (nationality, religion, age range, citizenship) that a soft AI-summarized paragraph can't enforce, and a founder observation that a fixed, finite set of dealbreaker attributes doesn't need an AI conversation to collect — a form is faster and more reliable, correcting an earlier draft of this design that routed everything through conversation by default. Separately, a concern that a strict 2–4 sentence category summary could silently drop specific details a user cares about (e.g. a favorite cuisine mentioned once) — resolved by keeping a longer, private, read-only version alongside the short public one, so nothing said is ever truly lost even if it doesn't make the curated cut.
