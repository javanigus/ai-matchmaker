import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MatchesClient from "./matches-client";

// Three tabs, matching prototype/matches.html: Mutual (built in Phase
// 8), Liked Me and I Liked (added right after, per founder decision —
// "Liked Me" specifically means Likes are no longer fully one-
// directional/anonymous until mutual, a real privacy call the founder
// made explicitly rather than something assumed while building Phase
// 8). "I Liked" needed no such decision — it's only ever the viewer's
// own profile_decisions rows, which they could always read.
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

  const mutual = (matchRows ?? []).map((m) => ({
    matchId: m.id as string,
    otherUserId: (m.user_a_id === user.id ? m.user_b_id : m.user_a_id) as string,
    at: m.matched_at as string,
  }));

  const mutualIds = new Set(mutual.map((m) => m.otherUserId));

  const { data: iLikedRows } = await supabase
    .from("profile_decisions")
    .select("target_user_id, created_at")
    .eq("user_id", user.id)
    .eq("decision", "like")
    .order("created_at", { ascending: false });
  // Excludes anyone already matched — once mutual, they belong on the
  // Mutual tab only, same reasoning as get_users_who_liked_me's own
  // exclusion (see the migration's comment).
  const iLiked = (iLikedRows ?? [])
    .map((r) => ({ otherUserId: r.target_user_id as string, at: r.created_at as string }))
    .filter((r) => !mutualIds.has(r.otherUserId));

  // Security-definer RPC — reading who liked the viewer means reading
  // someone else's own profile_decisions row, which RLS denies
  // directly (see the migration's own comment).
  const { data: likedMeRows } = await supabase.rpc("get_users_who_liked_me", { viewer_id: user.id });
  const likedMe = ((likedMeRows ?? []) as { liker_id: string; liked_at: string }[]).map((r) => ({ otherUserId: r.liker_id, at: r.liked_at }));

  const allOtherIds = [...new Set([...mutual.map((m) => m.otherUserId), ...iLiked.map((m) => m.otherUserId), ...likedMe.map((m) => m.otherUserId)])];

  const { data: profiles } =
    allOtherIds.length > 0
      ? await supabase.from("published_profiles").select("id, name, age, location_city, location_state, occupation").in("id", allOtherIds)
      : { data: [] };
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const { data: savedRows } = await supabase.from("saved_profiles").select("target_user_id").eq("user_id", user.id);
  const savedIds = new Set((savedRows ?? []).map((r) => r.target_user_id));

  function attach<T extends { otherUserId: string; at: string }>(list: T[]) {
    return list.filter((l) => profileMap.has(l.otherUserId)).map((l) => ({ ...l, profile: profileMap.get(l.otherUserId)! }));
  }

  return (
    <MatchesClient
      userId={user.id}
      mutual={attach(mutual)}
      iLiked={attach(iLiked)}
      likedMe={attach(likedMe).map((l) => ({ ...l, saved: savedIds.has(l.otherUserId) }))}
    />
  );
}
