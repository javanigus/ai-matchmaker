# 2026-08-02 — MVP scope defined, stale open questions pruned

## What changed

**`docs/prd.md`:**
- Filled in the **MVP** section (previously "_Pending: MVP scope not yet defined._"), promoting `technical-plan.md`'s Sequencing content up to product-requirements level: in-scope list (AI Interview, My Profile, manual Search, the AI Matchmaker, simple Compatibility Reports, Match Browsing & Feedback, Trust & Safety basics), explicitly out-of-scope list (AI Profile Coach's prioritization logic, photo story-analysis sophistication, full tier build-out, native mobile), and the first concrete build milestone.
- Resolved and removed four stale "Open questions" that this session's work had already answered elsewhere but never cleaned up: AI Interview's required-topics/confidence-threshold question (now cross-referenced to My Profile and `technical-plan.md`), My Profile's and Dealbreakers' "exact list at launch" questions (both now defined by the finalized taxonomy), and Trust & Safety's "does blocking delete message history" question — resolved by stating directly in the Block paragraph that blocking hides (reversibly) rather than deletes, and cross-referencing Unmatch as the action that actually deletes message history.
- Bumped both `prd.md` and `technical-plan.md`'s "Last updated" date.

## Why it changed

Founder question — "are we ready to start building the actual app?" — surfaced that despite how much had been resolved this session, the MVP section itself was still blank, and several "Open questions" lines no longer reflected reality now that the category taxonomy, Dealbreaker attributes, and Unmatch/Block distinction were all settled. Cleaning this up now, before any real code exists, is cheap; leaving stale ambiguity in the doc that a future build session (or collaborator) would trust at face value is not.
