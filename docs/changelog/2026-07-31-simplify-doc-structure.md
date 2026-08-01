# 2026-07-31 — Simplify documentation structure

## What changed

Consolidated the documentation set from 10 files down to 3 (plus changelog):

- `docs/principles.md` merged into `docs/vision.md` as a new "Guiding Principles" section.
- `docs/mvp.md`, `docs/compatibility-graph.md`, `docs/ai-matchmaker.md`, `docs/matching-engine.md`, `docs/monetization.md`, `docs/roadmap.md` merged into `docs/prd.md` as sections: MVP, AI Interview, Compatibility Graph, AI Matchmaker, Matching, Monetization, Roadmap. (The AI Interview content was split out of the old `ai-matchmaker.md` per the new section rules.)
- `docs/ideas.md` simplified to a plain bulleted list.
- Removed the now-empty per-topic files listed above.
- Updated `README.md` to describe the new minimal structure and the founder's brainstorm-then-paste workflow.

No product information was lost — all previously accepted content (Version 1 vision, guiding principles, AI Interview/Compatibility Graph/AI Matchmaker/Matching details) was carried over verbatim into `vision.md` or `prd.md`. Sections with no accepted content yet (MVP, Monetization, Roadmap, Target Users) remain marked pending.

## Why it changed

Founder is a solo operator and wants a documentation system optimized for speed and low maintenance rather than enterprise-style organization. Going forward, Claude will not create additional documentation files unless explicitly asked, and updates will only ever touch `vision.md`, `prd.md`, `ideas.md`, and `changelog/`.
