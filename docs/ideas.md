# Ideas Backlog

> Status: Living document
> Last updated: 2026-08-08

Brainstorming notes and ideas that have **not yet been accepted**. Nothing here is a commitment. When an idea is accepted, move it into [prd.md](prd.md) (or [vision.md](vision.md) if it's principle-level) and remove it from this list.

## Make chat-based onboarding optional; allow filling out a profile via a form instead

**Raised by:** founder, 2026-08-08, after real-browser testing of onboarding.

**The founder's stated reasoning:** onboarding chat response times are slow (each turn can take several seconds — worse on a transition turn, since that path now makes two sequential-feeling LLM calls, see `PROGRESS.md`'s Phase 2 fixes), and the interview has grown complex (6 baseline categories, each with a two-step quick-pick-then-follow-up flow, LLM-driven category transitions). Proposal: let a user fill out their profile directly via a form as an alternative path, with talking to the AI Matchmaker always optional rather than required to reach a published profile.

**Real tension to weigh before accepting this, not a reason to reject it — just context the founder should have when picking this back up:** this would be a significant departure from a principle stated repeatedly and specifically throughout `vision.md` and `prd.md`, not an incidental detail:
- `vision.md:10`: "...replacing static profile forms with an ongoing, AI-guided conversation."
- `vision.md:28`: static profile forms are described as "shallow by construction... captures what a person is willing and able to type into a form, not who they actually are."
- `vision.md:48/59`: "Conversational AI onboarding instead of long forms and rigid profile creation" is listed as a core differentiator.
- `prd.md:30/50/142`: "The AI Matchmaker is the only editor... there are no separate forms, questionnaires, popups, or category editors that write to it directly," repeated near-verbatim in three places.

This was also flagged independently, early in this project's build (before any real code existed), in a business-recommendations pass: *"Your real differentiator is already strong — protect it from scope creep... The biggest business risk to this isn't a competitor copying it — it's you, mid-build, adding 'just one quick edit form' for expedience. Treat that rule as load-bearing brand identity, not a nice-to-have."*

None of this means the founder's underlying problem (slow, complex onboarding) isn't real and worth solving — it clearly is. But there's a meaningful difference between two versions of this idea worth distinguishing when it's picked back up:
1. **A narrower fix**: make the existing conversational onboarding faster/simpler (fewer categories required for baseline, snappier model, collapse the two-step per-category flow, etc.) without adding a second, non-conversational input path.
2. **The idea as stated**: a real form-based alternative path that writes directly to My Profile, which is exactly the thing `prd.md` currently rules out by name ("no separate forms... that write to it directly").

Worth explicitly deciding which of these (or some third option) is actually wanted before implementing anything, since option 2 is a product-identity decision, not just an engineering one.
