import { createClient } from "@/lib/supabase/server";
import { ALL_CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/categories";
import { closeSession } from "@/lib/chat/close-session";

// Real gap caught via founder testing: nothing was ever feeding the
// model actual facts about how this app works, even though the system
// prompt told it to act as "tech support" for it — it was answering
// tech-support questions purely from its own general reasoning about
// what a dating app with these feature names would probably do, with
// zero grounding. That's the same "don't trust an LLM's own general
// knowledge for something that needs to be reliable" lesson this app
// has applied everywhere else (formatting rules, category enums,
// extraction schemas), just not yet applied to this one capability.
// Kept intentionally factual and current — update this alongside
// PLAN.md/PROGRESS.md whenever a phase changes what's actually real.
const APP_FEATURE_REFERENCE = `- Onboarding: a conversation-only interview (no forms) that gets to know the user on 6 baseline categories (Relationship Goals, Family, Religion & Spirituality, Lifestyle, Career, Social Energy) well enough to start their profile.
- My Profile: everything learned so far, across 12 categories total (the 6 baseline ones plus Communication Style, Travel, Fitness, Learning, Money Management, Politics). Every AI-written update is a suggestion — the user must Approve, Edit, or Keep current text before it's ever used, nothing changes automatically. Each category has a Visibility toggle for what's public, and some have a quick_fact (a short structured pick, e.g. an exact religion or education level). Basics (Age, Gender, Location, Occupation, Ethnicity) are entered directly, not through conversation. Publishing makes the profile visible to others and requires all required fields filled in.
- Dealbreakers: hard, always-private filters (Age range, Gender, Religion, Ethnicity, Children, Education level, plus free-text custom ones) set directly on My Profile, not through conversation, since they're simple facts with no ambiguity.
- Search: browse the full directory of published profiles with real filters (Age, Gender, Religion, Children, Education, Relationship goals) — no AI involved, and usable even before onboarding is finished.
- AI Memory: a timeline of how the AI has gotten to know the user, one entry per conversation, each showing what was learned and whether it's Confirmed (reviewed/approved) or still AI inferred (not yet reviewed).
- AI Matchmaker (this chat): always available for profile help, understanding the app, or general relationship talk.
- NOT built yet — never claim otherwise if asked: AI Recommendations, Match Browsing (Pass/Like/Save), Matches, Messages, and Compatibility Reports are all still on the roadmap, not usable in the app right now.`;

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
  const { message } = body as { message: string };
  if (!message || !message.trim()) {
    return Response.json({ error: "Message required" }, { status: 400 });
  }

  const { data: recentConversation } = await supabase
    .from("conversations")
    .select("id, closed_at")
    .eq("user_id", user.id)
    .eq("kind", "ongoing")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  async function startNewConversation(): Promise<string | null> {
    const { data: created, error } = await supabase
      .from("conversations")
      .insert({ user_id: user!.id, kind: "ongoing" })
      .select("id")
      .single();
    if (error || !created) return null;
    return created.id;
  }

  let conversationId: string | null;
  if (!recentConversation || recentConversation.closed_at) {
    conversationId = await startNewConversation();
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
      conversationId = await startNewConversation();
    } else {
      conversationId = recentConversation.id;
    }
  }

  if (!conversationId) {
    return Response.json({ error: "Could not start conversation" }, { status: 500 });
  }

  await supabase.from("messages").insert({ conversation_id: conversationId, role: "user", content: message });

  // Snapshot of currently-approved categories, so the reply doesn't
  // re-ask what's already known (technical-plan.md's "Live turn-by-turn"
  // reasoning) — approved, not pending: matching "reasons over approved
  // category text only" (prd.md -> Matching) for the same reason — an
  // unreviewed draft isn't yet a confirmed understanding to talk from.
  // Unfiltered (not just rows with ai_summary) so completely untouched
  // categories can be told apart from ones with an unreviewed pending
  // draft — see missingCategories below.
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
  // approved text AND no pending draft already awaiting review) should
  // be a standing priority to fill in through ordinary conversation, not
  // just something the AI happens to get around to. Only counts fully
  // untouched categories — one with an unreviewed pending draft already
  // has real signal captured, just not yet approved, so re-asking about
  // it would be redundant rather than helpful.
  const missingCategories = ALL_CATEGORIES.filter((c) => {
    const row = categoryRowMap.get(c);
    return !row?.ai_summary && !row?.pending_summary;
  }).map((c) => CATEGORY_LABELS[c]);

  const { data: recentRowsDesc } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(20);
  const recentMessages = ((recentRowsDesc ?? []) as { role: string; content: string }[]).reverse();

  // Real bug caught via founder testing: an earlier version of this
  // prompt said the AI could "discuss matches, explain recommendations"
  // — but Match Browsing, AI Recommendations, and Compatibility Reports
  // don't exist yet (Phases 7-8), and this call has zero access to any
  // other user's data regardless. With nothing grounding it and an
  // open-ended invitation to talk about matches, the model fabricated
  // entire candidate profiles (names, jobs, personality detail) out of
  // nothing the moment it was asked. Fixed at the root: stop claiming a
  // capability that doesn't exist, and scope the whole conversation to
  // three things explicitly, with a standing instruction to decline and
  // redirect anything else. This is a prompt-only mitigation, not a
  // guaranteed one — same category of judgment call as extraction's
  // "semantically wrong but structurally fine" failure mode
  // (technical-plan.md), which this app already treats as inherent to
  // LLM behavior rather than something a deterministic check can fully
  // close.
  const systemPrompt = `You are the AI Matchmaker for a dating app. You may ONLY talk about these three things:
1. Helping the user improve or understand their own dating profile — what's on it, what might be missing, how to describe themselves better.
2. How the app itself works — think tech support: what a feature does, how onboarding/Dealbreakers/Search/My Profile work.
3. General relationship and dating topics — advice or reflection that isn't tied to a specific match (e.g. what makes relationships work, how to figure out what they want, dating in general).

You do NOT have access to any match recommendations, candidate profiles, or compatibility data — that feature doesn't exist in this app yet, and you have no data about any other user in this conversation. Never invent, describe, or imply a specific match or candidate exists, even if asked directly ("show me matches," "who's compatible with me," "any good options for me?") — that would always be fabrication. If asked, say plainly you can't show specific matches right now, and offer to help with one of the three things above instead.

The same rule applies more broadly, not just to matches: never imply you're aware of anything about the user's actual current dating life, schedule, or circumstances beyond what's either in "what you already know about them" below or something they've said earlier in this conversation. For general relationship topics (topic 3), speak in general terms or ask an open question — never phrase something as if you already know how their dating life is going, what's "coming up" for them, or any other specific real-world detail you weren't actually told. "What's dating been like for you lately?" is fine; "how's the pace been for you lately" implying you already know their pace is not.

If the user brings up anything outside those three topics, don't answer it — politely decline and remind them you can only help with: improving their profile, how the app works, or general relationship topics.

For topic 2 (how the app works), only state facts from this reference — never guess or improvise details about a feature:
${APP_FEATURE_REFERENCE}

Here's what you already know about them — never re-ask for any of this as if it were new:
${knownSummary || "(nothing recorded yet beyond the basics)"}
${
  missingCategories.length > 0
    ? `\nThey haven't shared anything yet for: ${missingCategories.join(", ")}. Treat filling these in as a standing priority for topic 1 — look for natural opportunities to ask about one of them, especially if the conversation doesn't already have a specific direction. Don't force it into a reply where it clearly doesn't fit, and never ask about more than one at a time.`
    : ""
}

Formatting: never use markdown bold (no **text**) — use quotes ("like this") for emphasis instead. Format lists as real bulleted lines starting with "- ", not comma-separated prose.`;

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

  return Response.json({ conversationId, reply });
}
