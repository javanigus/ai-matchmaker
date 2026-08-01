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

The graph continuously evolves as the user has more conversations with their AI Matchmaker. It is built and updated from the onboarding interview (see AI Interview above), from ongoing conversations, from match browsing feedback (see Match Browsing & Feedback below), and from Learning Photos (see AI-Assisted Photos below). Whenever the AI believes the graph should change, it asks the user for confirmation before applying the change. Removing a piece of evidence (e.g. deleting a Learning Photo) does not automatically erase a belief if that belief is still supported by other evidence.

Open questions: exact schema for entries and their relationships; how confidence scores are calculated and updated over time; how history/versioning of graph changes is represented.

## AI Matchmaker

Every user has a persistent AI Matchmaker. Beyond the onboarding interview, users can chat with their AI Matchmaker at any time — these conversations help the user, answer questions, and provide advice, while gradually improving the Compatibility Graph. After every conversation, the AI summarizes new beliefs, updated beliefs, and unchanged beliefs. The AI may continue learning about the user throughout their lifetime on the platform. It also stays available and context-aware while the user browses matches (see Match Browsing & Feedback below).

The AI Matchmaker can answer questions, discuss matches, explain recommendations, help improve the user's profile, help users understand themselves better, and naturally learn more about the user through conversation. Every meaningful part of the dating experience — onboarding, profile editing, photo coaching, compatibility explanations, discussing likes/passes, changing preferences, dating advice, debriefing a date — should be reachable through it (see [vision.md](vision.md) Guiding Principles); it should feel like the user's personal matchmaker, not a separate app feature. Users should never feel abandoned while waiting for matches: meaningful progress is always possible by talking with their AI Matchmaker.

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

## AI-Assisted Photos

The product distinguishes two separate concepts: **Learning Photos** (private) and **Profile Photos** (public).

**Learning Photos.** Users may upload up to 100 photos. These are private and used only by the AI Matchmaker to better understand the user — e.g. interests, hobbies, lifestyle, travel style, creativity, family orientation, health and fitness, social preferences, personality signals. They become evidence contributing to the Compatibility Graph (see Compatibility Graph above). Deleting or hiding a Learning Photo does not automatically erase a belief if that belief is also supported by other evidence (conversation, other photos, user feedback, etc.).

**Profile Photos.** Users decide which photos appear publicly on their profile. The AI recommends the strongest set of profile photos along with explanations, but the user always has the final decision. The AI never automatically replaces or publishes profile photos.

**AI Photo Coaching.** After analyzing uploaded photos, the AI Matchmaker starts a natural conversation about what it noticed (e.g. "I noticed many of your photos are travel photos. Is traveling a major part of your life?"). This serves two goals at once: helping the user build a stronger profile, and learning more about the user.

**Story-Based Recommendations.** The AI evaluates the story a profile communicates as a whole, rather than judging individual photos in isolation — e.g. what the profile currently communicates strongly, and what it communicates less. It explains every recommendation and never simply calls a photo "bad"; instead it explains what each photo communicates and what might be missing from the overall story.

## Platform

The product supports both web and mobile as first-class experiences. Desktop is well suited for onboarding interviews, long AI conversations, uploading and reviewing photos, profile management, and reviewing compatibility explanations. Mobile is well suited for browsing matches, messaging, voice conversations with the AI Matchmaker, notifications, and dating on the go.

## Monetization

The business model is tiered subscriptions. Higher tiers primarily provide additional AI capabilities and higher AI usage limits. The product does not monetize through boosts, super likes, paid visibility, or artificial scarcity — this aligns with the principle that the AI works for the user rather than maximizing engagement (see [vision.md](vision.md) Guiding Principles).

Open questions: specific tiers, pricing, and usage limits.

## Roadmap

_Pending: roadmap not yet defined._
