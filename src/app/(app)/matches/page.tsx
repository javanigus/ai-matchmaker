import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Only the prototype's "Mutual" tab is built — "Liked Me" would mean
// showing a user who liked them but who they haven't decided on yet,
// which requires exposing one-directional Like data to the liked
// person. Nothing in prd.md asks for that, and Phase 7 deliberately
// made profile_decisions private to the decider only. PLAN.md's own
// Phase 8 bullet ("Mutual-like detection creates a matches row") and
// demo criterion only ever describe the mutual case, so that's what's
// built — "Liked Me"/"I Liked" stay a real, disclosed scope cut.
export default async function MatchesPage() {
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

  const matches = (matchRows ?? []).map((m) => ({
    matchId: m.id,
    otherUserId: m.user_a_id === user.id ? m.user_b_id : m.user_a_id,
    matchedAt: m.matched_at as string,
  }));

  const otherIds = matches.map((m) => m.otherUserId);
  const { data: profiles } =
    otherIds.length > 0
      ? await supabase
          .from("published_profiles")
          .select("id, name, age, location_city, location_state, occupation")
          .in("id", otherIds)
      : { data: [] };
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  function relativeTime(iso: string): string {
    const diffDays = Math.round((new Date().getTime() - new Date(iso).getTime()) / 86_400_000);
    if (diffDays <= 0) return "today";
    if (diffDays === 1) return "yesterday";
    return `${diffDays} days ago`;
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="font-serif text-2xl text-stone-900 mb-1">Matches</h1>
      <p className="text-sm text-stone-500 mb-8">No AI needed here — just say hello.</p>

      {matches.length === 0 ? (
        <p className="text-sm text-stone-400 italic">No matches yet — when you and someone else both Like each other, they&apos;ll show up here.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {matches.map(({ matchId, otherUserId, matchedAt }) => {
            const p = profileMap.get(otherUserId);
            if (!p) return null;
            return (
              <div key={matchId} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                <div className="relative aspect-[3/4] bg-gradient-to-br from-accent-200 to-accent-400 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-14 h-14 text-white/70">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c1.5-4.5 5-6.5 8-6.5s6.5 2 8 6.5" />
                  </svg>
                </div>
                <div className="p-4">
                  <p className="font-medium text-stone-900">
                    {p.name}
                    {p.age ? `, ${p.age}` : ""}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">Matched {relativeTime(matchedAt)}</p>
                  <div className="flex gap-2 mt-3.5">
                    <Link
                      href={`/messages/${matchId}`}
                      className="flex-1 text-center text-xs font-medium bg-accent-600 text-white rounded-full py-2 hover:bg-accent-700"
                    >
                      Message
                    </Link>
                    <Link
                      href={`/compatibility/${otherUserId}`}
                      className="flex-1 text-center text-xs font-medium border border-stone-300 text-stone-600 rounded-full py-2 hover:bg-stone-50"
                    >
                      Compatibility
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
