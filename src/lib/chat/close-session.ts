import type { createClient } from "@/lib/supabase/server";
import { summarizeSession } from "./session-close";
import { resolveCategoryUpdate, type ExistingCategoryState } from "@/lib/profile/apply-update";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type CloseSessionResult = {
  closed: boolean;
  alreadyClosed: boolean;
  eventCreated: boolean;
};

// Runs Phase 6's batched session-close extraction over one 'ongoing'
// conversation and marks it closed_at. Called from two places (see
// docs/technical-plan.md's "inactivity timeout or the user navigating
// away"): the explicit /api/chat/close-session route (an "End
// conversation" action), and lazily from /api/chat/message when the
// most recent ongoing conversation has gone quiet past the inactivity
// threshold. Idempotent — a conversation already closed_at is a no-op,
// so calling this twice on the same id (e.g. a race between the two
// triggers) can't double-extract or double-write.
//
// Uses the caller's own RLS-scoped client (see lib/supabase/server.ts —
// anon key + the user's session cookies, not service role), so
// conversationId is implicitly scoped to rows the caller can actually
// see: a conversation belonging to someone else simply comes back as no
// row, same as any other owner-only read in this app.
export async function closeSession(
  supabase: SupabaseServerClient,
  userId: string,
  conversationId: string
): Promise<CloseSessionResult> {
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, closed_at")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .single();

  if (!conversation) {
    return { closed: false, alreadyClosed: false, eventCreated: false };
  }
  if (conversation.closed_at) {
    return { closed: true, alreadyClosed: true, eventCreated: false };
  }

  const { data: messageRows } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  const messages = (messageRows ?? []) as { role: string; content: string }[];

  if (messages.length === 0) {
    await supabase.from("conversations").update({ closed_at: new Date().toISOString() }).eq("id", conversationId);
    return { closed: true, alreadyClosed: false, eventCreated: false };
  }

  const { data: categoryRows } = await supabase
    .from("profile_categories")
    .select("category, ai_summary, full_summary, confidence, pending_confidence, quick_fact")
    .eq("user_id", userId);
  const categoryMap: Record<string, ExistingCategoryState> = {};
  for (const row of categoryRows ?? []) {
    categoryMap[row.category] = row;
  }

  const { summaryParagraph, updates, failed } = await summarizeSession(messages, categoryMap);

  let eventCreated = false;
  // Fail open (technical-plan.md's "when extraction fails" section):
  // extraction failing outright, or a genuinely uneventful session
  // (nothing to say, nothing to update), both mean "no memory entry" —
  // never something that surfaces as an error to the user.
  if (!failed && (summaryParagraph.trim() || updates.length > 0)) {
    const { data: event, error: eventError } = await supabase
      .from("ai_memory_events")
      .insert({
        user_id: userId,
        session_id: conversationId,
        summary_text: summaryParagraph.trim() || "Had a conversation with your AI Matchmaker.",
        source: "conversation",
        categories: updates.map((u) => u.category),
      })
      .select("id")
      .single();

    if (!eventError && event) {
      eventCreated = true;
      for (const update of updates) {
        const existing = categoryMap[update.category];
        const { finalConfidence, finalQuickFact } = resolveCategoryUpdate(existing, update);

        await supabase.from("profile_categories").upsert(
          {
            user_id: userId,
            category: update.category,
            pending_summary: update.short_summary,
            pending_confidence: finalConfidence,
            full_summary: update.full_summary,
            quick_fact: finalQuickFact,
            pending_source_event_id: event.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,category" }
        );
      }
    }
  }

  await supabase.from("conversations").update({ closed_at: new Date().toISOString() }).eq("id", conversationId);

  return { closed: true, alreadyClosed: false, eventCreated };
}
