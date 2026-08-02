# Technical & Go-to-Market Plan

> Status: Living document
> Last updated: 2026-08-01

This is the accepted plan for moving from the current click-through prototype (`prototype/`) to the real product. It answers "how do we build this, and in what order" — `prd.md` answers "what are we building," `vision.md` answers "why." Written for the actual constraint we're building under: a solo founder, coding it themselves, aiming to validate fast with a small MVP/waitlist rather than build for scale on day one.

## Guiding constraint

Every recommendation below is calibrated to one thing: what a solo founder can realistically build and maintain alone, using AI-assisted coding tools, without needing a dedicated infrastructure or ops function. When in doubt, prefer a managed service over custom infrastructure, and prefer a smaller MVP over a more complete one.

## Architecture

**"My Profile" is a relational schema, not a literal graph database.** The PRD's data model — categories with an AI-generated summary, confidence, visibility, and supporting evidence — maps directly onto a `profile_categories` table (`user_id`, `category`, `ai_summary`, `confidence`, `visible`, `updated_at`) plus a `profile_facts`/evidence table. No graph database, no vector graph store needed for v1. "Compatibility Graph" is a mental model the PRD deliberately keeps internal — don't build literal graph infrastructure to match the name.

**Recommended stack:**
- **Next.js** (App Router) — large ecosystem, and the framework AI coding tools (including Claude Code) are best-trained on, which matters most for a solo build.
- **Supabase** (Postgres + Auth + Storage) — a real database, authentication, and photo storage without standing up your own infrastructure. Row-level security maps naturally onto "a user owns their own profile data."
- **OpenRouter** as the LLM access layer, instead of integrating a single provider's API directly. One API key and one (OpenAI-compatible) request format route to any supported model — Claude, GPT, Gemini, Llama, and others — so the model behind the AI Matchmaker is swapped by changing a model-name string in config, not by rewriting a provider integration or juggling multiple API keys. Use **tool use / structured output** for the AI Matchmaker to propose category updates from a conversation turn — this is what makes "AI proposes, user approves" (a core PRD rule) implementable as a structured diff rather than free text you have to parse. Structured-output reliability still varies by underlying model even through OpenRouter, so default to one known to be strong at it (a Claude or GPT-4-class model) and treat swapping to a cheaper/faster model as something to test against real output quality, not a free upgrade. Two tradeoffs worth knowing: OpenRouter adds a small per-token markup over the underlying provider's price, and it's one more hop that can affect latency/uptime — both are reasonable prices for a solo founder to pay for not being locked into one provider.
- **Vercel** for hosting.
- **Stripe**, added later — see Sequencing below.

**The session-summary pipeline is also the cost/latency control — build it that way from day one.** The PRD's pipeline (`Conversation → one session summary → AI Memory entry → profile category update`) isn't only a UX choice: it's what keeps the always-available AI Matchmaker affordable and fast. Never replay full conversation history into the model on every message — summarize and store, then retrieve only the relevant category context per turn. Skipping this is the most common way solo-built AI chat products get slow and expensive as usage grows.

**Don't build or train custom ML.** Every "intelligent" behavior in the PRD — confidence assessment, category summarization, compatibility explanations, photo coaching, AI Profile Coach prioritization — is a prompting problem against a capable LLM, not a model-training problem. Reach for a better prompt or a tool-use schema before reaching for an embeddings pipeline or a custom classifier.

## Onboarding: conversation-to-profile data flow

This is the mechanics behind the "hardest part" milestone above — how a live chat turns into stored, confidence-rated My Profile categories, and how the system (not the model) knows when a baseline profile is complete.

**Two different LLM calls, not one.**
- **Live turn-by-turn** (every message): an ordinary chat completion — system prompt (matchmaker persona + the user's current profile snapshot, so it doesn't re-ask what it already knows) + recent messages → conversational reply. No extraction happens here.
- **Session-close extraction** (once per session, not per message): when a session ends (inactivity timeout or the user navigating away), one additional call over that session's messages returns structured output: one narrative paragraph (→ the single AI Memory entry) plus a list of proposed category updates. Each update carries **two revised summaries, not one** — a short version (2–4 sentences, the curated public-facing text) and a full version (longer, allowed to keep specific details the short one would trim for length) — both full merges, not deltas, since the call is given the category's current approved short text *and* current full text as context. The short summary becomes a pending draft (see below), never a direct write to the approved text; the full summary updates directly, since it's never public and never used for matching (see "A full detailed view" in `prd.md` → My Profile) — there's nothing to approve when nothing is being published.

