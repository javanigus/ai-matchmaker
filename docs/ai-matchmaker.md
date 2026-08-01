# AI Matchmaker

> Status: Active — Version 1
> Last updated: 2026-07-31

## Purpose

Every user has a persistent AI Matchmaker. It gets to know the user through conversation instead of forms, builds and maintains the user's [Compatibility Graph](compatibility-graph.md), and helps the user find a compatible long-term partner.

## Responsibilities

- **Onboarding interview.** The AI interviews the user conversationally (not via long forms) to build an initial understanding. There is a minimum set of required topics, but the AI may reach them through any conversational path — the interview is not a fixed script. The interview ends when the AI has sufficiently high confidence that it understands the user, not after a fixed number of questions.
- **Ongoing conversation.** Users can chat with their AI Matchmaker at any time. These conversations help the user, answer questions, and provide advice, while gradually improving the Compatibility Graph.
- **Confirmation before change.** Whenever the AI believes the Compatibility Graph should change, it asks the user for confirmation before applying the change.
- **Post-conversation summary.** After every conversation, the AI summarizes new beliefs, updated beliefs, and unchanged beliefs.
- **Lifetime learning.** The AI may continue learning about the user throughout their lifetime on the platform.

## Interaction Model

Users may speak or type. The AI asks dynamic follow-up questions rather than presenting static fields, adapting the conversation based on what it already knows and how confident it is.

## Open Questions

- What is the specific minimum set of required onboarding topics?
- What confidence threshold is used to end the onboarding interview?
- What are the scope boundaries for advice given during ongoing conversations?
