import { createClient } from "@/lib/supabase/server";
import { BASELINE_CATEGORIES, CATEGORY_LABELS, QUICK_FACT_OPTIONS, CATEGORY_OPEN_PROMPTS } from "@/lib/categories";
import { extractCategoryUpdates, filterFabricatedEvidence } from "@/lib/onboarding/extract";
import { hasNarrativeDepth as baseHasNarrativeDepth, computeProgress } from "@/lib/onboarding/baseline";
import { resolveCategoryUpdate } from "@/lib/profile/apply-update";

// Per founder decision, switched from gpt-4o-mini after comparing real
// Artificial Analysis Intelligence Index scores and OpenRouter pricing —
// DeepSeek V4 Flash is ~7x smarter (Index ~50 vs 7) and cheaper. Its
// benchmark throughput (103.7 tok/s) also looked faster than
// gpt-4o-mini's (93.9 tok/s), but real timed onboarding turns told a
// different story: gpt-4o-mini averaged a consistent ~5s/turn, DeepSeek
// V4 Flash averaged ~10.8s and ranged 6.9-14.8s — real end-to-end
// latency through OpenRouter's routing for a given model/provider path
// doesn't necessarily match its isolated benchmark tok/s. Kept DeepSeek
// V4 Flash anyway per founder decision: intelligence matters more here
// than the latency gap. Confirmed it supports forced tool_choice
// function calling (used by extract.ts) before switching, since
// extraction depends on it.
const CHAT_MODEL = "deepseek/deepseek-v4-flash";