**During onboarding specifically, extraction runs live, turn-by-turn, not batched.** Everywhere else, batching at session-close is the efficient default. Onboarding is the one exception: the visible "Building your Compatibility Profile" progress card (see UX walkthrough below) needs to update as the user types, so during this phase each turn gets its own lightweight structured-update pass rather than waiting for the session to end. Once baseline is reached, the conversation drops back to the normal batched behavior for the rest of the user's time on the platform — there's no other difference between "onboarding mode" and ordinary use.

**The same live extraction pass also tries required fields and quick facts, not just narrative updates.** Required fields (Age, Gender, Location, Occupation, Ethnicity) and quick facts (Religious affiliation, Wants children, Education level, Relationship goals — see `prd.md` → My Profile) aren't a separate conversation or a separate model call; they're a few extra optional fields on the same structured-output schema the live onboarding extraction already returns. When the user states one clearly enough ("I'm 29," "I want kids someday"), it comes back filled in; when they don't, or say something too vague to commit to, the field just comes back empty, same as any category the conversation hasn't reached yet. The same "explicitness" standard already used for confidence (see `prd.md` → How confidence is determined) is what decides "clearly enough" — an offhand aside doesn't count.

**Pending category updates: nothing goes live without explicit approval.** A proposed update is never written directly to a category's approved text, and never affects what's public or what matching reasons over (see `prd.md` → My Profile and → Matching) until the user acts on it. On My Profile, a category card with a pending draft shows it beneath the current approved text — visually distinct (e.g. a tinted block, "Updated from your conversation today"), pre-filled as the full merged paragraph described above — with three actions:
- **Approve updated text** — the draft becomes the approved text as-is.
- **Edit** — the draft becomes an editable textarea; saving it becomes the approved text.
- **Keep current text** — dismisses the draft; the approved text is untouched.

Only one pending draft exists per category at a time: if another conversation touches a category before its existing draft is reviewed, the next extraction call is given that draft (not just the last-approved text) as context and overwrites it with a fresh merge. Since a pending draft can sit unreviewed for a while, two things nudge the user back to it: a banner on My Profile itself when drafts are waiting, and AI Profile Coach surfacing "review this update" as a suggestion — reusing the same recommendation mechanism it already has, rather than a new notification channel.

**Baseline completion is a deterministic check, not something the model self-judges — and it's a different gate from the one matching uses.** These are two separate questions that happen to both be about "enough":
- *Has the AI learned enough to end the interview?* Counts **pending or approved** confidence — the onboarding progress bar needs to move live as the user talks, before there's been any chance to review anything, so it measures what the AI has gathered, not what's been confirmed yet.
- *Does matching have enough confirmed data to reason over?* Counts **approved only** (see above) — this is the stricter gate, and it's normal for it to lag behind the first one.

Define a fixed list of baseline-required categories in code. After every category update (pending or approved), check: do all of them now have at least Medium confidence, pending or approved? The onboarding percentage is exactly this — `baseline categories at Medium+ (pending or approved) ÷ total baseline categories` — chosen over a fuzzier blended score because it's simpler and more reliable to implement, and it's the same count already driving the pill checklist next to it, so the two can't visibly disagree. The moment the check flips from false to true (first time only), fire a one-time `baseline_reached_at` event — at which point the user is routed to My Profile with a full set of pending drafts from the conversation waiting to be reviewed in one pass (see UX walkthrough below). Reaching baseline doesn't publish the profile by itself — see "Publishing the profile" in the UX walkthrough below for the separate, explicit Publish step and its own validation.

