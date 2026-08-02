# 2026-08-01 — Pending category update, mocked up on My Profile

## What changed

**`prototype/profile.html`:** the Career category card now shows a working example of the pending-update design documented in `technical-plan.md` and `prd.md`. Below the approved text, a tinted block ("Updated from your conversation today") shows a merged draft — the same career summary with a new detail folded in (moving toward a leadership role, mentoring) — at Medium confidence versus the approved text's High. Three actions, fully interactive:
- **Approve updated text** — replaces the approved text and confidence badge with the draft's, removes the pending block.
- **Edit** — turns the draft into an editable textarea; **Save & approve** commits whatever's in the box.
- **Keep current text** — dismisses the draft; approved text and confidence are untouched.

Added `initPendingCategoryUpdates()` in `app.js`, generic over any `[data-pending-update]` block (so more examples can be added the same way later), and a sentence in the About section's intro explaining the pattern.

## Why it changed

Founder request: make the pending-update design visual and interactive in the prototype before real build work starts on it, the same way Trust & Safety was mocked up first — seeing and clicking through the actual UI makes the real implementation more straightforward than working from the written spec alone.
