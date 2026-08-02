# 2026-08-01 — My Profile rebuilt around the finalized taxonomy, Dealbreakers UI mocked up

## What changed

**`prototype/profile.html`:**
- **Basics** now shows Age, Gender, Location, Occupation (matching `prd.md`'s Required Fields exactly) — Relationship Goals moved out and became its own category card, resolving a long-standing inconsistency between this page's required list and the one used elsewhere (e.g. `profile-view.html`).
- **About** is now split into two labeled groups: **Core categories** (Relationship Goals, Family, Religion & Spirituality, Lifestyle, Career, Social Energy — the six needed to reach onboarding baseline) shown first, then **Additional categories** (Communication Style, Travel, Fitness, Learning, Money Management, Politics) below. Two new cards — **Relationship Goals** and **Learning** — were added; **Lifestyle**'s text was rewritten to reflect its redefined scope (daily rhythm, pace, substances, home/cleanliness habits — the merge point for what would otherwise have been a separate Cleanliness category).
- Every populated category (10 of them) now has a **"See everything I've picked up"** link opening a shared, read-only modal with a longer version of that category's summary — written to preserve specific details a tight 2–4 sentence summary would otherwise trim.
- A new **Dealbreakers** section sits between Basics and About: a summary card showing current dealbreakers as chips (Age 27–38, Must want children, one custom example), with an "Edit dealbreakers" button opening a form modal — eight structured fields (age range, gender, distance, religion, ethnicity/cultural background, citizenship, children, education level), all plain `<select>`/number inputs with no AI involved, plus a directly-editable custom dealbreaker list. Saving regenerates the summary chips from whatever's set.

**`prototype/ai-memory.html`:** fixed the "Relationship Goals" tag, which pointed at `profile.html#basics` — now points at the category's own new anchor, `#category-relationship-goals`.

**`prototype/assets/app.js`:** added `initFullSummaryModal()` (one shared modal fed by whichever category's trigger was clicked) and `initDealbreakers()` (open/close the form, add/remove custom entries, regenerate chips on Save).

## Why it changed

Founder sign-off on the category taxonomy discussed over several turns, conditioned on the full-summary feature being included — plus a request to mock up the Dealbreakers UI (both the editing form and its display on My Profile) so the design is visually settled before the real build starts, following the same "prototype first" pattern already used for Trust & Safety.
