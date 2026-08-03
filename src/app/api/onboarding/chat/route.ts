import { createClient } from "@/lib/supabase/server";
import { BASELINE_CATEGORIES, CATEGORY_LABELS, QUICK_FACT_OPTIONS } from "@/lib/categories";
import { extractCategoryUpdates, filterFabricatedEvidence } from "@/lib/onboarding/extract";

const CHAT_MODEL = "openai/gpt-4o-mini";

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
  if (!conversationId) {
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .insert({ user_id: user.id })
      .select("id")
      .single();
    if (convError || !conversation) {
      return Response.json({ error: "Could not start conversation" }, { status: 500 });
    }
    conversationId = conversation.id;
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

  // The prompt already asks the model not to weaken an established
  // category, but that's an instruction, not a guarantee — a real bug
  // caught via the founder's own testing showed it doesn't reliably
  // hold. Enforced here as a hard rule instead: an automated turn can
  // raise a category's confidence, or update its text at the same
  // confidence, but never silently lower it. A real correction still
  // updates the text (full merge) — only the confidence floor is
  // protected, and only a human reviewing it (Phase 3) should be able
  // to actually lower it.
  const confidenceRank: Record<string, number> = { Low: 0, Medium: 1, High: 2 };

  for (const update of safeUpdates) {
    const existing = categoryMap[update.category];
    const existingLevel = existing?.confidence ?? existing?.pending_confidence ?? null;
    const existingRank = existingLevel ? confidenceRank[existingLevel] : -1;
    const proposedRank = confidenceRank[update.confidence];
    const finalConfidence = proposedRank < existingRank ? existingLevel! : update.confidence;

    // A real bug caught while wiring up the quick-fact-pursuit prompt
    // above: this used to write `update.quick_fact ?? null` unconditionally,
    // so a turn that updated the category's narrative text without
    // re-stating its quick_fact (extract.ts only includes quick_fact
    // "if clearly stated" this turn, not every turn) would silently wipe
    // out an already-correct quick_fact from an earlier turn. Falls back
    // to the existing value instead of null.
    const finalQuickFact = update.quick_fact ?? existing?.quick_fact ?? null;

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
  function meetsBaseline(category: string): boolean {
    const level = categoryMap[category]?.confidence ?? categoryMap[category]?.pending_confidence;
    return level === "Medium" || level === "High";
  }

  const baselineJustReached = BASELINE_CATEGORIES.every(meetsBaseline) && !userRow?.baseline_reached_at;
  if (baselineJustReached) {
    await supabase.from("users").update({ baseline_reached_at: new Date().toISOString() }).eq("id", user.id);
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
  const systemPrompt = baselineJustReached
    ? `You are a warm AI Matchmaker. The user just finished answering everything needed for a preliminary profile — this is the turn where their onboarding interview completes. Acknowledge what they just shared, then tell them clearly that you've put together a preliminary profile for them: they can review, edit, and publish it below, or keep talking with you so you can learn even more and improve it further. Sound genuinely conclusive and a little celebratory — this is a real milestone, not just another turn in the conversation.`
    : focusCategory
      ? `You are an efficient AI Matchmaker running a new user's onboarding interview. Speed matters more than depth here: users abandon onboarding that drags on, and this is the only part of the product where that's true — once onboarding is done, ordinary conversation can be as relaxed and wide-ranging as it wants, with only what's actually relevant folded back into the profile.

Your only job this turn is to ask about ${CATEGORY_LABELS[focusCategory]}. That is the one and only topic your message may touch — do not mention, ask about, or reference any other category, whether it's already fully covered or still missing elsewhere in the interview, even in passing ("and how about X?" is off-limits, so is "tell me more about Y" for a category other than ${CATEGORY_LABELS[focusCategory]}). Briefly acknowledge whatever they just said, then ask one focused question about ${CATEGORY_LABELS[focusCategory]} — don't dwell or go deeper than the minimum needed for a confident read; the moment this one is done, you'll be handed a different category next turn. When inviting more on this specific topic, name it explicitly ("anything else about ${CATEGORY_LABELS[focusCategory]}?") rather than a bare "anything else?", which reads as ambiguous with the whole conversation.

Warm and human, not a rigid form, but purposeful. Never sound like you're wrapping up, thanking them for a complete picture, or done gathering information — that's never true while you're still being asked about ${CATEGORY_LABELS[focusCategory]}. If they send something short or open-ended, treat it as an opening to ask about ${CATEGORY_LABELS[focusCategory]}, not a cue to conclude.${
          quickFactsMissing.includes(focusCategory)
            ? ` A general answer on this one isn't enough — you need something concrete enough to pick one definite, specific option (e.g. a single religion, a clear yes/no/undecided on kids, one education level, one relationship-goal category). If their answer is still vague, ask a direct follow-up to pin it down before moving on.`
            : ""
        }`
      : `You are a warm, thoughtful AI Matchmaker. This user's profile is already complete — you already have a solid read on all of ${BASELINE_CATEGORIES.map((c) => CATEGORY_LABELS[c]).join(", ")}. Do not ask about any of those topics again, even if their message sounds like a generic opener. Instead, warmly acknowledge you already know them well and their profile is ready — mention they can check it out, or just chat about whatever's on their mind if they'd rather keep talking.`;

  const chatRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: [{ role: "system", content: systemPrompt }, ...recentMessages],
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
          await supabase.from("ai_memory_events").insert({
            user_id: user.id,
            session_id: conversationId,
            summary_text: summaryText,
            source: "onboarding",
          });
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
  });
}
