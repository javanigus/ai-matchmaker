import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryPhotoUrls } from "@/lib/photos";
import SearchClient from "./search-client";

// Search is the one page that stays reachable regardless of
// baseline_reached_at (see docs/technical-plan.md -> "Routing before
// baseline is reached" and proxy.ts's GATED_PATHS, which deliberately
// excludes /search) — someone can browse before ever talking to their
// AI Matchmaker. It still requires being signed in, though: that's a
// separate concern from the baseline gate, same as every other real
// page in this app, so the auth check happens here directly rather
// than in proxy.ts's GATED_PATHS list.
export default async function SearchPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signup");
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("baseline_reached_at")
    .eq("id", user.id)
    .single();

  const { data: blockRows } = await supabase.from("blocks").select("blocker_id, blocked_id").or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
  const blockedIds = new Set((blockRows ?? []).map((b) => (b.blocker_id === user.id ? b.blocked_id : b.blocker_id)));

  const { data: allProfiles } = await supabase
    .from("published_profiles")
    .select("id, name, age, gender, location_city, location_state, occupation")
    .neq("id", user.id);

  // Search queries published_profiles directly rather than routing
  // through published_candidates_for (only Recommendations does that),
  // so Block exclusion has to happen here, JS-side, same pattern as
  // Matches' own mutualIds/blockedIds filtering.
  const profiles = (allProfiles ?? []).filter((p) => !blockedIds.has(p.id));
  const profileIds = profiles.map((p) => p.id);
  const photoUrls = Object.fromEntries(await getPrimaryPhotoUrls(profileIds));

  const { data: categoryRows } =
    profileIds.length > 0
      ? await supabase
          .from("published_profile_categories")
          .select("user_id, category, quick_fact")
          .in("user_id", profileIds)
          .in("category", ["religion_spirituality", "family"])
      : { data: [] };

  // Phase 7: Pass/Save/Like now live on Search's own cards too (prd.md
  // -> "Saving a profile — from AI Recommendations or from manual
  // Search" implies both, and PLAN.md's Phase 7 demo criterion tests
  // Search explicitly) — never requiresFeedback here, since Search is
  // manual browsing, not an AI recommendation (see DecisionActions).
  const { data: decisionRows } = await supabase.from("profile_decisions").select("target_user_id, decision").eq("user_id", user.id);
  const { data: savedRows } = await supabase.from("saved_profiles").select("target_user_id").eq("user_id", user.id);

  return (
    <SearchClient
      userId={user.id}
      baselineReached={!!userRow?.baseline_reached_at}
      initialProfiles={profiles ?? []}
      initialCategoryRows={categoryRows ?? []}
      initialDecisions={decisionRows ?? []}
      initialSaved={(savedRows ?? []).map((r) => r.target_user_id)}
      initialPhotoUrls={photoUrls}
    />
  );
}
