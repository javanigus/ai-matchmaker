import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeProgress, type CategoryState } from "@/lib/onboarding/baseline";
import OnboardingChat from "./onboarding-chat";

// Per founder request: resume a real in-progress (or already-baseline-
// reached) onboarding conversation on load, instead of always starting
// fresh — a page refresh, or coming back on a different day after
// logging in, used to lose the visible transcript and silently start a
// brand-new conversations row, even though everything actually learned
// was already safe in profile_categories the whole time.
export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signup");
  }

  const { data: categoryRows } = await supabase
    .from("profile_categories")
    .select("category, ai_summary, full_summary, confidence, pending_confidence")
    .eq("user_id", user.id);

  const categoryMap: Record<string, CategoryState> = {};
  for (const row of categoryRows ?? []) {
    categoryMap[row.category] = row;
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("baseline_reached_at")
    .eq("id", user.id)
    .single();

  // Most recent conversation, if any — a brand-new user has none yet,
  // which is the signal to show the plain opening greeting instead of
  // trying to resume something that doesn't exist.
  const { data: latestConversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let messages: { role: "user" | "assistant"; content: string }[] = [];
  if (latestConversation) {
    const { data: messageRows } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", latestConversation.id)
      .order("created_at", { ascending: true });
    messages = (messageRows ?? []) as { role: "user" | "assistant"; content: string }[];
  }

  return (
    <OnboardingChat
      initial={{
        conversationId: latestConversation?.id,
        messages,
        progress: latestConversation ? computeProgress(categoryMap) : null,
        baselineReached: !!userRow?.baseline_reached_at,
      }}
    />
  );
}
