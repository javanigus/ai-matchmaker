# 2026-07-31 — Match browsing & feedback

## What changed

Added a new "Match Browsing & Feedback" section to `docs/prd.md`, covering:

- The AI Matchmaker staying available and context-aware while the user browses profiles, as conversation rather than a feedback form.
- Signal extraction from likes/passes into separate signals (e.g. physical attraction, dealbreakers, overall outcome) — a pass must never be treated as equivalent to a lack of physical attraction.
- Optional match feedback: attraction rating, quick reasons, and free-flow comments; feedback is never mandatory.
- Context-aware follow-up behavior, including the AI skipping redundant questions and summarizing its interpretation for user correction.
- User controls over how often the AI interrupts while browsing (e.g. "Ask me fewer questions," "Pause suggestions").
- Ability to return to the most recently viewed or passed profile.

Also cross-linked this new section from the existing Compatibility Graph section (match feedback is now a listed source of graph updates) and AI Matchmaker section (it stays active during browsing).

## Why it changed

Founder accepted this as a Version 1 product decision: match interactions should route through the AI Matchmaker relationship rather than a separate survey/feedback UI, and the Compatibility Graph should capture nuanced, multi-signal reasons behind a like/pass rather than a single binary reaction.
