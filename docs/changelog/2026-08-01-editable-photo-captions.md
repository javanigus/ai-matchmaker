# 2026-08-01 — Editable photo captions

## What changed

**`docs/prd.md`:** Profile Photos now explicitly documents captions as AI-generated-but-user-editable, the same "AI proposes, user decides" pattern already used for bios and profile categories.

**`prototype/profile.html`:** the photo lightbox (Profile Photos only — Learning Photos aren't captioned or public) gained an edit affordance next to the caption: a pencil icon opens an inline text field with Cancel/Save, pre-filled with the current caption. Saving replaces the caption immediately and shows a confirmation toast; the updated text persists while browsing other photos in the same session. Updated the section's helper text to call out that captions are AI-written but always editable. `initPhotoLightbox()` in `app.js` gained this wiring, gated on the edit button's presence so it has no effect on `profile-view.html`'s lightbox (captions on someone else's profile stay read-only there, same as every other narrative section).

## Why it changed

Founder question: there was no way to override an AI-written photo caption, breaking the "user can always override AI-generated text" rule that already applies everywhere else in the product (bio, profile categories). Captions needed the same Edit affordance, scoped to the user's own photos only.
