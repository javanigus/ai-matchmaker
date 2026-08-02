# 2026-08-02 — Routing before baseline is reached, message retention policy

## What changed

**`docs/prd.md`:**
- New "Before onboarding is complete" paragraph (AI Interview section): Search stays open regardless of onboarding status; every other page that depends on a profile (My Profile, AI Memory, AI Recommendations, Matches, Messages, Compatibility Reports) redirects to the onboarding conversation until baseline is reached. Returning to an abandoned interview resumes it rather than restarting.
- New "Data retention" bullet (Trust & Safety): raw chat messages are deleted 30 days after being sent, for every user.

**`docs/technical-plan.md`:**
- New "Routing before baseline is reached" subsection (Onboarding section): the `baseline_reached_at` check that gates redirect-to-onboarding; Search as the one exception; the persistent AI Matchmaker panel only appearing once baseline is reached (Search shows a banner/CTA instead, so there's one "talk to the AI" surface, not two); resume working via the existing profile-snapshot mechanism rather than replaying raw messages.
- New paragraph clarifying that the AI Memory narrative paragraph (unlike category-update extraction) is *not* fired per session-close during onboarding — it's deferred and generated once, consolidated, when baseline is reached, so an in-progress multi-session onboarding doesn't scatter fragmentary entries across the AI Memory timeline.
- New "Data retention" top-level section: the 30-day `messages` deletion rule, why it's safe (everything durable is already extracted before the window closes), and the one accepted tradeoff (an unusually slow, multi-session onboarding could lose some early color in its eventual consolidated AI Memory paragraph — the structured category data itself is unaffected).

**`prototype/search.html`:** added a banner ("Haven't talked to your AI Matchmaker yet?" → onboarding.html) shown above the filter bar, representing the pre-baseline state a first-time visitor from the homepage's "browse profiles first" link would see. Documented in an HTML comment that this replaces the persistent AI panel shown on every other page — the two are mutually exclusive, not shown together — since a fully static mockup can't represent both account states on one page.

## Why it changed

Founder question: if someone browses before completing onboarding, what happens when they try to reach a page like My Profile that has nothing in it yet? There was no defined behavior. Working through it surfaced two more gaps worth resolving at the same time: message retention (raw chat can't be kept forever, but "resume" needs *something* to pick up from) and a timing question about when the AI Memory summary itself should be created during an in-progress, possibly abandoned onboarding.
