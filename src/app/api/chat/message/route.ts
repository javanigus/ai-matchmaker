import { createClient } from "@/lib/supabase/server";
import {
  ALL_CATEGORIES,
  ADDITIONAL_CATEGORIES,
  CATEGORY_LABELS,
  QUICK_FACT_OPTIONS,
  CATEGORY_OPEN_PROMPTS,
  ADDITIONAL_CATEGORY_STEP1_QUESTIONS,
  CATEGORY_SENSITIVITY_NOTES,
  type Category,
} from "@/lib/categories";
import { closeSession } from "@/lib/chat/close-session";
import { getAppKnowledgeBase } from "@/lib/chat/app-knowledge-base";

// Same per-turn model as onboarding — see that route's comment for the
// Intelligence Index / speed / price comparison behind the choice.
const CHAT_MODEL = "deepseek/deepseek-v4-flash";

// No cron/background-job infrastructure exists in this app yet (that's
// Phase 9's territory — see docs/PLAN.md and PROGRESS.md's "Deviations"
// section), so "session ends via inactivity timeout" (technical-plan.md)
// is implemented lazily here rather than by a scheduled job: the next
// message to a conversation that's gone quiet past this threshold closes
// the old session out first, then starts a fresh one for the new
// message. The other named trigger, "the user navigating away," is the
// explicit /api/chat/close-session route instead (an "End conversation"
// action in the panel) — deliberately not a client unload hook, since
// beforeunload/sendBeacon isn't reliable enough to depend on.
const INACTIVITY_MINUTES = 30;

// Politics is the only category where the deterministic step-1 question
// (below) needs a lead-in beyond the bare question itself — per founder
// request, unprompted: "I'd be careful with this one because it can
// become polarizing." "Prefer not to say" is already a real option in
// its quick_fact list, but a short, kind lead-in costs nothing and
// matches the care the founder asked for.
const STEP1_LEAD_INS: Partial<Record<Category, string>> = {
  politics: "This one's completely optional — feel free to skip if you'd rather not. ",
};

// Real bug caught via founder testing: no call in this file ever set
// max_tokens, so every reply silently relied on OpenRouter/the
// provider's own default for this model — nowhere near generous enough
// for a legitimate long reply (e.g. "help me improve my profile,"
// reviewing all 6 known categories one by one), which cut off mid-
// sentence with no error or indication anything was wrong. 2048 is
// generous relative to what a chat turn here actually needs, even a
// long itemized profile review — cheap insurance against silent
// truncation, not a meaningfully higher cost on a per-token-cheap model.
const MAX_REPLY_TOKENS = 2048;

