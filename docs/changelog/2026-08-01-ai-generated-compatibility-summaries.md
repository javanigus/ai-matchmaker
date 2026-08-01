# 2026-08-01 — AI-generated compatibility summaries

## What changed

Added two new subsections to the "Compatibility Graph" section of `docs/prd.md`:

- **AI-generated compatibility summaries.** Instead of exposing raw category labels (e.g. "Muslim," "Introvert"), the AI proposes a concise, well-written summary per Compatibility Graph category, synthesized from conversations, photos, browsing behavior, feedback, and corrections — since dimensions like religion-and-practice, money management, social energy, career ambition, and lifestyle exist on a spectrum rather than as simple categories. Every proposal is only a suggestion: per category, the user can Accept, Edit, Reject, or Delete it, control public visibility, and (future capability) control whether it's used for matching. The graph stays the source of truth; the public profile is a filtered, user-controlled view of it.
- **Eliminating blank text boxes.** The general principle behind the above: users provide experiences, the AI proposes structured content, the user stays in complete control. Applied wherever practical (compatibility categories, profile bios) instead of asking users to write from a blank box — helps users who dislike writing, struggle to express themselves, have poor spelling/grammar, or aren't sure what's worth including.

Also added an open question about how per-category public/matching-use controls interact with the public profile filter.

## Why it changed

Founder-accepted product decision: raw profile-field labels undersell how nuanced people actually are, and asking users to write everything themselves produces inconsistent, low-effort profiles. The AI should do the writing from what it already knows, with the user retaining full accept/edit/reject/delete control over every category — consistent with the existing principle that the AI proposes and the user decides (see AI-Assisted Photos' "Profile Photos" and "Story-Based Recommendations" for the same pattern already applied to photos).