// Used only for the AI Memory paragraph and Profile Text bio below — both
// one-time-per-user, full-conversation-context calls, not the high-
// frequency per-turn chat/extraction path above, which stays on the fast/
// cheap CHAT_MODEL per the founder's own priority ("onboarding needs to
// be fast"). Per founder decision after comparing options: Kimi K3 scores
// far higher on the Artificial Analysis Intelligence Index (57) than
// GPT-4o (17, a speed-optimized model by 2026 standards, not actually
// cheaper either) — call volume here is low enough that quality matters
// more than per-token cost.
const SUMMARY_MODEL = "moonshotai/kimi-k3";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { conversationId: incomingConversationId, message } = body as {
    conversationId?: string;
    message: string;
  };

  if (!message || !message.trim()) {
    return Response.json({ error: "Message required" }, { status: 400 });
  }

  // Reuse the given conversation, or start a new one.
  let conversationId = incomingConversationId;
  let noProgressStreak = 0;
  if (!conversationId) {
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .insert({ user_id: user.id })
      .select("id, no_progress_streak")
      .single();
    if (convError || !conversation) {
      return Response.json({ error: "Could not start conversation" }, { status: 500 });
    }
    conversationId = conversation.id;
    noProgressStreak = conversation.no_progress_streak;
  } else {
    const { data: existingConversation } = await supabase
      .from("conversations")
      .select("no_progress_streak")
      .eq("id", conversationId)
      .single();
    noProgressStreak = existingConversation?.no_progress_streak ?? 0;
  }

  // Current category state — used both to keep the conversational reply
  // from re-asking what's already known, and to give the extraction call
  // something to merge with (full merge, not delta). A real bug caught
  // via founder testing: this used to not check for a read error at
  // all, so a failed fetch silently looked identical to "this user has
  // no categories yet" — collapsing progress to 0% even though the
  // data was actually fine. Failing the whole request here instead of
  // guessing is the right call: computing baseline/progress from data
  // we know is incomplete is worse than not computing it this turn.
  const { data: existingCategories, error: categoriesError } = await supabase
    .from("profile_categories")
    .select("category, ai_summary, full_summary, confidence, pending_confidence, quick_fact")
    .eq("user_id", user.id);

  if (categoriesError) {
    console.error("Failed to read profile_categories:", categoriesError);
    return Response.json({ error: "Could not load your profile state — try again." }, { status: 500 });
  }

  const categoryMap: Record<
    string,
    {
      ai_summary: string | null;
      full_summary: string | null;
      confidence: string | null;
      pending_confidence: string | null;
      quick_fact: string | null;
    }
  > = {};
  for (const row of existingCategories ?? []) {
    categoryMap[row.category] = row;
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("baseline_reached_at")
    .eq("id", user.id)
    .single();

  await supabase.from("messages").insert({ conversation_id: conversationId, role: "user", content: message });

  // Abuse guard: once a session has crossed NO_PROGRESS_LIMIT consecutive
  // turns with zero real extraction signal (gibberish, refusal to
  // engage, spam), stop spending API calls on it — every later message
  // in this conversation gets the same fixed reply instead of running
  // extraction or the chat completion at all. Per founder request.
  // Doesn't touch other conversations; starting a fresh one resets it.
  const NO_PROGRESS_LIMIT = 10;
  if (noProgressStreak >= NO_PROGRESS_LIMIT) {
    const lockoutReply =
      "I'm having trouble making progress with your answers right now — let's pick this back up another time. Please try chatting with me again later.";
    await supabase.from("messages").insert({ conversation_id: conversationId, role: "assistant", content: lockoutReply });

    // Real bug caught while wiring up shared baseline logic: this used to
    // have its own third copy of "what counts as met" that checked
    // confidence only, missing the narrative-depth requirement the other
    // two copies already had — a locked-out conversation could show a
    // category as checked here that wasn't actually done. Uses the same
    // shared computeProgress() as everywhere else now.
    return Response.json({
      conversationId,
      reply: lockoutReply,
      extractionFailed: false,
      progress: computeProgress(categoryMap),
      baselineJustReached: false,
    });
  }

  // Descending + limit to get the most recent messages, then reverse for
  // chronological order — the previous ascending+limit combination would
  // have silently returned the OLDEST messages instead once a conversation
  // passed 20, which is backwards for a sliding context window.
  const { data: recentRowsDesc } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(20);
  const recentMessages = ((recentRowsDesc ?? []) as { role: string; content: string }[]).reverse();

  // --- Extraction (fail open — never breaks the conversation) ---
  // Runs BEFORE the conversational reply now, not after — a real bug
  // caught via founder testing: when a turn's own answer was what
  // finally completed the last baseline category, the reply had no way
  // to know that, since it used to be generated before extraction ever
  // ran. That's also the root cause behind subtler confusions earlier
  // this session (a reply asking about a category whose pill was
  // already checked in the very same response) — the reply was always
  // working from one turn's staler picture than what the user actually
  // just saw. Running extraction first means the reply always reflects
  // this turn's real, current state.
  const extractionWindow = recentMessages.slice(-6);
  const { updates, failed } = await extractCategoryUpdates(extractionWindow, categoryMap);
  const safeUpdates = filterFabricatedEvidence(updates, extractionWindow);

  // Confidence-floor + quick_fact-fallback resolution now lives in
  // lib/profile/apply-update.ts, shared with Phase 6's ordinary
  // session-close extraction — see that file for the "why" (the same
  // logic drifting into two independently-maintained copies is exactly
  // the bug class this project has hit three times already).
  for (const update of safeUpdates) {
    const existing = categoryMap[update.category];
    const { finalConfidence, finalQuickFact } = resolveCategoryUpdate(existing, update);

    await supabase.from("profile_categories").upsert(
      {
        user_id: user.id,
        category: update.category,
        pending_summary: update.short_summary,
        pending_confidence: finalConfidence,
        full_summary: update.full_summary,
        quick_fact: finalQuickFact,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,category" }
    );
    categoryMap[update.category] = {
      ai_summary: categoryMap[update.category]?.ai_summary ?? null,
      full_summary: update.full_summary,
      confidence: categoryMap[update.category]?.confidence ?? null,
      pending_confidence: finalConfidence,
      quick_fact: finalQuickFact,
    };
  }

  // --- Baseline check: pending-or-approved, fires baseline_reached_at once ---
  // Computed before the reply now (see extraction comment above), so the
  // reply can actually react to crossing the line this turn instead of
  // finding out a turn late.
  //
  // Confidence alone isn't enough — a real bug caught via founder
  // testing: the two-step questioning below (closed pick, then an open
  // follow-up) only actually asks its second question if the category
  // isn't already "met." But a short, explicit closed-choice answer
  // ("marriage") is exactly the kind of statement extraction correctly
  // rates High confidence immediately, so the category was reaching
  // "met" off the bare pick alone, before the guaranteed follow-up ever
  // got a turn — the founder's own words: "we don't want users to think
  // we've replaced a web form with chat that does the exact same thing
  // but much slower." Confidence measures certainty about what was
  // captured, not how much was captured — a High-confidence one-word
  // pick is still just the enum value, no narrative behind it, which is
  // exactly the "form-like" experience being guarded against. Narrative
  // depth (a genuine word-count floor on the actual captured text) is
  // now required in addition to Medium+ confidence, regardless of level.
  // The base word-count check lives in lib/onboarding/baseline.ts, shared
  // with onboarding/page.tsx's resume-on-load logic so the two can't
  // quietly define "done" differently.
  //
  // A second real bug caught right after the first fix, on a different
  // category ("balanced" for Lifestyle padded into "not a total homebody,
  // not always out and about" — reusing the closed question's own option
  // words, same trick as "marriage" before it). The extraction prompt
  // fix reduced this but clearly doesn't reliably stop it — the model
  // controls the stored summary's wording, so any check purely on that
  // text is something it can inflate. The one thing it can't inflate is
  // how much the user themselves actually typed this turn, so a category
  // updated from a bare (fewer than 6 words) raw message is never
  // trusted as narratively deep this turn, no matter how the stored
  // summary reads — it'll get a real chance to build depth over
  // multiple turns instead, via the guaranteed follow-up. This turn-
  // specific override is real-time-only, so it stays local to this
  // route rather than living in the shared module.
  const updatedThisTurn: Set<string> = new Set(safeUpdates.map((u) => u.category));
  const currentMessageWordCount = message.trim().split(/\s+/).filter(Boolean).length;

  function hasNarrativeDepth(category: string): boolean {
    if (updatedThisTurn.has(category) && currentMessageWordCount < 6) return false;
    return baseHasNarrativeDepth(categoryMap[category]);
  }
  function meetsBaseline(category: string): boolean {
    const level = categoryMap[category]?.confidence ?? categoryMap[category]?.pending_confidence;
    if (level !== "Medium" && level !== "High") return false;
    return hasNarrativeDepth(category);
  }

  const baselineJustReached = BASELINE_CATEGORIES.every(meetsBaseline) && !userRow?.baseline_reached_at;
  if (baselineJustReached) {
    await supabase.from("users").update({ baseline_reached_at: new Date().toISOString() }).eq("id", user.id);
  }

  // Abuse-guard streak: reset the moment a turn produces real signal,
  // increment when onboarding is still incomplete and this turn produced
  // none at all (see the lockout check earlier in this file).
  const onboardingIncomplete = !BASELINE_CATEGORIES.every(meetsBaseline);
  const nextNoProgressStreak = safeUpdates.length > 0 || !onboardingIncomplete ? 0 : noProgressStreak + 1;
  if (nextNoProgressStreak !== noProgressStreak) {
    // Real bug caught via founder testing: this write was failing on every
    // turn with zero indication — conversations had no update RLS policy
    // until now (20260803020000_conversations_update_rls.sql), and an
    // unchecked Supabase write failing under RLS looks identical to one
    // that succeeded (no thrown error, just 0 rows affected). Logging the
    // error here even though the underlying policy is fixed, so a future
    // regression surfaces immediately instead of silently doing nothing.
    const { error: streakError } = await supabase
      .from("conversations")
      .update({ no_progress_streak: nextNoProgressStreak })
      .eq("id", conversationId);
    if (streakError) {
      console.error("Failed to update no_progress_streak:", streakError);
    }
  }

  // --- Conversational reply ---
  const stillNeeded = BASELINE_CATEGORIES.filter((c) => !meetsBaseline(c));

  // Three real bugs, all the same shape, caught via founder testing: the
  // model kept asking about a category that was already Medium+
  // confidence, despite increasingly forceful prompt instructions not to
  // — first when the full 6-category list sat next to the missing
  // subset, then again for a single already-done category once the list
  // narrowed down. Progressively stronger wording ("do not ask again,"
  // then "not even to double check," then "not even 'tell me more'")
  // never fully closed it, because letting the model choose which
  // category to ask about next was itself the failure point — no amount
  // of prose reliably prevents a wrong choice.
  //
  // Fixed properly by removing the choice: code picks the one category
  // the model is allowed to ask about this turn (first remaining in
  // BASELINE_CATEGORIES' fixed order), the same way extraction's
  // schema-constrained tool output prevents wrong categories there (see
  // technical-plan.md's four failure modes — "prevented, not detected"
  // beats "instructed against"). The model's only remaining job is
  // phrasing one natural question about that single category — there's
  // no other category left for it to pick wrong.
  const focusCategory = stillNeeded[0];

  // Confidence and quick_fact are tracked separately (see categories.ts —
  // only 4 of the 12 categories even define a quick_fact), so a category
  // can already be Medium+ on narrative signal while its quick_fact is
  // still unset. Per founder feedback: the interview should actively
  // chase a definite, pick-one-option answer for these, not just settle
  // for a general narrative read, since these are the fields Dealbreaker
  // filtering will actually run against later.
  const quickFactCategories = BASELINE_CATEGORIES.filter((c) => QUICK_FACT_OPTIONS[c]);
  const quickFactsMissing = quickFactCategories.filter((c) => !categoryMap[c]?.quick_fact);

  // baselineJustReached gets its own one-time branch, distinct from the
  // ongoing "already complete" branch used on every later turn — per
  // founder feedback, the exact turn that finishes the interview should
  // say so explicitly and point at the profile, not just answer like any
  // other turn. Only possible now that extraction runs before the reply.
  // Two-step questioning per category, per founder request: a quick,
  // easy-to-answer first question, then one open-ended follow-up that
  // builds on it — roughly 2 questions x 6 categories, fewer whenever an
  // answer already covers both steps at once. Which step applies is a
  // deterministic code decision, not a model choice, for the same reason
  // focusCategory itself is: "has this category already gotten its first
  // answer" is exactly the kind of turn-to-turn state a fast model can't
  // be trusted to track reliably from prose instructions alone (see the
  // three-bugs history above). The existing pending_confidence/confidence
  // signal already tells us this for free — no new state needed.
  const focusExisting = focusCategory ? categoryMap[focusCategory] : undefined;
  const focusHasAnySignal = !!(focusExisting?.confidence || focusExisting?.pending_confidence);
  const focusOptions = focusCategory ? QUICK_FACT_OPTIONS[focusCategory] : undefined;

  const questionStepInstruction = focusCategory
    ? !focusHasAnySignal
      ? focusOptions
        ? `This is the first question about ${CATEGORY_LABELS[focusCategory]}. Ask a quick, easy-to-answer question so they can respond in a word or two — phrase it naturally, but it should let them choose between exactly these options: ${focusOptions.join(", ")}. Don't ask for an explanation yet.`
        : `This is the first question about ${CATEGORY_LABELS[focusCategory]}. Ask something quick they can answer in one sentence — a starting point, not asking for a full explanation yet.`
      : // Per founder feedback: a vague "tell me more" leaves people not
        // knowing what to say, so this second question comes with real,
        // concrete example angles instead of an abstract prompt. The intro
        // line and topics are the founder's own wording, per category.
        `This is the follow-up question about ${CATEGORY_LABELS[focusCategory]} — you already have an initial read${focusExisting?.quick_fact ? ` (${focusExisting.quick_fact})` : ""}, now go deeper. Ask along these lines, adapting naturally to whatever they just said rather than reciting it word for word: "${CATEGORY_OPEN_PROMPTS[focusCategory].intro}" Then offer a few concrete examples of what people sometimes talk about here, as inspiration rather than a checklist — pick 3-4 of these that fit the conversation, don't dump the whole list: ${CATEGORY_OPEN_PROMPTS[focusCategory].topics.join("; ")}.`
    : "";

  const systemPrompt = baselineJustReached
    ? `You are a warm AI Matchmaker. The user just finished answering everything needed for a preliminary profile — this is the turn where their onboarding interview completes. Acknowledge what they just shared, then tell them clearly that you've put together a preliminary profile for them: they can review, edit, and publish it below, or keep talking with you so you can learn even more and improve it further. Sound genuinely conclusive and a little celebratory — this is a real milestone, not just another turn in the conversation.`
    : focusCategory
      ? `You are an efficient AI Matchmaker running a new user's onboarding interview. Speed matters more than depth here: users abandon onboarding that drags on, and this is the only part of the product where that's true — once onboarding is done, ordinary conversation can be as relaxed and wide-ranging as it wants, with only what's actually relevant folded back into the profile.

Your only job this turn is to ask about ${CATEGORY_LABELS[focusCategory]}. That is the one and only topic your message may touch — do not mention, ask about, or reference any other category, whether it's already fully covered or still missing elsewhere in the interview, even in passing ("and how about X?" is off-limits, so is "tell me more about Y" for a category other than ${CATEGORY_LABELS[focusCategory]}). Briefly acknowledge whatever they just said, then ask about ${CATEGORY_LABELS[focusCategory]}: ${questionStepInstruction} Don't dwell or go deeper than the minimum needed for a confident read; the moment this one is done, you'll be handed a different category next turn. When inviting more on this specific topic, name it explicitly ("anything else about ${CATEGORY_LABELS[focusCategory]}?") rather than a bare "anything else?", which reads as ambiguous with the whole conversation.

Warm and human, not a rigid form, but purposeful. Never sound like you're wrapping up, thanking them for a complete picture, or done gathering information — that's never true while you're still being asked about ${CATEGORY_LABELS[focusCategory]}. If they send something short or open-ended, treat it as an opening to ask about ${CATEGORY_LABELS[focusCategory]}, not a cue to conclude. Never invent a topic, category, or theme that isn't ${CATEGORY_LABELS[focusCategory]} — there is no "personal values" or any other category beyond the ones this app actually tracks, even if it would flow naturally from what they just said. If they say they have nothing else to add on ${CATEGORY_LABELS[focusCategory]}, accept that warmly and briefly — you'll be handed the next real category next turn regardless, so there's nothing to invent here to fill the space. This rule applies even if an earlier message in the conversation above already (mistakenly) asked about something that isn't ${CATEGORY_LABELS[focusCategory]} — don't continue or answer-check that old thread just because it's sitting there in the history; ${CATEGORY_LABELS[focusCategory]} is the only valid topic this turn regardless of what came before.${
          focusHasAnySignal && quickFactsMissing.includes(focusCategory)
            ? ` You still don't have a clean, definite answer for ${CATEGORY_LABELS[focusCategory]}'s specific option (e.g. a single religion, a clear yes/no/undecided on kids, one education level, one relationship-goal category) — if it comes up naturally, try to pin that down too, without turning the follow-up into a second closed question.`
            : ""
        }`
      : `You are a warm, thoughtful AI Matchmaker. This user's profile is already complete — you already have a solid read on all of ${BASELINE_CATEGORIES.map((c) => CATEGORY_LABELS[c]).join(", ")}. Do not ask about any of those topics again, even if their message sounds like a generic opener. Instead, warmly acknowledge you already know them well and their profile is ready — mention they can check it out, or just chat about whatever's on their mind if they'd rather keep talking.`;

  // Per founder feedback: literal **bold** markers were rendering as raw
  // asterisks in the chat UI, not actual bold text. Shared across every
  // branch above rather than duplicated in each — formatting rules don't
  // vary by branch. The client also strips any stray ** defensively (see
  // onboarding/page.tsx), the same "don't purely trust the prompt for
  // something that needs to be reliable" reasoning used elsewhere in this
  // file, but fixing it at the source is still the primary fix.
  const formattedSystemPrompt = `${systemPrompt}\n\nFormatting: never use markdown bold (no **text**) — if you want to draw attention to specific words or options, use quotes ("like this") instead. When listing multiple options or examples, format them as a real bulleted list — one item per line, each starting with "- " — rather than run together in a sentence with commas.`;

  const chatRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      // Real bug caught in the ordinary post-baseline chat route (same
      // missing-max_tokens pattern here too, fixed proactively rather
      // than waiting to reproduce the same silent truncation on this
      // path): with no explicit limit, a reply relies on OpenRouter/the
      // provider's own default, which isn't guaranteed generous enough.
      max_tokens: 1024,
      messages: [{ role: "system", content: formattedSystemPrompt }, ...recentMessages],
    }),
  });

  if (!chatRes.ok) {
    return Response.json({ error: "Chat reply failed" }, { status: 502 });
  }
  const chatData = await chatRes.json();
  const reply: string = chatData.choices?.[0]?.message?.content ?? "Sorry, I lost my train of thought — could you say that again?";

  await supabase.from("messages").insert({ conversation_id: conversationId, role: "assistant", content: reply });

  if (baselineJustReached) {
    const { data: fullConversation } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    // The transcript is handed over as one quoted block in a single user
    // message, not replayed as alternating role messages — a real bug
    // caught via testing this exact path: replaying it as actual chat
    // turns made the model treat the request as "continue this
    // conversation" and produce another in-character reply instead of
    // the requested summary, no matter what the system prompt said.
    const transcriptText = ((fullConversation ?? []) as { role: string; content: string }[])
      .map((m) => `${m.role === "user" ? "User" : "AI Matchmaker"}: ${m.content}`)
      .join("\n");

    // AI Memory's consolidated paragraph, per technical-plan.md: held back
    // during onboarding (unlike ordinary session-close extraction) and
    // fired once, here, over the whole onboarding conversation so far —
    // not per session-close, so an in-progress multi-session onboarding
    // doesn't scatter several fragmentary entries before there's an
    // actual "how we got started" story to tell. Fail open: this is a
    // nice-to-have record, not something that should ever break the
    // onboarding response itself.
    try {
      const memoryRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: SUMMARY_MODEL,
          // Same missing-max_tokens fix as the reply call above — 4-6
          // sentences shouldn't need much, but an explicit generous cap
          // is cheap insurance against a silent mid-sentence cutoff.
          max_tokens: 512,
          messages: [
            {
              role: "system",
              content:
                "You write AI Memory entries: one warm, specific narrative paragraph (4-6 sentences) recapping what an AI Matchmaker learned about a user during their onboarding conversation. Address the user directly as \"you\" (e.g. \"You mentioned...\"), for them to read back later as a memory of this conversation — not a clinical summary, and not a reply to them. Plain prose, no headers or lists. When combining facts from different parts of their life (career, family, hobbies, etc.), never imply one caused or explains another just because they're adjacent in a sentence — keep the actual reason if they gave one, or use a neutral transition (\"these days,\" \"outside of that\") instead of a connector that implies causation.",
            },
            {
              role: "user",
              content: `Here is the full onboarding conversation transcript:\n\n${transcriptText}\n\nWrite the one-paragraph AI Memory entry now, as instructed.`,
            },
          ],
        }),
      });

      if (memoryRes.ok) {
        const memoryData = await memoryRes.json();
        const summaryText: string | undefined = memoryData.choices?.[0]?.message?.content;
        if (summaryText) {
          // Every category still carrying a pending draft at this exact
          // moment is one this event's onboarding conversation touched —
          // categoryMap reflects the full accumulated state across the
          // whole conversation, not just this turn (loaded fresh from the
          // DB at the top of the request, then updated in-memory per
          // turn). Linking them here is what lets AI Memory (Phase 6)
          // derive this entry's Confirmed/AI inferred status later:
          // AI inferred while any of these still has a pending draft
          // pointing back at this event's id, Confirmed once the user
          // has reviewed all of them on My Profile.
          const touchedCategories = Object.keys(categoryMap).filter((c) => categoryMap[c]?.pending_confidence);

          const { data: event, error: eventError } = await supabase
            .from("ai_memory_events")
            .insert({
              user_id: user.id,
              session_id: conversationId,
              summary_text: summaryText,
              source: "onboarding",
              categories: touchedCategories,
            })
            .select("id")
            .single();

          if (!eventError && event) {
            for (const category of touchedCategories) {
              await supabase
                .from("profile_categories")
                .update({ pending_source_event_id: event.id })
                .eq("user_id", user.id)
                .eq("category", category);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to generate onboarding AI Memory paragraph:", err);
    }

    // Profile Text — the headline bio from prototype/profile.html, per
    // founder decision AI-proposed the same way categories are: a
    // pending draft the user reviews (Approve/Edit/Dismiss on
    // /profile), never written directly to the public profile_text
    // column. Generated once here, at the same full-conversation-context
    // moment as the AI Memory paragraph above, rather than per-turn like
    // category extraction — a good headline needs the whole picture
    // baseline just proved we have, not one exchange at a time. Also
    // fail open, same reasoning as AI Memory.
    try {
      const bioRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: SUMMARY_MODEL,
          // Same missing-max_tokens fix as the two calls above.
          max_tokens: 512,
          messages: [
            {
              role: "system",
              content:
                "You write dating-profile headline bios. Given an onboarding conversation transcript, write one short bio (2-4 sentences) in the user's own first-person voice, as if they wrote it — never \"the user\" or their name. Warm, specific, and true to what they actually said, not generic. This is the first thing another user reads, so it should read like a real person's profile intro, not a case summary. Plain prose, no headers or lists. A real bug caught via founder testing: compressing two unrelated facts into one sentence can accidentally imply one caused the other (e.g. \"With 20 years in web development, I'm currently focused on my rental properties\" wrongly implies the career caused the rental focus). When combining facts from different parts of their life, keep the actual reason if they gave one (e.g. \"...to increase passive income\"), or use a neutral transition instead of one that implies causation.",
            },
            {
              role: "user",
              content: `Here is the full onboarding conversation transcript:\n\n${transcriptText}\n\nWrite the headline bio now, as instructed.`,
            },
          ],
        }),
      });

      if (bioRes.ok) {
        const bioData = await bioRes.json();
        const bioText: string | undefined = bioData.choices?.[0]?.message?.content;
        if (bioText) {
          await supabase.from("users").update({ pending_profile_text: bioText }).eq("id", user.id);
        }
      }
    } catch (err) {
      console.error("Failed to generate profile text proposal:", err);
    }
  }

  const metCategories = BASELINE_CATEGORIES.filter(meetsBaseline);

  // Per founder request: when this turn's question is the closed-choice
  // first question (step 1), hand the real options to the client so it
  // can render them as tappable chips instead of making the user type a
  // canonical value back out by hand — faster for the user, and removes
  // any chance of a typo/paraphrase extraction then has to interpret.
  // Only set for an actual step-1 question; null for step 2, the
  // baseline-just-reached turn, and the already-complete branch, since
  // there's no fixed option set to offer in any of those.
  const quickReplyOptions = focusCategory && !focusHasAnySignal ? (focusOptions ?? null) : null;

  return Response.json({
    conversationId,
    reply,
    extractionFailed: failed,
    progress: {
      percent: Math.round((metCategories.length / BASELINE_CATEGORIES.length) * 100),
      categories: BASELINE_CATEGORIES.map((c) => ({
        category: c,
        label: CATEGORY_LABELS[c],
        met: meetsBaseline(c),
      })),
    },
    baselineJustReached,
    quickReplyOptions,
  });
}