**Rough data model this implies:**
```
conversations       (id, user_id, started_at)
messages            (id, conversation_id, role, content, created_at)
ai_memory_events    (id, user_id, session_id, summary_text, source, created_at)
profile_categories  (user_id, category, ai_summary, full_summary, confidence, visible, updated_at,
                      pending_summary, pending_confidence, pending_source_event_id, quick_fact)
users               (…, age, gender, location_city, location_state, location_country, occupation,
                      baseline_reached_at, published_at)
user_ethnicities    (user_id, ethnicity)   -- one row per value; ethnicity is a multi-select,
                                             -- same canonical value list as dealbreakers_structured's
                                             -- ethnicity attribute (see Dealbreakers below), so a
                                             -- user's own value and someone else's dealbreaker always
                                             -- compare as the same normalized string, never free text
```
A pending draft is just the optional second half of a category's existing row (nullable `pending_*` columns) rather than a separate table — there's only ever one draft per category, and "does this category have a pending update" is a single-row check, not a join. `full_summary` sits outside the pending/approved split entirely — it's written directly on every extraction, since it's never rendered on the public profile and never read by matching, only by the user themselves via the "See everything I've picked up" link. `quick_fact` is nullable and only meaningful for the four categories that define one (Religion & Spirituality, Family, Career, Relationship Goals) — `null` for every other category.

Required fields (`users` columns above, plus `user_ethnicities`) and `quick_fact` aren't part of the pending/approved machinery at all — no AI call *proposes* a value the way it proposes narrative text, so there's nothing to draft or approve in that sense. But they also aren't purely form-entered: live onboarding extraction (above) writes directly into these same fields/columns when it catches a clear enough statement, exactly like it would pre-fill a form. There's no correctness risk in writing directly here the way there would be for narrative prose, because the field is always shown as its literal current value on an editable control (the Basics form for required fields, a plain select on the category card for quick facts) — the user is looking at the real, current, correctable value every time they see it, not a black-box belief. Required fields get their explicit review at Publish (validated, blocking); quick facts get theirs implicitly, folded into the category's own baseline-confidence review.

**Onboarding UX walkthrough** (matches `prototype/onboarding.html`):
1. User lands on a single full-width chat — no sidebar, no "step 1 of 5." The AI opens with a low-pressure invite to just talk.
2. Free-form back-and-forth; each AI question is generated from what's still missing, not a fixed script.
3. Photos are invited via an inline card in the same transcript, not a separate step or modal.
4. A "Building your Compatibility Profile" card appears inline, periodically: an aggregate percentage plus a pill checklist (filled = covered, dashed = not yet).
5. Follow-up questions visibly chase the still-dashed pills.
6. When all baseline categories cross the confidence threshold, the AI says something conclusive and a CTA button appears below the transcript. The chat input stays open — nothing locks or ends.
7. **The CTA routes to My Profile**, not straight to Recommendations — consistent with "AI proposes, user approves": the user reviews and approves what got captured before it's used to generate anything. Concretely, they land on a profile where every touched category has a pending draft waiting (see "Pending category updates" above) — reviewing them one by one (or leaving some for later) *is* the reviewable-batch view of "everything the AI just picked up," without needing a separate screen for it. (The AI's closing line was updated to match: "Take a look at your profile — I'll start finding matches once you've seen what I picked up.")
8. **Publishing the profile.** My Profile also surfaces the required-fields form here — Age, Gender, Location, Occupation, and Ethnicity (see `prd.md` → My Profile → Required fields) — entered directly, not proposed by the AI, since they're simple facts with no ambiguity to interpret. Most of it is often already filled in by the time the user gets here: the live extraction pass has been pre-filling whatever it caught clearly during the conversation, so this screen is usually a quick confirm-and-correct pass rather than a blank form. A "Publish profile" banner stays visible until the user clicks Publish; doing so validates every required field is filled in (a validation error names anything still missing) and, once it passes, sets `published_at`. The profile isn't visible to other users or eligible for matching until this happens, even once baseline categories are already at Medium+ confidence — baseline and Publish are deliberately separate gates (see "Baseline completion" above). Quick facts follow the same pre-fill-then-confirm pattern, but on their own category's card rather than this form — see "Structured quick facts on narrative categories" in `prd.md`.
9. After that there's no "onboarding mode" to exit — the same AI Matchmaker is just always available in the persistent panel on every page from then on; continuing to add profile info is the same mechanism continuing, not a different one starting.

