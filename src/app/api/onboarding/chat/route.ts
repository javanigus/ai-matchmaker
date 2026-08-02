import { createClient } from "@/lib/supabase/server";
import { BASELINE_CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";
import { extractCategoryUpdates, filterFabricatedEvidence } from "@/lib/onboarding/extract";

const CHAT_MODEL = "openai/gpt-4o-mini";

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
    .select("category, ai_summary, full_summary, confidence, pending_confidence")
    .eq("user_id", user.id);

  if (categoriesError) {
    console.error("Failed to read profile_categories:", categoriesError);
    return Response.json({ error: "Could not load your profile state — try again." }, { status: 500 });
  }

  const categoryMap: Record<
    string,
    { ai_summary: string | null; full_summary: string | null; confidence: string | null; pending_confidence: string | null }
  > = {};
  for (const row of existingCategories ?? []) {
    categoryMap[row.category] = row;
  }

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

  // --- Conversational reply ---
  const stillNeeded = BASELINE_CATEGORIES.filter((c) => {
    const existing = categoryMap[c];
    const level = existing?.confidence ?? existing?.pending_confidence;
    return level !== "Medium" && level !== "High";
  });

  // A real bug caught via founder testing: burying "nothing left needed"
  // as a trailing clause on a long sentence wasn't forceful enough — a
  // small model defaulted to asking a baseline question anyway on a
  // generic opener, flatly contradicting the 100%-complete progress
  // card shown in the same turn. Made the "already complete" case its
  // own explicit, standalone instruction instead of a soft aside.
  const systemPrompt = stillNeeded.length
    ? `You are a warm, thoughtful AI Matchmaker conducting an onboarding conversation with someone joining a dating platform. Get to know them through natural conversation, not an interrogation — one thing at a time, following up on what they actually say. You need at least a medium-confidence read on: ${BASELINE_CATEGORIES.map((c) => CATEGORY_LABELS[c]).join(", ")}. Still need real signal on: ${stillNeeded.map((c) => CATEGORY_LABELS[c]).join(", ")}.`
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

  // --- Extraction (fail open — never breaks the conversation) ---
  const extractionWindow = [...recentMessages, { role: "assistant", content: reply }].slice(-6);
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

    await supabase.from("profile_categories").upsert(
      {
        user_id: user.id,
        category: update.category,
        pending_summary: update.short_summary,
        pending_confidence: finalConfidence,
        full_summary: update.full_summary,
        quick_fact: update.quick_fact ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,category" }
    );
    categoryMap[update.category] = {
      ai_summary: categoryMap[update.category]?.ai_summary ?? null,
      full_summary: update.full_summary,
      confidence: categoryMap[update.category]?.confidence ?? null,
      pending_confidence: finalConfidence,
    };
  }

  // --- Baseline check: pending-or-approved, fires baseline_reached_at once ---
  function meetsBaseline(category: string): boolean {
    const level = categoryMap[category]?.confidence ?? categoryMap[category]?.pending_confidence;
    return level === "Medium" || level === "High";
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("baseline_reached_at")
    .eq("id", user.id)
    .single();

  let baselineJustReached = false;
  if (BASELINE_CATEGORIES.every(meetsBaseline) && !userRow?.baseline_reached_at) {
    await supabase.from("users").update({ baseline_reached_at: new Date().toISOString() }).eq("id", user.id);
    baselineJustReached = true;
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
