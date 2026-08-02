# 2026-08-01 — Pending category updates: the approval UI and the approved/pending split

## What changed

**`docs/prd.md`:**
- **My Profile**: added "Proposed updates are pending until approved" — a new or revised understanding from a conversation appears as an editable draft alongside the current approved text (one merged paragraph, not a fragment), and only becomes the approved text via **Approve updated text**, **Edit**, or is dismissed via **Keep current text**. Only approved text is ever public or used by matching.
- **Matching**: added an explicit note that matching reasons over *approved* category text only, not pending drafts — a deliberate, called-out exception to "visibility doesn't gate matching," since an unreviewed draft isn't yet a confirmed understanding at all.

**`docs/technical-plan.md`:** substantially expanded the "Onboarding: conversation-to-profile data flow" section:
- Extraction now produces a full revised summary per category (given the current approved *or pending* text as context and instructed to merge), not a delta — this is what makes the merged-paragraph UI possible.
- Documented the pending-draft data model as nullable `pending_summary` / `pending_confidence` / `pending_source_event_id` columns directly on `profile_categories`, rather than a separate table — one row already is "the state of a category," a pending draft is just its optional second half. Only one draft per category at a time; a new extraction overwrites the existing draft rather than stacking.
- Split "baseline completion" into two separate, deliberately different gates: the onboarding progress bar counts categories at Medium+ confidence whether *pending or approved* (it needs to move live, before there's been any chance to review anything), while matching/Compatibility Reports count *approved only* — the stricter gate, expected to lag behind the first.
- Noted the two nudges back to an unreviewed draft: a banner on My Profile itself, and AI Profile Coach surfacing it as a suggestion (reusing its existing recommendation mechanism rather than a new notification channel).
- Updated the onboarding UX walkthrough: landing on My Profile after onboarding means landing on a page where every touched category has a pending draft waiting — which doubles as the "review everything I just learned in one batch" view, without needing a separate screen for it.

## Why it changed

Founder decision, following a design discussion: updates should never go public or feed matching before the user has reviewed them, rejecting an earlier "auto-apply, edit later" draft of this design. Rather than a separate review page/inbox, pending drafts live inline on My Profile, directly below the text they'd replace. This raised a real inconsistency (a strict "approved-only" gate would freeze the onboarding progress bar, which needs to move before anything's been reviewed) — resolved by treating "has the AI learned enough" and "does matching have enough confirmed data" as two separate, intentionally different gates rather than one.
