# Product Requirements Document (PRD)

> Status: Living document
> Last updated: 2026-08-01

The single living PRD. Everything below has been accepted. Unaccepted ideas live in [ideas.md](ideas.md); long-term vision and principles live in [vision.md](vision.md).

## MVP

_Pending: MVP scope not yet defined._

## AI Interview

The AI interviews the user conversationally (not via long forms) to build an initial understanding. There is a minimum set of required topics, but the AI may reach them through any conversational path — the interview is not a fixed script. The interview ends when the AI has sufficiently high confidence that it understands the user, not after a fixed number of questions. Users may speak or type; the AI asks dynamic follow-up questions rather than presenting static fields.

Open questions: exact minimum set of required topics; confidence threshold used to end the interview.

## My Profile

My Profile is the single place a user reviews what their AI Matchmaker currently understands about them. It serves three purposes at once: the user's editable profile, the AI's current understanding of the user, and the source for what other users see. There is no separate page showing the AI's understanding of a user — My Profile is it.

Each category on My Profile carries:

- **An AI-generated summary** — concise, well-written prose synthesized from conversations, uploaded photos, browsing behavior, feedback, and corrections, not a raw label. Many compatibility dimensions — religion and level of practice, money management, cleanliness and organization, social energy, career ambition, travel style, communication style, family orientation, health and fitness, political views, lifestyle, and more — exist on a spectrum, not as simple categories. A raw label like "Muslim" or "Introvert" is often too broad to represent a person accurately. For example, rather than showing just "Muslim" under Religion & Spirituality, the AI might propose: "Practicing Muslim. Faith plays an important role in daily life while maintaining a balanced and moderate approach. Looking for someone with similar values." Every proposal is only a suggestion — for each category, the user may Accept, Edit, Reject, or Delete it.
- **Confidence** — High, Medium, or Low. Never shown as a percentage.
- **A Visibility toggle** — whether this category is included when someone else views the profile.
- **Edit** — the user can rewrite any category's summary before it's shown to anyone else.

Internally, each category is still backed by structured data the AI reasons over for matching — facts, preferences, inferred values, supporting evidence, and timestamps. This is sometimes referred to as a Compatibility Graph, but it is an implementation detail, not a page or feature a user visits: everything a user needs to see or edit about their own profile lives in My Profile, and there is no separate Compatibility Graph UI.

**The AI Matchmaker is the only editor.** The AI Matchmaker conversation is the only interface allowed to change what a category on My Profile believes — there are no separate forms, questionnaires, popups, or category editors that write to it directly. Editing a category's displayed summary changes only what's shown; it never changes the AI's underlying belief, which only updates through conversation. Every change produces a corresponding AI Memory entry explaining why it changed (see AI Memory below).

**How confidence is determined.** Confidence is never a function of how many times something was mentioned — five vague comments ("maybe someday") should still only produce Medium confidence, while a single clear statement can produce High confidence immediately. The AI weighs evidence quality instead, considering factors such as: explicitness (a direct statement vs. an offhand remark), certainty of language ("definitely," "never," "maybe"), direct statement vs. inference, consistency across multiple conversations, whether the user has corrected or approved the belief, recency, and whether the evidence is a direct conversation statement or something inferred from photos. "I definitely want children" produces High confidence right away; a handful of vague, hedged comments on the same topic do not.

**Required fields.** A small set of fields is always public and cannot be hidden: Name, Age, Gender, City/State/Country, and Occupation. Location is always shown as city, state, and country only — never an exact address, and never distance from another user. There is no visibility toggle for required fields; they aren't part of the AI-summary/edit/approve model since they're simple facts, not spectrum categories.

**Optional narrative sections.** Every other category — About, Religion & Spirituality, Family, Relationship Goals, Career, Learning, Lifestyle, Travel, Communication Style, Fitness, Money Management, Cleanliness, Social Energy, Conflict Resolution, Politics, Food, Pets, and so on — is optional. Turning Visibility off removes that section from what other users see **entirely** — it is not shown greyed out or as an empty placeholder, it simply isn't rendered. The AI still knows it, and the AI Matchmaker still reasons over it for matching — visibility is strictly a publishing decision, not a learning or matching one.

