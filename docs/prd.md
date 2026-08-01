# Product Requirements Document (PRD)

> Status: Living document
> Last updated: 2026-07-31

The single living PRD. Everything below has been accepted. Unaccepted ideas live in [ideas.md](ideas.md); long-term vision and principles live in [vision.md](vision.md).

## MVP

_Pending: MVP scope not yet defined._

## AI Interview

The AI interviews the user conversationally (not via long forms) to build an initial understanding. There is a minimum set of required topics, but the AI may reach them through any conversational path — the interview is not a fixed script. The interview ends when the AI has sufficiently high confidence that it understands the user, not after a fixed number of questions. Users may speak or type; the AI asks dynamic follow-up questions rather than presenting static fields.

Open questions: exact minimum set of required topics; confidence threshold used to end the interview.

## Compatibility Graph

The Compatibility Graph is the source of truth for what the AI Matchmaker understands about a user. The public profile is only one view of the graph — the graph itself is the authoritative record.

Each entry in the graph carries:

- **Facts** — things known about the user.
- **Preferences** — what the user wants or values.
- **Inferred values** — conclusions the AI has drawn rather than things the user stated directly.
- **Confidence scores** — how certain the AI is about a given fact, preference, or inference.
- **Supporting evidence** — what the belief is based on.
- **Timestamps** — when the belief was created or last updated.
- **User confirmation** — whether the user has confirmed the belief.

The graph continuously evolves as the user has more conversations with their AI Matchmaker. It is built and updated from the onboarding interview (see AI Interview above), from ongoing conversations, and from match browsing feedback (see Match Browsing & Feedback below). Whenever the AI believes the graph should change, it asks the user for confirmation before applying the change.

Open questions: exact schema for entries and their relationships; how confidence scores are calculated and updated over time; how history/versioning of graph changes is represented.

## AI Matchmaker

Every user has a persistent AI Matchmaker. Beyond the onboarding interview, users can chat with their AI Matchmaker at any time — these conversations help the user, answer questions, and provide advice, while gradually improving the Compatibility Graph. After every conversation, the AI summarizes new beliefs, updated beliefs, and unchanged beliefs. The AI may continue learning about the user throughout their lifetime on the platform. It also stays available and context-aware while the user browses matches (see Match Browsing & Feedback below).

Open questions: scope boundaries for advice given during ongoing conversations.

## Matching

The matching engine finds compatible long-term partners for a user by reasoning over the Compatibility Graph rather than over profile fields alone. Inputs are Compatibility Graph entries: facts, preferences, inferred values, confidence scores, and supporting evidence. Users receive compatibility explanations rather than only a compatibility score.

Open questions: specific scoring/ranking methodology; how confidence scores factor into a match; how explanations are generated from the graph.

## Match Browsing & Feedback

The AI Matchmaker stays available and context-aware while the user browses profiles. Match-related interactions feel like conversation with the user's personal matchmaker, not a feedback form.

**Signal extraction from likes/passes.** The AI knows which profile a like or pass applies to and may ask a brief follow-up (e.g. "What influenced your decision?") when the reason would materially improve the Compatibility Graph. It extracts separate signals from the answer — e.g. physical attraction, dealbreakers, overall outcome — rather than collapsing them into one. A pass must never be treated as equivalent to a lack of physical attraction.

**Optional feedback.** Users may optionally give a physical-attraction rating, quick reasons for liking/passing, and a free-flow spoken or typed comment for the AI. Free-flow comments are especially valuable since they can carry multiple positive and negative signals at once. Feedback is always optional — the product must never force a survey after every profile.

**Context-aware follow-ups.** The AI decides whether a follow-up is worthwhile and avoids repetitive or unnecessary questions, especially when the reason is already clear from a confirmed hard dealbreaker. It may summarize its interpretation and let the user correct it (e.g. "I understood that you found her attractive, but passed because she has children and appears to prefer a nightlife-oriented lifestyle. Is that correct?").

**User control over interruptions.** Users can control how often the AI speaks while browsing, via controls such as: Ask me fewer questions, Only ask when important, Pause suggestions, Do not talk until I message you, Resume helping. The AI defaults to restrained, useful interventions rather than asking about every action.

**Recently passed profiles.** Users can return to the most recently viewed or passed profile to review details before answering the AI's question.

## Monetization

_Pending: monetization strategy not yet defined._

## Roadmap

_Pending: roadmap not yet defined._
