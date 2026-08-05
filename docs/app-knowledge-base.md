# AI Matchmaker — App Knowledge Base

> This is the AI Matchmaker chat's tech-support reference — loaded directly into its system prompt on every message (see `src/app/api/chat/message/route.ts`). It describes only what's actually built and real in the app right now. Keep it factual, thorough but concise, and update it in the same commit as any change to what's real — a stale entry here is worse than no entry, since the AI trusts this file as ground truth and states its contents as fact.

## What this app is

An AI-native dating app. The core idea: instead of filling out profile forms, you talk to your AI Matchmaker in conversation, and it builds your dating profile for you — proposing what it learned, which you always review and approve before anything becomes real or public.

## Onboarding

The first conversation, right after signing up. Purely conversational — no forms. The AI Matchmaker asks about 6 baseline categories, one at a time, each in two steps:

1. A quick, easy first question with a small set of options to pick from (shown as tappable buttons).
2. An open-ended follow-up that goes deeper, once the quick pick is answered.

The 6 baseline categories are: Relationship Goals, Family, Religion & Spirituality, Lifestyle, Career, Social Energy. Onboarding ends once all 6 have a solid enough answer — at that point the user is sent to My Profile to review everything the AI picked up, and the AI Matchmaker becomes available everywhere else in the app from then on.

## My Profile

Everything the AI currently believes about the user, organized into 12 categories total: the 6 baseline ones above, plus 6 additional ones — Communication Style, Travel, Fitness, Learning, Money Management, Politics. The additional 6 aren't asked about during onboarding; they fill in over time through ordinary conversation with the AI Matchmaker.

Key rules:
- **Nothing the AI writes is final until approved.** Every AI-proposed update to a category shows up as a pending draft the user must **Approve**, **Edit**, or **Keep current text** (dismiss) — nothing changes automatically, and nothing pending is used anywhere else (matching, what other users see) until it's approved.
- Each category has a **Visibility** toggle controlling whether it's shown on the user's public profile. Turning it off doesn't stop the AI from learning or using it for matching — it only controls what other people can see.
- Some categories also have a **quick_fact** — a short, structured pick (e.g. an exact religion, or one specific relationship-goal type) alongside the longer written text.
- **Basics** (Age, Gender, Location, Occupation, Ethnicity) are simple facts entered directly on My Profile, not through conversation — there's no ambiguity for the AI to interpret there.
- **Publishing** makes the profile visible to other users. It requires every Basics field to be filled in, and is a separate, deliberate step — reaching a solid profile doesn't publish it automatically.

## Dealbreakers

Hard requirements about a partner, set directly on My Profile (a form, not a conversation) — since these are simple, unambiguous facts, not something for the AI to interpret. Always private; never shown on the public profile or to anyone they exclude.

Structured dealbreakers: Age range, Gender, Religion, Ethnicity, Children, Education level. Distance isn't available yet (the app doesn't currently store precise location, only city/state). There's also a free-text list of custom dealbreakers for anything that doesn't fit those structured fields.

## Search

A plain directory of every published profile, with real filters (Age range, Gender, Religion, Children, Education, Relationship goals). No AI involved in Search at all — it's manual browsing. Usable even before finishing onboarding.

## AI Memory

A timeline of how the AI has gotten to know the user — one entry per conversation, showing what was learned and which profile categories it touched. Each entry has a status: **Confirmed** (the user has reviewed/approved everything that entry proposed) or **AI inferred** (something from that entry is still an unreviewed pending draft on My Profile).

## AI Matchmaker (this chat)

Always available once onboarding is done — on My Profile and Search right now (more pages will get it as they're built). Three things it can help with:

1. **Improving the user's profile** — filling in categories that are still empty, refining what's already there, thinking through how to describe themselves.
2. **How the app works** — this document is exactly what it draws on for that; it should never guess or improvise about a feature.
3. **General relationship and dating topics** — advice and reflection that isn't tied to a specific match.

## Not built yet

Say so plainly if asked about any of these — never guess, describe, or imply they exist:

- **AI Recommendations** — a curated list of suggested matches.
- **Match Browsing** — Pass/Like/Save/Undo on candidate profiles.
- **Matches & Messages** — mutual likes, in-app messaging.
- **Compatibility Reports** — AI-written explanations of why two people might be compatible.
- **AI Profile Coach** — a prioritized to-do list of profile improvements.
- **Photos** — no photo upload or moderation exists yet.
- **Distance-based filtering** — the app doesn't store precise location yet, only city/state.
