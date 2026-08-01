# Product Requirements Document (PRD)

> Status: Living document
> Last updated: 2026-08-01

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

**Compatibility Graph vs. AI Memory.** The Compatibility Graph answers *what does the AI currently believe* — it shows each belief's category, current understanding, and confidence, plus the ability to edit or remove it. It deliberately does not surface supporting evidence (quotes, photos, timestamps) inline; that belongs on the separate AI Memory (see AI Memory below), which answers *why does the AI believe it*. This keeps the graph itself scannable while still making the underlying evidence fully available one click away.

Open questions: exact schema for entries and their relationships; how confidence scores are calculated and updated over time.

## AI Memory

AI Memory is a chronological, audit-log-style timeline of how the AI Matchmaker has learned about the user — the "why" behind every belief in the Compatibility Graph. Where the Compatibility Graph is a clean current snapshot, AI Memory is the history: every conversation quote, uploaded photo, confidence change, and user correction that shaped it, in the order it happened.

Each entry shows its source (conversation, Learning Photos, onboarding interview, or a user correction), a timestamp, and what changed as a result — a belief added with its confidence delta, or a belief removed with the reason (typically that the user corrected an AI inference). Entries group under relative date headers (Today, Yesterday, 3 days ago, and so on).

This split exists so the Compatibility Graph can stay simple and glanceable while nothing about how the AI reached its conclusions is ever hidden — a user who wants the full story behind a single belief always has somewhere to look.

Open questions: how far back history is retained; whether entries can be filtered by category or source.

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

**Optional feedback, with one exception.** Users may optionally give a physical-attraction rating, quick reasons for liking/passing, and a free-flow spoken or typed comment for the AI. Free-flow comments are especially valuable since they can carry multiple positive and negative signals at once. Feedback is optional everywhere except the single case covered by Decision feedback rules below — the product must never force a survey after every profile beyond that one, one-time exception.

**Context-aware follow-ups.** The AI decides whether a follow-up is worthwhile and avoids repetitive or unnecessary questions, especially when the reason is already clear from a confirmed hard dealbreaker. It may summarize its interpretation and let the user correct it (e.g. "I understood that you found her attractive, but passed because she has children and appears to prefer a nightlife-oriented lifestyle. Is that correct?").

**User control over interruptions.** Users can control how often the AI speaks while browsing, via controls such as: Ask me fewer questions, Only ask when important, Pause suggestions, Do not talk until I message you, Resume helping. The AI defaults to restrained, useful interventions rather than asking about every action.

**Recently passed profiles.** Users can return to the most recently viewed or passed profile to review details before answering the AI's question.

**Decision feedback rules.** Every AI-generated recommendation carries a unique `recommendation_id`. The first time a user makes a final decision — Pass or Like — on that recommendation, free-form feedback is required before the decision is recorded. This holds no matter where the decision happens: the AI Recommendations page, the profile's Full Profile page, or Saved Profiles (if the profile originated from an AI recommendation). Feedback is collected only once per recommendation — once given, later revisits to the same recommendation never ask again. Profiles surfaced through manual Search never require decision feedback, since the user chose to view them rather than the AI recommending them. The governing rule stays simple and applies everywhere: if a profile came from an AI recommendation, the user's first Pass or Like on it requires feedback; everything else behaves consistently throughout the product.

**Save is not a decision.** Saving a profile — from AI Recommendations or from manual Search — is a temporary, reversible bookmark, not a Pass or Like, and it never requires feedback. Saved Profiles is simply a holding area for profiles the user hasn't decided on yet. When a saved profile is eventually Passed or Liked, the Decision feedback rules above still apply based on where the profile originated: feedback is required if it came from an AI recommendation, and not required if it came from manual Search.

**Undo.** Pass, Like, and Save are all reversible immediately after the action, via a toast/snackbar or inline Undo control. Undoing a Pass or Like restores the profile to its prior, undecided state. Undoing a Save removes the profile from Saved Profiles.

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

**Tiers (placeholder — functionality is decided, pricing is not).** Two tiers for now:

- **Free** — AI onboarding interview, unlimited manual Search, a limited number of AI Recommendations, and basic Compatibility Reports.
- **Premium** — unlimited AI Recommendations, unlimited Compatibility Reports, a more advanced AI Matchmaker for deeper conversations, and priority placement in other users' recommendations.

Every user, regardless of tier, keeps full manual Search and full ownership of their Compatibility Graph and AI Memory — paying only ever unlocks more from the AI, never more visibility or reach at other users' expense.

Open questions: exact recommendation/report limits on Free; final pricing; whether additional tiers are needed.

## Roadmap

_Pending: roadmap not yet defined._
