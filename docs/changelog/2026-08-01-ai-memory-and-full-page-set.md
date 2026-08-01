# 2026-08-01 — AI Memory page and full mockup page set

## What changed

Added a new **AI Memory** section to `docs/prd.md`, and refined the **Compatibility Graph** section to formally split responsibilities:

- Compatibility Graph answers *what does the AI currently believe* — category, current understanding, confidence, Edit, Remove. It no longer surfaces supporting evidence inline.
- AI Memory answers *why does the AI believe it* — a chronological, audit-log-style timeline of conversation quotes, uploaded photos, confidence changes, and user corrections, grouped under relative date headers.

Fleshed out the **Monetization** section with the two-tier structure (Free / Premium) and what each includes, noting pricing itself is still a placeholder.

Expanded the prototype (`prototype/`) to a full page set so no major screen has to be invented during implementation:

- **New authenticated pages**: AI Memory, Notifications, Settings (Account/Privacy/AI/Notifications/Subscription sections), Subscription & Billing, Delete Account confirmation.
- **New public pages**: Pricing (Free/Premium tiers), About, Contact Support, Privacy Policy, Terms of Service.
- **New auth pages**: Log In, Sign Up, Forgot Password, Reset Password.
- Simplified the existing Compatibility Graph page's copy and added a cross-link to AI Memory; added a matching cross-link back from AI Memory.
- Added AI Memory, Notifications, and a live Settings link to the shared sidebar nav across all existing authenticated pages; added a "More" links section to My Profile as a secondary hub for mobile.
- Added a thumbnail strip to the full-screen photo lightbox (used by My Profile and Full Profile View) alongside its existing prev/next, keyboard, swipe, zoom, and 85vw-width behavior.
- Updated `index.html`'s header/footer to link the new public pages.

## Why it changed

Founder decision: the mockups should reach full product completeness before implementation starts, so engineering implements existing, agreed-upon screens rather than inventing UX mid-build. AI Memory specifically was split out from Compatibility Graph so the graph stays a clean, scannable summary while the full evidentiary history (quotes, photos, corrections) remains fully transparent and available, just one layer deeper.
