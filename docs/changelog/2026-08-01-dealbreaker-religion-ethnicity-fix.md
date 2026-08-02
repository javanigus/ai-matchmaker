# 2026-08-01 — Dealbreakers: Religion and Ethnicity fixed to allow specific values

## What changed

**`prototype/profile.html`:** in the Dealbreakers modal, **Religion** changed from a single `<select>` (No preference / Must share my religion / Must be religious / Must not be religious) to a checkbox group of specific faiths (Muslim, Christian, Jewish, Hindu, Buddhist, Not religious) so a user can require one or several. **Ethnicity / cultural background** changed from a single `<select>` ("Must share my background") to a tag-input list — the same removable-chip pattern already used for custom dealbreakers — so a user can name a specific background (e.g. "Afghan") instead of only a yes/no toggle. The Dealbreakers summary card's example chips were updated to show "Religion: Muslim" and "Ethnicity: Afghan".

**`prototype/assets/app.js`:** `initDealbreakers()` updated to read the checked `[data-dealbreaker-religion]` boxes (joined with "or" into one chip) and the ethnicity tag list on Save, and to wire add/remove for the new ethnicity tag input, mirroring the existing custom-dealbreaker list wiring.

## Why it changed

Founder caught, via a screenshot of the rendered modal, that the original single-select fields couldn't express real dealbreakers people actually have — "must be Muslim," "Muslim, Christian, or Jewish," "must be Afghan." A yes/no toggle against "my own" religion or background doesn't cover someone who wants a specific answer that isn't their own, or an OR across a few acceptable options.
