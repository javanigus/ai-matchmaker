# 2026-07-31 — AI-assisted photo system

## What changed

Added a new "AI-Assisted Photos" section to `docs/prd.md` (after Match Browsing & Feedback, before Monetization), covering:

- The Learning Photos (private, up to 100) vs. Profile Photos (public) distinction.
- Learning Photos as Compatibility Graph evidence, and that deleting/hiding one doesn't erase a belief still supported by other evidence.
- Profile Photos always being user-chosen; the AI recommends but never auto-publishes or replaces them.
- AI Photo Coaching — a natural conversation after photo analysis that both strengthens the profile and teaches the AI more about the user.
- Story-Based Recommendations — the AI evaluates the story a profile communicates as a whole, explains every recommendation, and never simply calls a photo "bad."

Cross-linked the Compatibility Graph section to note Learning Photos as an evidence source and that removing one piece of evidence doesn't erase a belief backed by others.

Generalized the "Nothing changes in the Compatibility Graph without the user's confirmation" bullet in `docs/vision.md`'s Guiding Principles into **"Analyze, explain, recommend, decide"** — the founder framed this as a product-wide interaction model (not photo-specific), so it was placed in the rarely-changing principles doc rather than only in the PRD.

## Why it changed

Founder accepted the AI-assisted photo system as a Version 1 decision: photos serve both a private learning purpose and a public presentation purpose, and the AI's role with photos (and everywhere else) is to analyze and recommend, never to decide unilaterally.
