# 2026-08-01 — AI Memory status pills clarified as read-only

## What changed

**`prototype/ai-memory.html`:** added a hover `title` to every "Confirmed" and "AI inferred" status pill explaining what it means and that there's nothing to click.

**`docs/prd.md`:** AI Memory section gained a paragraph stating the Status label is read-only — confirming an inferred entry happens on My Profile via the existing pending-update Approve action, not on the AI Memory page.

## Why it changed

Founder question after seeing the mockup: does "Confirmed" need a way to confirm it? It doesn't — it already just reflects state set elsewhere — but the colored pill styling reads like a button with nothing behind it. A tooltip makes that legible without adding any real interaction.
