# 2026-08-01 — Photo likes in the lightbox

## What changed

**`docs/prd.md`:**

- Added **Photo likes** under Match Browsing & Feedback: users can like an individual photo on someone else's profile from the lightbox, a lighter-weight, reversible signal than a full Pass/Save/Like decision on the profile. The photo's owner gets a notification. Never requires feedback and never counts toward the Decision feedback rules' one-time trigger.

**`prototype/`:**

- Added a like (heart) button to the photo lightbox on `profile-view.html` (viewing someone else's profile), next to the photo counter. Liking toggles per-photo, persists while the lightbox stays open, and shows a confirmation toast. Only added there — My Profile's own lightbox (`profile.html`) doesn't get the button, since liking your own photo doesn't make sense.
- Added a new notification to `notifications.html` demonstrating the reverse case — another person liking one of Jordan's own photos ("Naomi liked your rooftop dinner photo") — matching every other entry on that page, which are all incoming activity, not a log of Jordan's own actions.

## Why it changed

Founder request: give users a way to like individual photos, not just whole profiles, and make sure that action is visible somewhere. Since Notifications is exclusively an incoming-activity feed in this product (matches, replies, someone liking you), the natural fit is showing the photo-like from the recipient's side rather than logging the sender's own click as a receipt.