**When extraction fails, fail open — never break the conversation.** Extraction is a background step, decoupled from the live chat reply, so its failure mode should always be "this update didn't get captured" (quiet, recoverable) rather than anything the user sees or feels. Four distinct failure modes, each handled the cheapest way that actually addresses it — not by defaulting to "have a second AI call check the first one's work" for everything:

- **Structurally invalid output** (bad JSON, wrong category enum, missing field) — prevented, not detected. Use the provider's schema-constrained structured output mode (available for capable models via OpenRouter) so the API itself guarantees a response matching the schema before it reaches application code. No extra call needed.
- **No tool call produced at all** (the model just chats instead of extracting) — retry once with a firmer instruction; if that fails, retry against a different, more reliable model (an easy win from the OpenRouter decision above — the fallback is "ask a stronger model," not "give up"). If both fail, skip extraction for that turn/session and log it; the conversation itself is unaffected, and the topic will likely come up again in a future conversation.
- **Fabricated evidence** (a quote that was never actually said) — caught with a deterministic check, not a second AI call: does the `evidence` text actually appear in that session's messages (substring/fuzzy match in code)? If not, discard that one proposed update, not the whole batch.
- **Semantically wrong but structurally fine** (a plausible-looking summary that overreaches or misreads the conversation) — this is deliberately *not* handled with an AI-review layer. The pending-update approval UI already is the correctness check: the user sees the draft and can Approve, Edit, or Keep current text. A human reviewing the AI's work is a stronger check than a second LLM call reviewing the first one, and adding an AI-review step here would be extra cost and latency defending against something already covered.

These same four modes cover required-field and quick-fact extraction too — same schema-constrained call, same fallback-model retry, same "no AI-review layer" reasoning, just with the Basics form and each category's own card standing in for the pending-update UI as the human check (see "Populated from conversation first, confirmed directly second" in `prd.md` → My Profile).

## Dealbreakers: structured, not conversational

`prd.md` documents Dealbreakers as a deliberate exception to "the AI Matchmaker is the only editor" — worth being explicit here about why that's the right call technically, not just a product preference. Structured dealbreakers (age range, gender, distance, religion, ethnicity/cultural background, children, education level) are simple facts drawn from a closed set of values, with zero ambiguity for a model to interpret. Routing them through conversation + extraction would add LLM latency, cost, and exactly the extraction-error surface area the "when extraction fails" section above exists to manage — for a case that a plain form handles instantly and perfectly. Use a form.

**Data model:**
```
dealbreakers_structured (user_id, attribute, value)   -- one row per attribute *value* the user has set
                                                        -- (multi-select attributes like religion and
                                                        -- ethnicity get multiple rows, same attribute,
                                                        -- different value); attribute is a fixed enum
                                                        -- (age_min, age_max, gender, distance_km,
                                                        -- religion, ethnicity, children, education_min).
                                                        -- ethnicity's values are the same canonical list
                                                        -- as user_ethnicities above; religion, children,
                                                        -- and education_min compare against the matching
                                                        -- quick_fact on profile_categories (Religion &
                                                        -- Spirituality, Family, Career respectively).
dealbreakers_custom     (id, user_id, text, created_at)
```

**Structured dealbreakers become a literal SQL `WHERE` clause**, applied before any LLM call — this is also the answer to the O(n²) pairwise-LLM-comparison problem flagged in Go-to-market below: filtering candidates down with plain SQL first, then only reasoning over the (much smaller) remaining set with the LLM, is the same mechanism as "solve liquidity/scale," not a separate piece of work. No embeddings, no custom ML — a `WHERE` clause is a "no custom ML" solution too.

**Custom dealbreakers are best-effort, not guaranteed.** They aren't drawn from a closed set of values, so they can't become a `WHERE` clause. Pass them as context to the LLM call that generates Compatibility Reports and ranks Recommendations, as a strong negative signal — but don't present this to the user as equivalent to a structured dealbreaker's hard guarantee. They can be added directly (a plain text list, no AI involved) or emerge from conversation/browsing feedback via the same Confirm-before-it-applies pattern used elsewhere; both write to the same table.