async function callChat(systemPrompt: string, messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      max_tokens: MAX_REPLY_TOKENS,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });
  if (!res.ok) throw new Error(`Chat completion failed: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "Sorry, I lost my train of thought — could you say that again?";
}

const FORMATTING_RULES =
  'Formatting: never use markdown bold (no **text**) — use quotes ("like this") for emphasis instead. Format lists as real bulleted lines starting with "- ", not comma-separated prose.';

// Real bug caught via founder testing: an earlier version of this prompt
// said the AI could "discuss matches, explain recommendations" — but
// Match Browsing, AI Recommendations, and Compatibility Reports don't
// exist yet (Phases 7-8), and this call has zero access to any other
// user's data regardless. With nothing grounding it and an open-ended
// invitation to talk about matches, the model fabricated entire
// candidate profiles out of nothing the moment it was asked. Fixed at
// the root: stop claiming a capability that doesn't exist, scope the
// whole conversation to three things explicitly, and (a second real bug,
// caught by the founder in this very fix's own output) generalize the
// "don't imply knowledge you don't have" rule beyond just matches — it
// also implied awareness of the user's real dating schedule/pace once,
// unprompted. Prompt-only mitigations, not guaranteed ones — same
// category of judgment call as extraction's "semantically wrong but
// structurally fine" failure mode (technical-plan.md).
function buildGeneralSystemPrompt(knownSummary: string, missingCategoryKeys: Category[]): string {
  const missingSection =
    missingCategoryKeys.length > 0
      ? `\nThey haven't shared anything yet for: ${missingCategoryKeys.map((c) => CATEGORY_LABELS[c]).join(", ")}. Feel free to mention, briefly and only when it fits naturally, that filling one of these in would help — but don't ask the actual detailed questions yourself. A real "Fill in X" option is offered separately in the interface once you mention it, and asking your own questions on top of that would be redundant. Keep the mention to a sentence or two, don't force it into a reply where it doesn't fit, and never mention more than one at a time.`
      : "";

  return `You are the AI Matchmaker for a dating app. You already know this user — they completed an onboarding interview with you already (that's where everything in "what you already know about them" below came from), and this conversation is a continuation of an ongoing relationship, not a first encounter. Never greet them as if you're meeting for the first time — no "great to meet you," "nice to meet you," or similar. Greet them the way you'd greet someone you already know and have talked with before.

You may ONLY talk about these three things:
1. Helping the user improve or understand their own dating profile — what's on it, what might be missing, how to describe themselves better.
2. How the app itself works — think tech support: what a feature does, how onboarding/Dealbreakers/Search/My Profile work.
3. General relationship and dating topics — advice or reflection that isn't tied to a specific match (e.g. what makes relationships work, how to figure out what they want, dating in general).

You do NOT have access to any match recommendations, candidate profiles, or compatibility data — that feature doesn't exist in this app yet, and you have no data about any other user in this conversation. Never invent, describe, or imply a specific match or candidate exists, even if asked directly ("show me matches," "who's compatible with me," "any good options for me?") — that would always be fabrication. If asked, say plainly you can't show specific matches right now, and offer to help with one of the three things above instead.

The same rule applies more broadly, not just to matches: never imply you're aware of anything about the user's actual current dating life, schedule, or circumstances beyond what's either in "what you already know about them" below or something they've said earlier in this conversation. For general relationship topics (topic 3), speak in general terms or ask an open question — never phrase something as if you already know how their dating life is going, what's "coming up" for them, or any other specific real-world detail you weren't actually told. "What's dating been like for you lately?" is fine; "how's the pace been for you lately" implying you already know their pace is not.

If the user brings up anything outside those three topics, don't answer it — politely decline and remind them you can only help with: improving their profile, how the app works, or general relationship topics.

For topic 2 (how the app works), only state facts from this reference — never guess or improvise details about a feature:
${getAppKnowledgeBase()}

Here's what you already know about them — never re-ask for any of this as if it were new:
${knownSummary || "(nothing recorded yet beyond the basics)"}
${missingSection}

${FORMATTING_RULES}`;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: userRow } = await supabase.from("users").select("baseline_reached_at").eq("id", user.id).single();
  if (!userRow?.baseline_reached_at) {
    return Response.json({ error: "Finish onboarding first" }, { status: 403 });
  }

  const body = await request.json();
  const { message, startCategory } = body as { message?: string; startCategory?: Category };

  if (!startCategory && (!message || !message.trim())) {
    return Response.json({ error: "Message required" }, { status: 400 });
  }
  if (startCategory && !(ADDITIONAL_CATEGORIES as readonly string[]).includes(startCategory)) {
    return Response.json({ error: "Invalid category" }, { status: 400 });
  }

  const { data: recentConversation } = await supabase
    .from("conversations")
    .select("id, closed_at, active_category, active_category_step")
    .eq("user_id", user.id)
    .eq("kind", "ongoing")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  async function startNewConversation() {
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({ user_id: user!.id, kind: "ongoing" })
      .select("id, active_category, active_category_step")
      .single();
    if (error || !created) return null;
    return created;
  }

  let conversation: { id: string; active_category: string | null; active_category_step: number | null } | null;
  if (!recentConversation || recentConversation.closed_at) {
    conversation = await startNewConversation();
  } else {
    const { data: lastMessage } = await supabase
      .from("messages")
      .select("created_at")
      .eq("conversation_id", recentConversation.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const inactiveMs = lastMessage ? Date.now() - new Date(lastMessage.created_at).getTime() : 0;
    if (lastMessage && inactiveMs > INACTIVITY_MINUTES * 60 * 1000) {
      await closeSession(supabase, user.id, recentConversation.id);
      conversation = await startNewConversation();
    } else {
      conversation = recentConversation;
    }
  }

  if (!conversation) {
    return Response.json({ error: "Could not start conversation" }, { status: 500 });
  }
  const conversationId = conversation.id;

  // Snapshot of currently-approved categories, so the reply doesn't
  // re-ask what's already known — approved, not pending: matching
  // "reasons over approved category text only" (prd.md -> Matching) for
  // the same reason an unreviewed draft isn't yet a confirmed
  // understanding to talk from. Unfiltered (not just rows with
  // ai_summary) so completely untouched categories can be told apart
  // from ones with an unreviewed pending draft — see missingCategoryKeys.
  const { data: categoryRows } = await supabase
    .from("profile_categories")
    .select("category, ai_summary, quick_fact, pending_summary")
    .eq("user_id", user.id);
  const categoryRowMap = new Map((categoryRows ?? []).map((r) => [r.category, r]));

  const knownSummary = (categoryRows ?? [])
    .filter((r) => r.ai_summary)
    .map((r) => `${CATEGORY_LABELS[r.category as Category]}: ${r.ai_summary}${r.quick_fact ? ` (${r.quick_fact})` : ""}`)
    .join("\n");

  // Per founder request: a category with genuinely nothing yet (no
  // approved text AND no pending draft already awaiting review) is a
  // standing priority. Can only ever contain the 6 additional categories
  // for a legitimately-onboarded user — baseline gating already requires
  // all 6 baseline categories to have at least a pending draft before
  // baseline_reached_at is ever set.
  const missingCategoryKeys = ALL_CATEGORIES.filter((c) => {
    const row = categoryRowMap.get(c);
    return !row?.ai_summary && !row?.pending_summary;
  });

  try {
    // === Path 1: the client's explicit "Fill in X" trigger — a real UI
    // action, not inferred from free text (the same "code decides, model
    // just phrases" reasoning as onboarding's focusCategory). Fully
    // deterministic and skips the chat LLM call entirely: the founder
    // supplied exact step-1 question wording this time, so there's
    // nothing for a model to phrase better, and no risk of drift. ===
    if (startCategory) {
      const question = ADDITIONAL_CATEGORY_STEP1_QUESTIONS[startCategory as (typeof ADDITIONAL_CATEGORIES)[number]];
      const options = QUICK_FACT_OPTIONS[startCategory] ?? [];
      // Real bug caught via verification, not just review: the options
      // used to exist only in the separate quickReplyOptions field, never
      // as visible text in the stored message. That left the raw
      // transcript ambiguous to session-close extraction later — reading
      // "Which best describes your communication style?" / "Direct" with
      // no textual record that "Direct" came from a specific closed list,
      // extraction captured the narrative correctly but silently dropped
      // quick_fact. Embedding the options as real text too (matching
      // onboarding's own step-1 pattern) makes the transcript
      // self-explanatory on its own, not dependent on extraction's
      // separate system prompt happening to list the same options.
      const optionsList = options.map((o) => `- ${o}`).join("\n");
      const reply = `${STEP1_LEAD_INS[startCategory] ?? ""}${question}\n\n${optionsList}`;

      await supabase.from("conversations").update({ active_category: startCategory, active_category_step: 1 }).eq("id", conversationId);
      await supabase.from("messages").insert({ conversation_id: conversationId, role: "assistant", content: reply });

      return Response.json({
        conversationId,
        reply,
        quickReplyOptions: QUICK_FACT_OPTIONS[startCategory] ?? null,
        suggestedCategory: null,
      });
    }

    // === Paths 2/3: an ordinary typed (or tapped-chip) message ===
    await supabase.from("messages").insert({ conversation_id: conversationId, role: "user", content: message });

    const { data: recentRowsDesc } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(20);
    const recentMessages = ((recentRowsDesc ?? []) as { role: string; content: string }[]).reverse();

    const activeCategory = conversation.active_category as Category | null;
    const activeStep = conversation.active_category_step;

    let reply: string;
    // Additional-category quick-reply chips only ever appear via the
    // explicit "Fill in X" trigger (Path 1 above) — an ordinary typed
    // message never itself produces a fresh closed-pick question.
    const quickReplyOptions: string[] | null = null;
    let nextActiveCategory: Category | null = activeCategory;
    let nextActiveStep: number | null = activeStep;

    if (activeCategory && activeStep === 1) {
      // The user's message is their answer to the deterministic step-1
      // quick-pick — ask the open-ended follow-up next, using the exact
      // founder-supplied intro/topics (same "adapt naturally, offer 3-4
      // as inspiration, don't recite the whole list" pattern onboarding
      // already uses for this exact kind of question).
      const label = CATEGORY_LABELS[activeCategory];
      const { intro, topics } = CATEGORY_OPEN_PROMPTS[activeCategory];
      const sensitivity = CATEGORY_SENSITIVITY_NOTES[activeCategory];
      const stepTwoPrompt = `You are the AI Matchmaker for a dating app. The user just answered a quick-pick question about their ${label}. Ask ONE open-ended follow-up now, adapting naturally to what they just said rather than reciting it word for word: "${intro}" Then offer a few concrete examples of what people sometimes talk about here, as inspiration rather than a checklist — pick 3-4 of these that fit the conversation, don't dump the whole list: ${topics.join("; ")}.${
        sensitivity ? ` ${sensitivity}` : ""
      }

${FORMATTING_RULES}`;
      reply = await callChat(stepTwoPrompt, recentMessages);
      nextActiveStep = 2;
    } else if (activeCategory && activeStep === 2) {
      // The user just answered the open-ended follow-up — this category's
      // two-step flow is done for this session (real batched extraction
      // over what they said happens at session-close, same as any other
      // ordinary conversation). Acknowledge it warmly and drop back into
      // normal open-ended conversation.
      const label = CATEGORY_LABELS[activeCategory];
      const wrapPrompt = `${buildGeneralSystemPrompt(knownSummary, missingCategoryKeys)}\n\nThe user just finished answering your follow-up about ${label} — acknowledge specifically what they shared (not just "thanks"), then let the conversation continue naturally from there.`;
      reply = await callChat(wrapPrompt, recentMessages);
      nextActiveCategory = null;
      nextActiveStep = null;
    } else {
      reply = await callChat(buildGeneralSystemPrompt(knownSummary, missingCategoryKeys), recentMessages);
    }

    if (nextActiveCategory !== activeCategory || nextActiveStep !== activeStep) {
      await supabase.from("conversations").update({ active_category: nextActiveCategory, active_category_step: nextActiveStep }).eq("id", conversationId);
    }

    await supabase.from("messages").insert({ conversation_id: conversationId, role: "assistant", content: reply });

    const suggestedCategory =
      !nextActiveCategory && missingCategoryKeys.length > 0
        ? { key: missingCategoryKeys[0], label: CATEGORY_LABELS[missingCategoryKeys[0]] }
        : null;

    return Response.json({ conversationId, reply, quickReplyOptions, suggestedCategory });
  } catch (err) {
    console.error("Chat reply failed:", err);
    return Response.json({ error: "Chat reply failed" }, { status: 502 });
  }
}
