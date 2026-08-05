import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABELS, type Category } from "@/lib/categories";
import { closeSession } from "@/lib/chat/close-session";

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

  // Snapshot of currently-approved categories only, so the reply doesn't
  // re-ask what's already known (technical-plan.md's "Live turn-by-turn"
  // reasoning) — approved, not pending: matching "reasons over approved
  // category text only" (prd.md -> Matching) for the same reason — an
  // unreviewed draft isn't yet a confirmed understanding to talk from.
  const { data: categoryRows } = await supabase
    .from("profile_categories")
    .select("category, ai_summary, quick_fact")
    .eq("user_id", user.id)
    .not("ai_summary", "is", null);

  const knownSummary = (categoryRows ?? [])
    .map((r) => `${CATEGORY_LABELS[r.category as Category]}: ${r.ai_summary}${r.quick_fact ? ` (${r.quick_fact})` : ""}`)
    .join("\n");

  const { data: recentRowsDesc } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(20);
  const recentMessages = ((recentRowsDesc ?? []) as { role: string; content: string }[]).reverse();

  const systemPrompt = `You are a warm, thoughtful AI Matchmaker, always available to this user beyond their original onboarding interview. Answer questions, discuss matches, explain recommendations, help them think through their profile or dating life, or just chat — there's no fixed agenda this turn, unlike onboarding.

Here's what you already know about them — never re-ask for any of this as if it were new:
${knownSummary || "(nothing recorded yet beyond the basics)"}

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
