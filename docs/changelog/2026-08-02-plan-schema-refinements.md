# 2026-08-02 — PLAN.md schema refinements: quick_fact location, feedback shape, notification types

## What changed

**`docs/PLAN.md`:**
- Noted that `quick_fact`'s four canonical option lists (Religious affiliation, Wants children, Education level, Relationship goals) live as code-level constants, not a database table — small, fixed lists that change only as a deliberate product decision, imported by the UI select, the extraction schema, and mirrored in a Postgres `CHECK` constraint. Flagged that Ethnicity's own canonical list is a different case (much longer, open-ended) and may genuinely want a reference table — left as an open decision for Phase 1, not resolved now.
- Added `physical_attraction_rating` to `profile_decisions` — a third optional feedback input from `prd.md` that had been missed when the table was first designed. Clarified in a comment that all three feedback fields (rating, reasons, text) are user-provided, not AI-generated; the AI only reads them downstream to extract signals into `profile_categories`.
- Added a `type` enum to `notifications`, reconstructed from `prototype/notifications.html`'s example cards (new match, new like, photo like, new message, new recommendations, a connection's profile update, subscription) — noted as a starting point, not authoritative, with photo moderation result and report outcome flagged as plausible future additions.

## Why it changed

Founder questions surfaced two real gaps and one earlier miscommunication: (1) nowhere had actually said where the quick_fact option lists should live, (2) `profile_decisions` was missing a field `prd.md` already specified (the physical-attraction rating), and (3) an earlier answer describing `feedback_reasons`/`feedback_text` implied one might be AI-populated, which isn't correct — both come from the user, and needed correcting rather than left to stand.
