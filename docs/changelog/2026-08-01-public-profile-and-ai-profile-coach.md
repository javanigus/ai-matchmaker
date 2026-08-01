# 2026-08-01 — Public Profile architecture, AI Profile Coach, Google login, pricing update

## What changed

**`docs/prd.md`:**

- Added a new **Public Profile** section: required fields that are always public and never hideable (Age, Gender, City/State/Country — never exact address or distance, Relationship goals); optional categories (Religion & Spirituality, Politics, Children, Lifestyle, Travel, Career, Communication Style, Fitness, Money Management, Cleanliness, Social Energy, Conflict Resolution, Family, Education, Food, Pets, etc.) that each get an AI-generated summary, an Edit control, and a Visible toggle; and the single-source-of-truth architecture: `AI Memory → Compatibility Graph → AI-generated summaries → user edits/approves → Public Profile`, with no separate profile-data store. Turning a category's visibility off only removes it from the Public Profile — it's still learned and still used for matching.
- Added a new **AI Profile Coach** section: a proactive coach (not the Compatibility Graph, not AI Memory) with an Overall Profile Quality score and a list of suggestions, each with why it matters, an estimated improvement, and a one-click action (Answer a question, Upload photos, Review AI summary, Expand a category).
- Added **How the AI-Facing Pages Fit Together**, summarizing AI Memory / Compatibility Graph / Public Profile / AI Profile Coach as four complementary views of one source of truth.
- Fixed a contradiction in the compatibility-summaries text: matching always reasons over the full graph regardless of public visibility — there is no separate "used for matching" toggle, only Visible (public profile) and Edit.
- Updated **Monetization**: Free now includes limited AI Matchmaker conversations (rate-limited, not blocked); Premium drops "priority placement" and adds unlimited AI Matchmaker conversations, deeper Compatibility Reports, and early access to new AI features. Added the governing line: "Premium unlocks more AI. It never buys unfair visibility."
- Updated **Matching** to note it reasons over AI-generated summaries (rich prose), not just raw labels.

**`prototype/`:**

- Updated Pricing page tiers to match the PRD.
- Added "Continue with Google" (with an "OR" divider above the email form) to Login and Sign Up.
- Redesigned My Profile: added a "Basics" section for the always-public required fields, and rebuilt "About" as AI-generated summary cards (Religion & Spirituality, Children, Travel, Career, Lifestyle, Communication Style, Fitness, Social Energy, Family, plus empty-state cards for Money Management and Politics) — each with a working Edit/Save/Cancel interaction and a Visible toggle. Profile text (bio) uses the same edit pattern.
- Removed "Show distance" and "Show city" toggles from Settings → Privacy, replaced with a static "Location on profile" row noting city/state/country is always shown.
- Added a new **AI Profile Coach** page (`ai-profile-coach.html`) with the quality score and suggestion cards described above; "Answer a question" suggestions post the question directly into the AI Matchmaker panel. Wired into the shared sidebar nav (between AI Memory and Notifications) across all 14 authenticated pages.

## Why it changed

Founder-accepted product decisions: profile content should read as prose the AI wrote and the user approved, not a list of raw checkbox-style fields — and location/age/gender/relationship-goals are simple facts that don't need or get an AI-summary treatment. Visibility must be a strictly cosmetic, public-profile-only decision so the AI's understanding and matching quality are never affected by what a user chooses to publish. AI Profile Coach exists because Compatibility Graph and AI Memory are both look-back/look-at views — nothing previously told users what to *do* to improve their profile and recommendations over time.
