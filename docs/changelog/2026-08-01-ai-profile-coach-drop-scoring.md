# 2026-08-01 — AI Profile Coach drops scoring, becomes a plain recommendation list

## What changed

**`docs/prd.md`:**

- Rewrote **AI Profile Coach**: it no longer assigns a profile score or estimates percentage improvements — an LLM can't reliably quantify how much a given action improves future compatibility or match quality, and a fake "+4%" implied precision that doesn't exist. It's now documented as a recommendation engine, not a scoring system.
- Updated the page description to: "Suggestions to improve your profile, help your AI Matchmaker understand you better, and increase your chances of finding compatible matches."
- Documented that the entire page is just the prioritized recommendation list — no score, no percentage, no progress bar — with each recommendation explaining *why* it's useful in plain language rather than quantifying its impact.
- Documented priority in qualitative terms only (missing core categories and weak photos rank above expanding an already-good category or wording tweaks), explicitly noting the user never sees the ranking logic.
- Reaffirmed that every recommendation requiring more information routes through the AI Matchmaker conversation — no separate questionnaires or forms — and added the one-question test the whole page should satisfy: "What is the next best thing I should do to improve my profile and future matches?"

**`prototype/ai-profile-coach.html`:**

- Removed the "Overall Profile Quality" score card and its progress bar entirely.
- Removed every "Estimated improvement: +X%" tag and every "Confidence: X" / "Not yet learned" badge from recommendation cards — each card is now just a title, a plain-language explanation of why it matters, and a single action button.
- Reordered the eight recommendation cards by priority: missing core category (Money Management) and missing photo variety first, then a sparse profile introduction, then unclear-but-partially-known categories (Family, Lifestyle, Communication Style), then lower-priority refinements to already-strong categories (Travel, Religion & Spirituality).
- Replaced the AI panel's stale "How is this score calculated?" suggestion chip (both desktop and mobile copies) with "How do you decide what to suggest?", explaining the qualitative reasoning instead of a scoring formula.

## Why it changed

Founder decision: percentages and progress bars implied a precision the underlying LLM-driven understanding can't actually produce, and framed the page as something to be graded against rather than a coach to act on. Removing the score also removes the temptation to build a fake scoring formula behind it later — the page's only job is to answer "what's the next best thing to do," in priority order, with the AI Matchmaker conversation as the sole way to act on anything that requires new information.
