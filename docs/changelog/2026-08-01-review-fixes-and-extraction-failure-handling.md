# 2026-08-01 — Review pass fixes, and how extraction failures are handled

## What changed

Following a full review of the mockups and technical plan (a background audit of all ~25 prototype pages for broken links/stale terms/naming drift, plus a manual pass through `prd.md`, `vision.md`, and `technical-plan.md`):

**`prototype/compatibility-report.html`:** fixed two drift bugs the audit found — "Children" in the category-by-category list now reads "Family" (matching My Profile, AI Memory, and AI Profile Coach everywhere else), and "Religion & spirituality" is capitalized consistently with every other instance in the product.

**`docs/vision.md`:** fixed staleness flagged twice before but never corrected — the Elevator Pitch, Long-Term Vision, Core Differentiators, and Guiding Principles all still described a user-facing "Compatibility Graph" and "compatibility scores," both superseded by the My Profile architecture and the High/Medium/Low/Unknown levels. Reworded all four to match current terminology, including tying "the AI never silently changes the user's profile" to the pending-update-and-approve mechanism now in place.

**`docs/prd.md`:** tightened the My Profile section's "Accept, Edit, Reject, or Delete" phrasing, which no longer matched the more precise three-action pending-update model documented two paragraphs below it — now points at that section instead of restating an outdated version of it.

**`docs/technical-plan.md`:**
- Fixed a stray "build real Compatibility Graphs" reference in the go-to-market section to say "a real understanding of them," consistent with the terminology cleanup applied everywhere else.
- Added "When extraction fails, fail open — never break the conversation": the four distinct failure modes for structured-output extraction, each handled the cheapest way that actually addresses it — schema-constrained output prevents structurally invalid data outright (no extra call needed), a missing tool call retries then falls back to a stronger OpenRouter model then fails open, fabricated evidence is caught with a deterministic substring check (not a second AI call), and semantically-wrong-but-valid output is deliberately left to the existing pending-update approval UI rather than adding an AI-review layer — a human reviewing the AI's work is a stronger check than another LLM call would be.

## Why it changed

Founder-requested review pass, plus a follow-up question about handling malformed/failed structured output specifically. The founder's instinct was "have AI detect and fix malformed data" — the resolution splits that into cases: some failures should never reach an AI check at all (prevented by schema constraints or caught by deterministic code), and the one case that's genuinely about correctness rather than validity is already handled by the pending-update approval flow, not a new AI-review mechanism.
