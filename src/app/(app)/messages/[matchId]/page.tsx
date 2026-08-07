import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ThreadClient from "./thread-client";

export default async function MessageThreadPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signup");
  }

  // RLS already scopes this to a match the current user is actually a
  // participant in (see the migration's own select policy) — a match
  // that isn't theirs, or doesn't exist, just comes back as no row, the
  // same "no row = not authorized, not an error" pattern used
  // elsewhere in this app.
  const { data: match } = await supabase.from("matches").select("id, user_a_id, user_b_id").eq("id", matchId).single();
  if (!match) {
    notFound();
  }

  const otherUserId = match.user_a_id === user.id ? match.user_b_id : match.user_a_id;
  const { data: otherProfile } = await supabase.from("published_profiles").select("id, name").eq("id", otherUserId).single();
  if (!otherProfile) {
    notFound();
  }

  const { data: messageRows } = await supabase
    .from("match_messages")
    .select("id, sender_id, content, created_at")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  return (
    <ThreadClient
      userId={user.id}
      matchId={matchId}
      otherUserId={otherUserId}
      otherUserName={otherProfile.name ?? "Your match"}
      initialMessages={messageRows ?? []}
    />
  );
}
