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
- **Anthropic Claude API**, using **tool use / structured output** for the AI Matchmaker to propose category updates from a conversation turn — this is what makes "AI proposes, user approves" (a core PRD rule) implementable as a structured diff rather than free text you have to parse.
- **Vercel** for hosting.
- **Stripe**, added later — see Sequencing below.

**The session-summary pipeline is also the cost/latency control — build it that way from day one.** The PRD's pipeline (`Conversation → one session summary → AI Memory entry → profile category update`) isn't only a UX choice: it's what keeps the always-available AI Matchmaker affordable and fast. Never replay full conversation history into the model on every message — summarize and store, then retrieve only the relevant category context per turn. Skipping this is the most common way solo-built AI chat products get slow and expensive as usage grows.

**Don't build or train custom ML.** Every "intelligent" behavior in the PRD — confidence assessment, category summarization, compatibility explanations, photo coaching, AI Profile Coach prioritization — is a prompting problem against a capable LLM, not a model-training problem. Reach for a better prompt or a tool-use schema before reaching for an embeddings pipeline or a custom classifier.

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

**Consider a "concierge" first cohort.** The conversational profile-building is a well-understood LLM use case; whether the matching logic produces genuinely good compatibility judgments is the real unknown. For the first users, it's reasonable to build real Compatibility Graphs through real conversation while a human (the founder) sanity-checks or hand-curates actual match suggestions before they go out — de-risking the one part of the product that can't be validated until real outcomes are seen, without faking what users actually interact with.

## Monetization

Keep it to zero or one tier at MVP. The PRD's two-tier model (Free/Premium, "Premium unlocks more AI, never buys visibility") is the right long-term governing rule, but collecting payment info at validation stage is a distraction from the one question that matters: do people have good conversations and get good matches? Launch fully free, or with a single simple tier gating conversation volume, and defer the full tier build-out until there are retained users worth monetizing.

## Positioning notes for later

- Lead with **AI Memory's transparency**, not "smart matching" — most AI-dating competitors claim intelligence; almost none show their work. A browsable, plain-language timeline of *why* the AI believes what it believes is a concrete, demonstrable trust feature.
- The **High/Medium/Low/Unknown compatibility levels** (see `prd.md` → Compatibility Reports) are themselves a differentiator worth stating explicitly in marketing: most competitors overclaim precision with fake percentages; admitting the honest limits of what an LLM can quantify is a trust signal, not a weakness.
- `vision.md`'s Core Differentiator #3 still says "Compatibility scores with clear explanations," written before the PRD moved to levels instead of scores — worth reconciling in a future documentation pass.
