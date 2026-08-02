# 2026-08-02 — Added the missing physical-attraction rating and reason chips

## What changed

**`prototype/profile-view.html`:** the Pass/Save/Like decision's feedback box previously only had a free-text textarea — `prd.md`'s "Optional feedback, with one exception" describes three separate inputs (a physical-attraction rating, quick reasons, and free-flow text), and only the third existed in the mockup. Added a 5-star attraction rating, and two reason-chip sets (`data-reasons-pass` / `data-reasons-like`) shown conditionally based on which decision is active — different reasons make sense for a Pass ("Hit a dealbreaker," "Didn't feel a connection") than a Like ("Really attractive," "Shared values").

**`prototype/assets/app.js`:** extended `wireTriState()` — the shared component behind this decision UI — to drive the stars (click to set 1–5, click the active value again to clear) and the reason chips (multi-select toggle, cleared when the decision changes so a stale Pass reason doesn't survive into a Like). Exposed `getRating()`/`getReasons()` alongside the existing `getDecision()`/`getFeedback()`. Also fixed the "Send feedback" button, which previously only checked for text and silently no-opped if someone only set a rating or picked reasons with no typed comment — it now submits on any of the three being present, matching that they're independent optional inputs, not one gating the others.

## Why it changed

Founder catch, prompted by a screenshot of the actual rendered feedback box: two of the three documented feedback inputs were simply missing from the mockup. Surfaced while reviewing the `profile_decisions` schema in `PLAN.md`, which was missing the rating field for the same underlying reason.
