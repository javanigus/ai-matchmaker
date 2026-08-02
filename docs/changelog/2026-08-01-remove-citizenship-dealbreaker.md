# 2026-08-01 — Removed Citizenship/immigration status as a structured dealbreaker

## What changed

**`docs/prd.md`, `docs/technical-plan.md`:** dropped "Citizenship/immigration status" from the structured dealbreaker attribute list and the `dealbreakers_structured` enum (now: age range, gender, distance, religion, ethnicity/cultural background, children, education level).

**`prototype/profile.html`:** removed the Citizenship `<select>` from the Dealbreakers modal.

## Why it changed

Founder call: an uncommon dealbreaker not worth the form real estate or the data-model surface.
