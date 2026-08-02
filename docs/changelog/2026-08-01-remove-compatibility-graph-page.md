# 2026-08-01 — Remove Compatibility Graph page, compatibility levels replace percentages

## What changed

**`docs/prd.md`:**

- Removed **Compatibility Graph** and **Public Profile** as separate top-level sections and merged them into a single **My Profile** section: My Profile now serves three purposes — the user's editable profile, the AI's current understanding, and the source for what other users see. Each category still carries an AI-generated summary, Confidence (High/Medium/Low, never a percentage), a Visibility toggle, and Edit. The underlying structured data is documented as an internal implementation detail ("sometimes referred to as a Compatibility Graph") rather than a page or feature.
- Added a new **Compatibility Reports** section defining Overall Compatibility (High/Medium/Low/Unknown + a written summary) and category-by-category compatibility, plus formal definitions for all four levels — including that Unknown is never treated as Medium.
- Rewrote **How the core ideas fit together** (previously "How the AI-Facing Pages Fit Together") around four concepts instead of four pages: AI Matchmaker (conversation), My Profile, AI Memory, AI Profile Coach. Replaced the old pipeline diagrams with one simplified flow: `Conversation → AI generates a session summary → AI Memory → Update affected profile categories → My Profile → Compatibility Reports → Recommendations`, closed by AI Profile Coach launching another conversation when it finds a gap.
- Swept every remaining "Compatibility Graph" reference in Matching, AI Matchmaker, AI-Assisted Photos, AI Profile Coach, and Monetization to point at My Profile instead.

**`prototype/`:**

- Deleted `compatibility-graph.html` and removed its link from the sidebar nav and mobile tab bar on every authenticated page, and from the public-page footer and copy that referenced it (about, pricing, terms, privacy, contact, delete-account, onboarding, settings, index).
- Removed the now-dead `initGraphItemRemove()` function from `app.js` (only used by the deleted page).
- AI Memory's "Updated" category tags (Family, Travel, Lifestyle, Career, Religion & Spirituality, Politics removed, Relationship Goals) are now links straight to the matching category on My Profile, via new `id="category-*"` anchors added to each My Profile card and an `id="basics"` anchor for Relationship Goals.
- Removed all compatibility percentages (91%/83%/77% match badges on Recommendations and Matches cards) in favor of High/Medium compatibility badges.
- Rebuilt the Compatibility Report page: the circular percentage gauge is replaced with an Overall Compatibility level (High) plus a written summary, followed by a new category-by-category list (Relationship Goals, Religion & Spirituality, Lifestyle, Children, Money Management, Communication Style) each showing a level — including Money Management as Unknown, to demonstrate that level in the mock.

## Why it changed

Founder decision: the Compatibility Graph page duplicated what My Profile's AI-generated category cards already showed, so it added a second UI for the same information without adding value. Percentages implied a precision an LLM-driven confidence/compatibility model can't consistently produce; High/Medium/Low/Unknown is honest about that limitation and gives Unknown a real meaning (not enough information) instead of collapsing it into a fake middling score. The goal is a simpler mental model: users think in terms of AI Matchmaker, My Profile, AI Memory, and AI Profile Coach — everything else is implementation detail.
