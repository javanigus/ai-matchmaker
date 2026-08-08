import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signup");
  }

  const { data: matchRows } = await supabase
    .from("matches")
    .select("id, user_a_id, user_b_id, matched_at")
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .order("matched_at", { ascending: false });

  // Belt-and-suspenders on top of match_messages' own RLS block gate
  // (see 20260811040000_phase9_match_messages_block_gate.sql): this is
  // a list page, not the sensitive read itself, but a blocked pair's
  // thread shouldn't even be listed here to click into.
  const { data: blockRows } = await supabase.from("blocks").select("blocker_id, blocked_id").or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
  const blockedIds = new Set((blockRows ?? []).map((b) => (b.blocker_id === user.id ? b.blocked_id : b.blocker_id)));

  const matches = (matchRows ?? [])
    .map((m) => ({
      matchId: m.id as string,
      otherUserId: (m.user_a_id === user.id ? m.user_b_id : m.user_a_id) as string,
    }))
    .filter((m) => !blockedIds.has(m.otherUserId));

  const otherIds = matches.map((m) => m.otherUserId);
  const { data: profiles } =
    otherIds.length > 0 ? await supabase.from("published_profiles").select("id, name").in("id", otherIds) : { data: [] };
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.name]));

  // Last message per match, for the preview — one query per match is
  // fine at this scale (a handful of matches for an MVP), not worth a
  // window-function query for a feature this size.
  const lastMessages = new Map<string, { content: string; created_at: string }>();
  for (const { matchId } of matches) {
    const { data } = await supabase
      .from("match_messages")
      .select("content, created_at")
      .eq("match_id", matchId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) lastMessages.set(matchId, data);
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-serif text-2xl text-stone-900 mb-1">Messages</h1>
      <p className="text-sm text-stone-500 mb-8">Conversations with your matches.</p>

      {matches.length === 0 ? (
        <p className="text-sm text-stone-400 italic">No conversations yet — match with someone first.</p>
      ) : (
        <div className="space-y-2">
          {matches.map(({ matchId, otherUserId }) => {
            const name = profileMap.get(otherUserId);
            if (!name) return null;
            const last = lastMessages.get(matchId);
            return (
              <Link
                key={matchId}
                href={`/messages/${matchId}`}
                className="flex items-center gap-3 bg-white border border-stone-200 rounded-2xl px-4 py-3 hover:bg-stone-50"
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-accent-200 to-accent-400 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white/70">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c1.5-4.5 5-6.5 8-6.5s6.5 2 8 6.5" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-stone-900">{name}</p>
                  <p className="text-xs text-stone-500 truncate">{last ? last.content : "Say hello — no messages yet."}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
