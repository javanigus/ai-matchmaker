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

**The AI Matchmaker is the only editor.** The AI Matchmaker conversation is the only interface allowed to modify the Compatibility Graph — there are no separate forms, questionnaires, popups, or category editors that write to it directly. Editing a Public Profile section's displayed text (see Public Profile below) changes only what's published; it never writes back to the graph. Every change to the graph produces a corresponding AI Memory entry explaining why it changed (see AI Memory below).

**Compatibility Graph vs. AI Memory.** The Compatibility Graph answers *what does the AI currently believe* — it shows each belief's category, current understanding, and confidence, plus the ability to edit or remove it. It deliberately does not surface supporting evidence (quotes, photos, timestamps) inline; that belongs on the separate AI Memory (see AI Memory below), which answers *why does the AI believe it*. This keeps the graph itself scannable while still making the underlying evidence fully available one click away.

**AI-generated compatibility summaries.** Many compatibility dimensions — religion and level of practice, money management, cleanliness and organization, social energy, career ambition, travel style, communication style, family orientation, health and fitness, political views, lifestyle, and more — exist on a spectrum, not as simple categories. A raw label like "Muslim" or "Introvert" is often too broad to represent a person accurately. Instead of exposing only raw categories, the AI proposes a concise, well-written summary for each Compatibility Graph category, synthesized from conversations, uploaded photos, browsing behavior, feedback, and corrections. For example, rather than showing just "Muslim" under Religion & Spirituality, the AI might propose: "Practicing Muslim. Faith plays an important role in daily life while maintaining a balanced and moderate approach. Looking for someone with similar values." Every proposal is only a suggestion — for each category, the user may Accept, Edit, Reject, or Delete it. Matching always reasons over the full graph regardless of what's public (see Public Profile below for the public/private split).

**Eliminating blank text boxes.** The broader principle behind this: users provide experiences, the AI proposes structured content from them, and the user remains in complete control. Wherever practical, the product avoids asking users to write long-form text from a blank box — instead the AI continuously drafts concise, well-written summaries (compatibility categories, profile bios) that the user approves or edits rather than authoring from scratch. This particularly helps users who dislike writing, struggle to express themselves, have poor spelling or grammar, or aren't sure what's worth including — while producing profiles that are clearer, more consistent, and more informative for potential matches.

Open questions: exact schema for entries and their relationships; how confidence scores are calculated and updated over time.

## Public Profile

The Public Profile is the user-approved, public-facing view derived from the Compatibility Graph — never a second place where profile data is separately entered or stored. It reads as narrative sections the AI wrote and the user approved, not a table of raw field values. Structured field values (the raw facts underneath — "Religion: Muslim," "Children: wants children") still exist internally on the Compatibility Graph for filtering and matching; the Public Profile is not that table, it's prose synthesized from it.

**Required fields.** A small set of fields is always public and cannot be hidden: Name, Age, Gender, City/State/Country, and Occupation. Location is always shown as city, state, and country only — never an exact address, and never distance from another user. There is no visibility toggle for required fields; they aren't part of the AI-summary/edit/approve model since they're simple facts, not spectrum categories.

**Optional narrative sections.** Every other category — About, Religion & Spirituality, Family, Relationship Goals, Career, Learning, Lifestyle, Travel, Communication Style, Fitness, Money Management, Cleanliness, Social Energy, Conflict Resolution, Politics, Food, Pets, and so on — is optional and follows the AI-generated compatibility summaries model above: an AI-proposed narrative description, an Edit control, and a Visible toggle. The user can edit any section's description before it's published, but editing changes only the published text, never the underlying Compatibility Graph belief. Turning Visible off removes that section from the Public Profile **entirely** — it is not shown greyed out or as an empty placeholder, it simply isn't rendered. The AI still knows it, the Compatibility Graph still carries it, and the AI Matchmaker still reasons over it for matching — visibility is strictly a publishing decision, not a learning or matching one.

There is no separate Interests list. Interests aren't a category of their own — content that used to live in a tag list (travel, yoga, farmers markets, and so on) is folded naturally into whichever narrative section it belongs to instead, typically Lifestyle or Travel.

**Architecture: one source of truth.** Public Profile content flows in one direction and is never duplicated:

```
AI Memory → Compatibility Graph → AI-generated summaries → user edits/approves → Public Profile
```

AI Memory supplies the evidence; the Compatibility Graph holds the current belief; the AI drafts a summary from that belief; the user edits and approves it; the Public Profile renders whatever's currently approved and marked Visible. There is no separate profile-data store — editing a summary edits the graph's record of it, and the Public Profile always reflects the graph's current, approved state.

Open questions: exact list of always-required vs. optional categories at launch; whether users can reorder which optional categories appear first.

## AI Memory

AI Memory is a chronological, audit-log-style timeline of how the AI Matchmaker has learned about the user — the "why" behind every belief in the Compatibility Graph. Where the Compatibility Graph is a clean current snapshot, AI Memory is the history: every conversation quote, uploaded photo, confidence change, and user correction that shaped it, in the order it happened.

Each entry shows its source (conversation, Learning Photos, onboarding interview, or a user correction), a timestamp, and what changed as a result — a belief added with its confidence delta, or a belief removed with the reason (typically that the user corrected an AI inference). Entries group under relative date headers (Today, Yesterday, 3 days ago, and so on).

This split exists so the Compatibility Graph can stay simple and glanceable while nothing about how the AI reached its conclusions is ever hidden — a user who wants the full story behind a single belief always has somewhere to look.

Open questions: how far back history is retained; whether entries can be filtered by category or source.

## AI Profile Coach

