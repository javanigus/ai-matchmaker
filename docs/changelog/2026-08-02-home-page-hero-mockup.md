# 2026-08-02 — Home page hero: chat mockup + gradient background

## What changed

**`prototype/index.html`:** the hero section is now a two-column layout instead of centered text-only. Left: existing headline, subtext, and CTAs, now left-aligned on desktop. Right: a mocked chat snippet (reusing the same bubble styling as `onboarding.html`/`messages.html`) showing a short sample AI Matchmaker exchange, inside a card styled like a real chat panel (header, bubbles, decorative input row). The hero section also gained a soft `accent-50 → stone-50` gradient background, replacing the flat `bg-stone-50` it shared with the rest of the page. The value-prop and footer sections below are unchanged.

## Follow-up fixes (same day, after review)

- Added `pb-8` to the header — it had `pt-8` but no bottom padding, so the gradient hero background began immediately below the nav with no breathing room, visually crowding the Sign Up button.
- Fixed `lg:items-start` on the CTA row, which top-aligned "Or browse profiles first →" against the taller button instead of centering it — changed to `items-center` at every breakpoint.
- Removed the "Explore the prototype" footer (internal page links + "Static prototype" disclaimer) now that the home page is a more finished surface; the Company footer above it stays.

## Why it changed

Founder feedback: the home page read as too plain — all typography, nothing showing what the product actually looks or feels like. The chat mockup demonstrates "talk, don't fill out forms" directly instead of only describing it in copy, and reuses styling that already existed elsewhere in the prototype rather than introducing anything new. This is the first of a few planned visual passes on the home page — a "how it works" strip and heavier value-prop visuals are still open.
