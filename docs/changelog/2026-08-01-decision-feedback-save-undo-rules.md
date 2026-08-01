# 2026-08-01 — Decision feedback, Save, and Undo rules

## What changed

Extended the "Match Browsing & Feedback" section of `docs/prd.md` with three new rules, and updated the existing "Optional feedback" bullet to reference the one exception to it:

- **Decision feedback rules.** Every AI-generated recommendation carries a unique `recommendation_id`. The user's first final decision (Pass or Like) on that recommendation requires free-form feedback before it's recorded, regardless of whether the decision happens on the AI Recommendations page, the Full Profile page, or Saved Profiles. Feedback is collected only once per recommendation. Manual Search profiles never require decision feedback.
- **Save is not a decision.** Saving (from AI Recommendations or manual Search) is a temporary, reversible bookmark that never requires feedback. When a saved profile is later Passed or Liked, the feedback requirement depends on where it originated — required if from an AI recommendation, not required if from manual Search.
- **Undo.** Pass, Like, and Save are all reversible immediately after the action (toast/snackbar or inline Undo). Undoing a Pass/Like restores the undecided state; undoing a Save removes the profile from Saved Profiles.

Also updated the prototype (`prototype/recommendations.html`, `prototype/assets/app.js`) to match:

- Redesigned the AI Recommendations "New" tab cards into two clear sections — a compact identity/summary section (square photo, name/age/match %/occupation, city, AI summary, confidence + recommendation date, View Full Profile) and a visually grouped feedback + Pass/Save/Like section below it — replacing the previous full-width photo banner that made cards too tall.
- Redesigned History cards to drop the standalone "Reason" label and use the existing status pill (Passed/Liked/Saved) as the label for the quoted feedback instead, showing "No decision yet." when a Saved entry has no feedback.

## Why it changed

Founder decision: the product needs one simple, consistently-applied rule rather than surface-specific feedback logic — "if this profile came from an AI recommendation, your first Pass or Like requires feedback," full stop, everywhere that decision can be made. This also formalizes Save as explicitly non-decisional (never blocks on feedback, always undoable) and makes Undo an explicit, first-class behavior for all three actions rather than an implementation detail.
