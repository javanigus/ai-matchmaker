# 2026-08-01 — Removed stale "percentage" reference from the home page

## What changed

**`prototype/index.html`:** the "Explained, not just scored" value-prop card's subtitle changed from "Know why you're compatible, not just a percentage." to "Know why you're compatible, not just a level." — matching `prd.md`'s Compatibility Reports section, where the written explanation is the primary value and the level (High/Medium/Low/Unknown) is just a quick summary of it, never a percentage.

The card title itself ("Explained, not just scored") was left unchanged — it already matches `vision.md`'s guiding principle wording ("Compatibility is explained, not just scored") and isn't stale.

Checked every other prototype page for the same leftover language; this was the only remaining instance.

## Why it changed

Founder catch: this line predates the switch from compatibility percentages to High/Medium/Low/Unknown levels (`afe2a63`) and never got updated when that change shipped.
