# 2026-08-01 — Onboarding conversation-to-profile data flow documented

## What changed

**`docs/technical-plan.md`:** added a new "Onboarding: conversation-to-profile data flow" section — the mechanics behind the plan's "hardest part" milestone. Documents: two distinct LLM calls (live turn-by-turn chat vs. once-per-session structured extraction), why onboarding specifically runs extraction live/turn-by-turn instead of the normal batched approach (the visible progress card needs to update as the user types), baseline completion as a deterministic app-level check rather than something the model self-judges, a rough data model (`conversations`, `messages`, `ai_memory_events`, `profile_categories`, `pending_category_updates`, plus a `baseline_reached_at` flag on `users`), and a step-by-step UX walkthrough matching `prototype/onboarding.html`.

**`prototype/onboarding.html`:** two decisions applied to the mock —
- The completion CTA now routes to **My Profile** ("Check out your profile") instead of straight to Recommendations, and the AI's closing line was reworded to match ("I'll start finding matches once you've seen what I picked up").
- The mid-conversation progress card's percentage now matches a strict fraction of baseline categories covered (2 of 5 shown categories → 40%, was 60%) instead of a fuzzier blended number — chosen because it's simpler and more reliable to implement, and it can't visibly disagree with the pill checklist next to it.

## Why it changed

Founder questions about how the onboarding data flow actually works in practice, followed by two concrete decisions: route the post-onboarding CTA to My Profile (keeping with "AI proposes, user approves" — review before anything is generated from it) rather than Recommendations, and use whichever completion-percentage calculation is easiest and most reliable to implement, which is a plain fraction of baseline categories at sufficient confidence.
