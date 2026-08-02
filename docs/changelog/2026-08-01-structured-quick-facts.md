# 2026-08-01 — Structured quick facts on narrative categories; conversation pre-fills forms

## What changed

**`docs/prd.md`:**
- New **"Structured quick facts on narrative categories"** paragraph: Religion & Spirituality, Family, Career, and Relationship Goals each carry one small closed-list fact (Religious affiliation, Wants children, Education level, Relationship goals) alongside their AI-written narrative, used for filtering. The narrative stays the nuanced version; the quick fact is a coarse label for querying, not a replacement.
- New **"Populated from conversation first, confirmed directly second"** paragraph: required fields and quick facts aren't blank-form-only — onboarding's live extraction pass tries to catch them from what the user actually says, pre-filling the form/control. Required fields get reviewed at Publish (blocking validation); quick facts get reviewed right on their own category card, no separate pending-draft flow needed for a single closed-choice value.
- "Publishing the profile" clarified: quick facts aren't part of Publish's validation — they ride along with their category's existing baseline-confidence gate instead.
- Dealbreakers' structured-attribute list now names exactly what each dealbreaker compares against on the profile side (Religion → Religious affiliation, Children → Wants children, Education level → Education level, Ethnicity → Required Fields' Ethnicity) — closing a gap where several Dealbreaker attributes had nothing structured to filter against.
- Fixed a stale "Optional narrative sections" category list left over from the earlier taxonomy rebuild (still listed dropped categories like Food, Pets, Cleanliness, Conflict Resolution as separate items).

**`docs/technical-plan.md`:**
- Onboarding data flow: the same live, turn-by-turn extraction call already running during onboarding also returns required fields and quick facts when the user states them clearly enough — no new call, no new mechanism, reusing the existing structured-output schema and the same "explicitness" bar already used for confidence.
- Data model: added `quick_fact` to `profile_categories` (nullable, only meaningful for the four categories above).
- Reframed why writing these fields directly (rather than through the pending-draft workflow) is safe: the user always sees the literal current value on an editable control, unlike narrative prose, which is why a second review layer isn't needed — required fields get Publish's blocking validation, quick facts get folded into baseline confidence.
- The four extraction-failure-handling modes now explicitly cover required-field/quick-fact extraction too, with the Basics form and each category's own card standing in for the pending-update UI as the human check.
- Onboarding UX walkthrough step 8 (Publishing) notes the form is usually already filled in by the time the user gets there.

**`prototype/profile.html`:** added a small pre-filled, directly-editable `<select>` quick-fact control to the Relationship Goals, Family, Religion & Spirituality, and Career category cards (Relationship goals, Wants children, Religious affiliation, Education level respectively), each pre-selected to match that card's existing narrative text. Basics modal copy updated to mention conversation pre-fill.

**`prototype/assets/app.js`:** added `initQuickFacts()` — wires a "Saved." toast on change for every `[data-quick-fact]` select.

## Why it changed

Founder question, prompted by a Search-page screenshot: several Search filters (Religion, Children, Education) and Dealbreaker attributes had nothing structured on the profile side to actually compare against, since Religion & Spirituality, Family, and Career are pure AI-written narrative by design — the same problem the Ethnicity fix solved, just uncaught in three more places. Follow-up founder question — since onboarding already starts as a conversation, should the AI try to fill these in from what's said before asking directly? — led to reusing the existing live-extraction pipeline for required fields and quick facts too, rather than adding a second, separate "fill out this form" step users would experience as redundant with the conversation they just had.
