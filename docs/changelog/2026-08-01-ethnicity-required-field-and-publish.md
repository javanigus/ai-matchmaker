# 2026-08-01 — Ethnicity added to Required Fields; Publish gate added

## What changed

**`docs/prd.md`:**
- **Required fields** now includes Ethnicity/cultural background (multi-select), alongside Name, Age, Gender, City/State/Country, and Occupation. Ethnicity is explicitly noted as reusing the same typeahead and canonical value list as the Ethnicity dealbreaker, so a user's own value and someone else's dealbreaker always compare as normalized strings, not free text.
- New **"Publishing the profile"** paragraph: a profile isn't visible to others or eligible for matching until the user fills in the required-fields form and clicks Publish. Reaching onboarding baseline routes the user to My Profile but doesn't publish by itself — Publish is a separate, explicit action with its own validation (a missing required field blocks it with a named error).
- Dealbreakers' Ethnicity attribute cross-references the same shared list.

**`docs/technical-plan.md`:**
- Data model: added `age`, `gender`, `location_*`, `occupation`, and `published_at` to `users`; added `user_ethnicities (user_id, ethnicity)` as a new table (one row per value, same canonical list as `dealbreakers_structured`'s ethnicity attribute). Clarified `dealbreakers_structured`'s comment to note multi-select attributes (religion, ethnicity) get multiple rows per user.
- "Baseline completion" now explicitly notes baseline reaching doesn't publish the profile by itself.
- Onboarding UX walkthrough gained a new step 8 ("Publishing the profile") describing the required-fields form and Publish button/validation on My Profile; the former step 8 ("no onboarding mode to exit") renumbered to 9.

**`prototype/profile.html`:**
- Added a "Publish profile" banner near the top of the page (amber = draft/unpublished, turns red on a failed validation attempt, turns green and removes the button once published).
- Basics section gained an **Edit** button and a fifth row, **Ethnicity** (starts unset — "Not set — required to publish" — since this is a brand-new field with no prior mock value).
- New **Basics modal**: Age, Gender, Location, Occupation as plain inputs; Ethnicity as a multi-tag typeahead-style input matching the Dealbreakers Ethnicity pattern.

**`prototype/assets/app.js`:** added `initBasics()` (open/close the Basics modal, add/remove ethnicity tags, save back to the display row) and `initPublishProfile()` (validates all Basics fields including Ethnicity on Publish click; blocks with an inline error and scrolls to Basics if anything's missing, otherwise marks the profile published).

## Why it changed

Two founder-driven follow-ups from the Dealbreakers Ethnicity fix: (1) a caught inconsistency — Ethnicity was usable as a dealbreaker about a partner, but never captured as a fact about the user themselves, so there was nothing on the other side of the filter to compare against; fixed by adding it to Required Fields, reusing the same canonical list so typos can't silently break a match. (2) A design gap the founder noticed while working through this — Required Fields were described as "set through a plain form," but no such form, or any finishing/validation step, actually existed anywhere in the onboarding flow. The Publish button and validation close that gap, and deliberately stay a separate gate from baseline confidence (matching already only reasons over approved category text; Publish adds one more explicit, user-driven checkpoint before a profile goes live at all).