AI Profile Coach is a proactive coach for improving profile quality and future recommendations — distinct from both the Compatibility Graph (what the AI believes) and AI Memory (why it believes it). Where those two are records, AI Profile Coach is an actionable to-do list.

The page leads with an **Overall Profile Quality** score (e.g. 82%, shown as a progress bar), based on how complete and confident the Compatibility Graph is and how much of it is actually reflected in the Public Profile.

Below it, a list of **Suggestions**, each explaining why it matters, its current confidence, its estimated improvement, and offering a single one-click action.

**AI Profile Coach never gathers information itself.** It identifies gaps and low-confidence categories in the Compatibility Graph, but it never asks a question or collects an answer directly — that would make it a second, competing input channel into the graph. Its only action is to launch or continue a conversation with the AI Matchmaker, where the actual learning happens (see "The AI Matchmaker is the only editor" under Compatibility Graph above). The one exception is photos: since Learning Photos are already their own established, non-conversational input channel (see AI-Assisted Photos below), photo suggestions link straight to uploading rather than to a conversation.

Example suggestions:

- "Add one smiling outdoor photo." — *Estimated improvement: +4%* — action: Upload photos.
- "Lifestyle confidence is only 48%." — action: Chat about Lifestyle.
- "Money Management hasn't been learned yet." — action: Chat about Money Management.
- "Family values are still unclear." — action: Talk about Family.
- "Travel could become more complete." — action: Tell me more about Travel.
- "Communication Style confidence is still Medium." — action: Chat about Communication Style.
- "Religion & Spirituality hasn't come up in a while." — action: Discuss Religion.
- "Your public profile says very little about your long-term relationship goals." — action: Continue conversation.

Suggestions are generated from gaps and low-confidence categories in the Compatibility Graph, so they update as the graph does — the score and the list are never static. A suggestion disappears automatically once its conversation fills the corresponding gap; the user never has to dismiss it manually.

Open questions: exact scoring formula; how many suggestions are surfaced at once.

## How the AI-Facing Pages Fit Together

Four pages touch the Compatibility Graph, and each has one clear, non-overlapping job:

- **AI Memory** — a chronological timeline of everything the AI has learned: quotes, uploaded photos, corrections, and confidence changes. Answers *why does the AI believe this*.
- **Compatibility Graph** — the AI's current understanding of the user. Answers *what does the AI currently believe*.
- **Public Profile** — the user-approved, public-facing version derived from the Compatibility Graph. Answers *what does everyone else see*.
- **AI Profile Coach** — actionable recommendations to improve profile quality, AI confidence, and future matches. Answers *what should I do next*.

These four are complementary views over the same single source of truth, not four separate stores of profile data.

**The core product experience.** The AI Matchmaker conversation is the only way to teach the AI anything — there are no popup forms, questionnaires, or category editors that feed the Compatibility Graph directly. Everything else in the product is downstream of that one conversation, in a loop that keeps closing:

```
Conversation → Compatibility Graph → AI-generated Profile → Recommendations → AI Profile Coach → Conversation
```

A conversation updates the graph (with AI Memory recording why). The graph drives the AI-generated Public Profile and Recommendations. AI Profile Coach watches the graph for gaps and low confidence, and its only action is to launch another conversation — which closes the loop.

## AI Matchmaker

Every user has a persistent AI Matchmaker. Beyond the onboarding interview, users can chat with their AI Matchmaker at any time — these conversations help the user, answer questions, and provide advice, while gradually improving the Compatibility Graph. After every conversation, the AI summarizes new beliefs, updated beliefs, and unchanged beliefs. The AI may continue learning about the user throughout their lifetime on the platform. It also stays available and context-aware while the user browses matches (see Match Browsing & Feedback below).

The AI Matchmaker can answer questions, discuss matches, explain recommendations, help improve the user's profile, help users understand themselves better, and naturally learn more about the user through conversation. Every meaningful part of the dating experience — onboarding, profile editing, photo coaching, compatibility explanations, discussing likes/passes, changing preferences, dating advice, debriefing a date — should be reachable through it (see [vision.md](vision.md) Guiding Principles); it should feel like the user's personal matchmaker, not a separate app feature. Users should never feel abandoned while waiting for matches: meaningful progress is always possible by talking with their AI Matchmaker.

Open questions: scope boundaries for advice given during ongoing conversations.

## Matching

The matching engine finds compatible long-term partners for a user by reasoning over the Compatibility Graph rather than over profile fields alone. Inputs are Compatibility Graph entries: facts, preferences, inferred values, confidence scores, supporting evidence, and the AI-generated summaries themselves (see AI-generated compatibility summaries above) — rich prose rather than simple labels. Matching always reasons over the full graph regardless of what a user has chosen to make public (see Public Profile). Users receive compatibility explanations rather than only a compatibility score.

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

- **Free** — AI onboarding interview, unlimited manual Search, limited AI Recommendations, limited AI Matchmaker conversations, and basic Compatibility Reports. Conversations with the AI Matchmaker are rate-limited, not blocked, so every user experiences the real product before ever paying.
- **Premium** — unlimited AI Recommendations, unlimited Compatibility Reports, unlimited AI Matchmaker conversations, advanced/deeper Compatibility Reports, and early access to new AI features.

The governing rule: **Premium unlocks more AI. It never buys unfair visibility.** There is no priority placement, no boosts, no Super Likes, and no paid visibility at any tier. Every user, regardless of tier, keeps full manual Search and full ownership of their Compatibility Graph and AI Memory.

Open questions: exact recommendation/report/conversation limits on Free; final pricing; whether additional tiers are needed.

## Roadmap

_Pending: roadmap not yet defined._