**Privacy is enforced by simply never reading this table when rendering anything public** — no visibility flag needed, since nothing here is ever a candidate for display in the first place.

## Sequencing

**Build first (the core loop):**
1. Onboarding conversation → populates My Profile categories via the session-summary pipeline.
2. Basic Search/browse.
3. AI Matchmaker chat, always available.
4. Simple Compatibility Reports — a single LLM prompt reasoning over two people's categories is enough for v1; no custom scoring model.
5. Trust & Safety basics (see below) — not deferred, built alongside the core loop.

**Defer:**
- AI Profile Coach's prioritization logic — a simple "here are 2-3 gaps" prompt beats a bespoke ranking algorithm at this stage.
- Photo "story" analysis sophistication.
- Full monetization tier build-out (see Monetization below).
- Native mobile app — responsive web is enough to validate.

**First concrete build milestone:** onboarding conversation → populates My Profile categories → stored in Supabase via the session-summary pipeline. This alone proves out the hardest technical piece (reliable structured extraction from conversation) before anything else is built on top of it.

## Trust & Safety — build in the prototype first

Photo moderation, Report, and Block (see `prd.md` → Trust & Safety) are treated as MVP-required, not deferred — dating is a high-stakes trust category regardless of scale, and these are cheap to get right early versus expensive to retrofit later. Per-instruction, these were mocked up in `prototype/` before any real build work started, so the UI/UX is already settled:
- `prototype/profile-view.html` and `prototype/messages.html` — a "•••" menu with Report (reason + optional detail → confirmation) and Block (confirm → reversible "blocked" banner in place of navigating away).
- `prototype/settings.html` — a Safety section listing blocked users with Unblock.
- `prototype/profile.html` — an "Under review" state on a photo thumbnail, demonstrating moderation before a photo can go public.

For the real build, photo moderation can start as a single call to a moderation API (e.g. a provider's image moderation endpoint) gating whether an uploaded photo becomes visible — no custom model needed here either.

## Go-to-market

**Solve liquidity before matching quality.** Dating apps live or die on having enough compatible people in the same place at the same time — a classic marketplace cold-start problem that exists independently of how good the AI is. Launch in one city or one tight, personally-seedable community rather than open signup everywhere.

**Consider a "concierge" first cohort.** The conversational profile-building is a well-understood LLM use case; whether the matching logic produces genuinely good compatibility judgments is the real unknown. For the first users, it's reasonable to build a real understanding of them through real conversation while a human (the founder) sanity-checks or hand-curates actual match suggestions before they go out — de-risking the one part of the product that can't be validated until real outcomes are seen, without faking what users actually interact with.

**Watch for the pairwise-comparison cost problem once past concierge mode.** Generating Recommendations by running an LLM compatibility comparison against every other user doesn't scale — it's O(n²) LLM calls. Safe to ignore during the concierge phase (a human is shortlisting anyway), but before that ends, candidates need to be narrowed with cheap, deterministic filtering — starting with Dealbreakers (see above), which already exist as a hard SQL filter for exactly this reason — before the expensive LLM reasoning step ever runs.

## Monetization

Keep it to zero or one tier at MVP. The PRD's two-tier model (Free/Premium, "Premium unlocks more AI, never buys visibility") is the right long-term governing rule, but collecting payment info at validation stage is a distraction from the one question that matters: do people have good conversations and get good matches? Launch fully free, or with a single simple tier gating conversation volume, and defer the full tier build-out until there are retained users worth monetizing.

## Positioning notes for later

- Lead with **AI Memory's transparency**, not "smart matching" — most AI-dating competitors claim intelligence; almost none show their work. A browsable, plain-language timeline of *why* the AI believes what it believes is a concrete, demonstrable trust feature.
- The **High/Medium/Low/Unknown compatibility levels** (see `prd.md` → Compatibility Reports) are themselves a differentiator worth stating explicitly in marketing: most competitors overclaim precision with fake percentages; admitting the honest limits of what an LLM can quantify is a trust signal, not a weakness.
- `vision.md`'s Core Differentiator #3 still says "Compatibility scores with clear explanations," written before the PRD moved to levels instead of scores — worth reconciling in a future documentation pass.