There is no separate Interests list. Interests aren't a category of their own — content that used to live in a tag list (travel, yoga, farmers markets, and so on) is folded naturally into whichever narrative section it belongs to instead, typically Lifestyle or Travel.

**Eliminating blank text boxes.** The broader principle behind this: users provide experiences, the AI proposes structured content from them, and the user remains in complete control. Wherever practical, the product avoids asking users to write long-form text from a blank box — instead the AI continuously drafts concise, well-written summaries (compatibility categories, profile bios) that the user approves or edits rather than authoring from scratch. This particularly helps users who dislike writing, struggle to express themselves, have poor spelling or grammar, or aren't sure what's worth including — while producing profiles that are clearer, more consistent, and more informative for potential matches.

Open questions: exact list of always-required vs. optional categories at launch; exact thresholds between Low, Medium, and High confidence; whether users can reorder which optional categories appear first.

## AI Memory

AI Memory is a chronological timeline of how the AI Matchmaker has gotten to know the user — the "how" behind what's currently shown on My Profile. It is a memory timeline, not a quote database: "How your AI Matchmaker has gotten to know you," not "every sentence you've ever said."

Each entry is one summarized learning event, not a raw quote or transcript excerpt. It shows its source (conversation, Learning Photos, onboarding interview, or a user correction), a timestamp, a plain-language summary of what was learned, which My Profile categories it updated, and — where relevant — a Status of Confirmed (the user stated it directly or approved it) or AI inferred (the AI drew a conclusion the user hasn't explicitly confirmed). It does not show confidence percentages or deltas; that granularity belongs on My Profile. Entries group under relative date headers (Today, Yesterday, 3 days ago, and so on), and each "Updated" category links straight to that category on My Profile.

This split exists so My Profile can stay simple and glanceable while nothing about how the AI reached its conclusions is ever hidden — a user who wants the story behind a single belief always has somewhere to look. See "How the core ideas fit together" below for how a conversation becomes an AI Memory entry and a My Profile update.

Open questions: how far back history is retained; whether entries can be filtered by category or source.

## AI Profile Coach

AI Profile Coach is a recommendation engine, not a scoring system — distinct from both My Profile (what the AI believes) and AI Memory (how it learned it). Where those two are records, AI Profile Coach is an actionable to-do list. It does not assign a profile score or estimate percentage improvements: an LLM cannot reliably quantify how much a given action will improve future compatibility or match quality, and a fake precision like "+4%" would mislead more than it would help.

The page description sets the tone: "Suggestions to improve your profile, help your AI Matchmaker understand you better, and increase your chances of finding compatible matches." The emphasis is coaching, not grading.

**The entire page is the recommendation list.** No score, no percentage, no progress bar — just a prioritized list of actionable recommendations, most valuable first. Each recommendation explains **why** it's useful in plain language instead of quantifying its impact, and offers a single one-click action. For example:

> **Add one smiling outdoor photo**
> Your current photos are mostly indoors and posed. A candid outdoor photo helps people understand your lifestyle better.
> [Upload photos]

**Priority, not a visible ranking algorithm.** Recommendations are ordered from most valuable to least valuable, but the user never sees or needs to know the ranking logic. Roughly, higher priority goes to: missing core compatibility categories, weak or contradictory information, missing high-quality profile photos, and a sparse profile introduction. Lower priority goes to: expanding an already-good category, adding more photos in a category that's already well covered, wording improvements, and refreshing older photos.

Example recommendations, in priority order:

- Money Management hasn't been learned yet — action: Chat about Money Management.
- Add one smiling outdoor photo — action: Upload photos.
- Your profile introduction says very little about your long-term relationship goals — action: Continue conversation.
- Family values are still unclear — action: Talk about Family.
- Lifestyle is still a bit thin — action: Chat about Lifestyle.
- Communication Style could be clearer — action: Chat about Communication Style.
- Add another travel photo — action: Tell me more about Travel.
- Religion & Spirituality hasn't come up in a while — action: Discuss Religion.

**AI Profile Coach never gathers information itself.** It identifies gaps, low-confidence categories, weak photos, and opportunities to improve the public profile, but it never asks a question or collects an answer directly — that would make it a second, competing input channel into the profile. Every recommendation that requires more information routes through the AI Matchmaker: its action launches or continues a conversation, where the actual learning happens (see "The AI Matchmaker is the only editor" under My Profile above). There are no separate questionnaires or forms. The one exception is photos: since Learning Photos are already their own established, non-conversational input channel (see AI-Assisted Photos below), photo recommendations link straight to uploading rather than to a conversation.

A recommendation disappears automatically once its conversation fills the corresponding gap; the user never has to dismiss it manually.

**The one question the page answers.** AI Profile Coach is intentionally simple. Every item on it should answer one question: *"What is the next best thing I should do to improve my profile and future matches?"*

Open questions: exact prioritization logic; how many recommendations are surfaced at once.

## How the core ideas fit together

We're intentionally simplifying both the product and the mental model. A user only needs to think in terms of four things:

- **AI Matchmaker** — the conversation. The only way to teach the AI anything new about you.
- **My Profile** — what your AI Matchmaker currently knows about you, editable by you, and the source for what others see. Answers *what does my AI Matchmaker currently believe about me, and what will others see?*
- **AI Memory** — a chronological timeline of summarized learning events explaining how the AI learned it. Answers *how did the AI learn this?*
- **AI Profile Coach** — actionable recommendations that improve profile quality and match quality, which only ever act by launching a conversation. Answers *what should I do next?*

Everything else — the structured data behind a category's confidence, how a conversation becomes a profile update — is an internal implementation detail, not something a user navigates to separately.

**The core product experience.** The AI Matchmaker conversation is the only way to teach the AI anything; there are no popup forms, questionnaires, or category editors that update My Profile directly. A single, simplified pipeline governs how a conversation becomes everything else in the product:

```
Conversation
→ AI generates a session summary
→ AI Memory
→ Update affected profile categories
→ My Profile
→ Compatibility Reports
→ Recommendations
```

A conversation is condensed into one session summary; that summary is what becomes an AI Memory entry and what updates the affected categories on My Profile; My Profile in turn drives Compatibility Reports and Recommendations. AI Profile Coach watches My Profile for gaps and low confidence, and its only action is to launch another conversation with the AI Matchmaker when additional learning is needed — which closes the loop back to the top.

## AI Matchmaker

Every user has a persistent AI Matchmaker. Beyond the onboarding interview, users can chat with their AI Matchmaker at any time — these conversations help the user, answer questions, and provide advice, while gradually improving My Profile. After every conversation, the AI summarizes new beliefs, updated beliefs, and unchanged beliefs. The AI may continue learning about the user throughout their lifetime on the platform. It also stays available and context-aware while the user browses matches (see Match Browsing & Feedback below).

The AI Matchmaker can answer questions, discuss matches, explain recommendations, help improve the user's profile, help users understand themselves better, and naturally learn more about the user through conversation. Every meaningful part of the dating experience — onboarding, profile editing, photo coaching, compatibility explanations, discussing likes/passes, changing preferences, dating advice, debriefing a date — should be reachable through it (see [vision.md](vision.md) Guiding Principles); it should feel like the user's personal matchmaker, not a separate app feature. Users should never feel abandoned while waiting for matches: meaningful progress is always possible by talking with their AI Matchmaker.

Open questions: scope boundaries for advice given during ongoing conversations.

## Matching

The matching engine finds compatible long-term partners for a user by reasoning over everything the AI knows about them, not over profile fields alone. Inputs are the structured data behind My Profile: facts, preferences, inferred values, confidence, supporting evidence, and the AI-generated summaries themselves — rich prose rather than simple labels. Matching always reasons over everything the AI knows regardless of what a user has chosen to make visible to others (see My Profile). Users receive compatibility explanations rather than only a compatibility score.

Open questions: specific scoring/ranking methodology; how confidence factors into a match; how explanations are generated.

## Compatibility Reports

A Compatibility Report compares what the AI knows about the user with what it knows about one other person. It's generated only on request — never calculated automatically while browsing.

**Overall Compatibility.** The report leads with a single level — High, Medium, Low, or Unknown — followed by a written summary explaining why. The written explanation is the primary value; the level is simply a quick summary of it.

**Category-by-category compatibility.** Below the overall summary, the report breaks compatibility down by category, each shown with its own level:

```
Relationship Goals    High
Religion & Spirituality  Medium
Lifestyle              High
Children               High
Money Management       Unknown
Communication Style    Medium
```

**Compatibility levels.** These four levels are used everywhere compatibility is shown — never a percentage:

- **High** — strong alignment with no known major conflicts.
- **Medium** — good potential compatibility but with meaningful differences or uncertainties.
- **Low** — one or more significant conflicts that reduce long-term compatibility.
- **Unknown** — not enough information exists to make a reliable assessment. Unknown is never treated as Medium — it means the AI hasn't learned enough yet, not that it found a middling result.

Open questions: how the overall level is derived from category levels; whether category coverage is the same for every report or varies by what's been learned about each person.

## Match Browsing & Feedback

The AI Matchmaker stays available and context-aware while the user browses profiles. Match-related interactions feel like conversation with the user's personal matchmaker, not a feedback form.

**Signal extraction from likes/passes.** The AI knows which profile a like or pass applies to and may ask a brief follow-up (e.g. "What influenced your decision?") when the reason would materially improve My Profile. It extracts separate signals from the answer — e.g. physical attraction, dealbreakers, overall outcome — rather than collapsing them into one. A pass must never be treated as equivalent to a lack of physical attraction.

**Optional feedback, with one exception.** Users may optionally give a physical-attraction rating, quick reasons for liking/passing, and a free-flow spoken or typed comment for the AI. Free-flow comments are especially valuable since they can carry multiple positive and negative signals at once. Feedback is optional everywhere except the single case covered by Decision feedback rules below — the product must never force a survey after every profile beyond that one, one-time exception.

**Context-aware follow-ups.** The AI decides whether a follow-up is worthwhile and avoids repetitive or unnecessary questions, especially when the reason is already clear from a confirmed hard dealbreaker. It may summarize its interpretation and let the user correct it (e.g. "I understood that you found her attractive, but passed because she has children and appears to prefer a nightlife-oriented lifestyle. Is that correct?").

**User control over interruptions.** Users can control how often the AI speaks while browsing, via controls such as: Ask me fewer questions, Only ask when important, Pause suggestions, Do not talk until I message you, Resume helping. The AI defaults to restrained, useful interventions rather than asking about every action.

**Recently passed profiles.** Users can return to the most recently viewed or passed profile to review details before answering the AI's question.

**Photo likes.** From the photo lightbox, a user can like an individual photo on someone else's profile — a lighter-weight signal than a full Pass/Save/Like decision on the profile itself, and reversible the same way. The photo's owner receives a notification (e.g. "Priya liked your rooftop photo"). Unlike a profile decision, liking a photo never requires feedback and never counts as the Decision feedback rules' one-time feedback trigger below.

**Decision feedback rules.** Every AI-generated recommendation carries a unique `recommendation_id`. The first time a user makes a final decision — Pass or Like — on that recommendation, free-form feedback is required before the decision is recorded. This holds no matter where the decision happens: the AI Recommendations page, the profile's Full Profile page, or Saved Profiles (if the profile originated from an AI recommendation). Feedback is collected only once per recommendation — once given, later revisits to the same recommendation never ask again. Profiles surfaced through manual Search never require decision feedback, since the user chose to view them rather than the AI recommending them. The governing rule stays simple and applies everywhere: if a profile came from an AI recommendation, the user's first Pass or Like on it requires feedback; everything else behaves consistently throughout the product.

**Save is not a decision.** Saving a profile — from AI Recommendations or from manual Search — is a temporary, reversible bookmark, not a Pass or Like, and it never requires feedback. Saved Profiles is simply a holding area for profiles the user hasn't decided on yet. When a saved profile is eventually Passed or Liked, the Decision feedback rules above still apply based on where the profile originated: feedback is required if it came from an AI recommendation, and not required if it came from manual Search.

**Undo.** Pass, Like, and Save are all reversible immediately after the action, via a toast/snackbar or inline Undo control. Undoing a Pass or Like restores the profile to its prior, undecided state. Undoing a Save removes the profile from Saved Profiles.

## AI-Assisted Photos

The product distinguishes two separate concepts: **Learning Photos** (private) and **Profile Photos** (public).

**Learning Photos.** Users may upload up to 100 photos. These are private and used only by the AI Matchmaker to better understand the user — e.g. interests, hobbies, lifestyle, travel style, creativity, family orientation, health and fitness, social preferences, personality signals. They become evidence that shapes My Profile (see My Profile above). Deleting or hiding a Learning Photo does not automatically erase a belief if that belief is also supported by other evidence (conversation, other photos, user feedback, etc.).

**Profile Photos.** Users decide which photos appear publicly on their profile. The AI recommends the strongest set of profile photos along with explanations, but the user always has the final decision. The AI never automatically replaces or publishes profile photos. Each Profile Photo has a caption, initially written by the AI Matchmaker; the user can always edit it, and their wording permanently replaces the AI's — the same "AI proposes, user decides" pattern used for every other AI-generated text in the product (see Eliminating blank text boxes under My Profile).

**AI Photo Coaching.** After analyzing uploaded photos, the AI Matchmaker starts a natural conversation about what it noticed (e.g. "I noticed many of your photos are travel photos. Is traveling a major part of your life?"). This serves two goals at once: helping the user build a stronger profile, and learning more about the user.

**Story-Based Recommendations.** The AI evaluates the story a profile communicates as a whole, rather than judging individual photos in isolation — e.g. what the profile currently communicates strongly, and what it communicates less. It explains every recommendation and never simply calls a photo "bad"; instead it explains what each photo communicates and what might be missing from the overall story.

## Trust & Safety

Baseline safety features that apply regardless of product scale — dating is a high-stakes trust category, and these are not deferred to a later phase.

**Photo moderation.** Every uploaded photo (Learning Photo or Profile Photo) is automatically checked before it can appear anywhere another user might see it. A photo shows an "Under review" state until it clears moderation. This is separate from — and happens before — any AI Photo Coaching or Story-Based Recommendation analysis.

**Report.** From another user's profile or from a message thread, a user can report them with a reason (fake profile, inappropriate photos, harassment or abuse, spam or scam, or something else) and optional free-text detail. Reports are anonymous to the reported user and reviewed by the team.

**Block.** From the same menu, a user can block another user. Blocking is mutual and immediate: neither user appears to the other in Search, AI Recommendations, Matches, or messaging, and the blocked user is not notified. Blocking is reversible (unblock), and previously blocked users can be reviewed and unblocked from Settings.

Open questions: moderation provider/approach; report review SLA and escalation path; whether blocking a match also archives or deletes the existing message history.

## Platform

The product supports both web and mobile as first-class experiences. Desktop is well suited for onboarding interviews, long AI conversations, uploading and reviewing photos, profile management, and reviewing compatibility explanations. Mobile is well suited for browsing matches, messaging, voice conversations with the AI Matchmaker, notifications, and dating on the go.

## Monetization

The business model is tiered subscriptions. Higher tiers primarily provide additional AI capabilities and higher AI usage limits. The product does not monetize through boosts, super likes, paid visibility, or artificial scarcity — this aligns with the principle that the AI works for the user rather than maximizing engagement (see [vision.md](vision.md) Guiding Principles).

**Tiers (placeholder — functionality is decided, pricing is not).** Two tiers for now:

- **Free** — AI onboarding interview, unlimited manual Search, limited AI Recommendations, limited AI Matchmaker conversations, and basic Compatibility Reports. Conversations with the AI Matchmaker are rate-limited, not blocked, so every user experiences the real product before ever paying.
- **Premium** — unlimited AI Recommendations, unlimited Compatibility Reports, unlimited AI Matchmaker conversations, advanced/deeper Compatibility Reports, and early access to new AI features.

The governing rule: **Premium unlocks more AI. It never buys unfair visibility.** There is no priority placement, no boosts, no Super Likes, and no paid visibility at any tier. Every user, regardless of tier, keeps full manual Search and full ownership of My Profile and AI Memory.

Open questions: exact recommendation/report/conversation limits on Free; final pricing; whether additional tiers are needed.

## Roadmap

_Pending: roadmap not yet defined._
