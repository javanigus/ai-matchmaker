import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SavedProfilesClient from "./saved-profiles-client";

export default async function SavedProfilesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signup");
  }

  const { data: savedRows } = await supabase
    .from("saved_profiles")
    .select("target_user_id, source, recommendation_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const targetIds = (savedRows ?? []).map((r) => r.target_user_id);

  const { data: profiles } =
    targetIds.length > 0
      ? await supabase
          .from("published_profiles")
          .select("id, name, age, gender, location_city, location_state, occupation")
          .in("id", targetIds)
      : { data: [] };

  const { data: categoryRows } =
    targetIds.length > 0
      ? await supabase
          .from("published_profile_categories")
          .select("user_id, category, quick_fact")
          .in("user_id", targetIds)
          .in("category", ["religion_spirituality", "family"])
      : { data: [] };

  // A saved profile can already have a real decision on it (Save never
  // requires deciding, but nothing stops someone from deciding on a
  // saved profile later without unsaving first) — prd.md: "Saved
  // Profiles is simply a holding area for profiles the user hasn't
  // decided on yet," but doesn't say a decided one must disappear from
  // it, so this fetches existing decisions to show the real current
  // state rather than always rendering as freshly undecided.
  const { data: decisionRows } =
    targetIds.length > 0
      ? await supabase
          .from("profile_decisions")
          .select("target_user_id, decision")
          .eq("user_id", user.id)
          .in("target_user_id", targetIds)
      : { data: [] };
  const decisionMap = new Map((decisionRows ?? []).map((d) => [d.target_user_id, d.decision as "pass" | "like"]));

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const savedProfiles = (savedRows ?? [])
    .filter((r) => profileMap.has(r.target_user_id))
    .map((r) => ({
      profile: profileMap.get(r.target_user_id)!,
      source: (r.source ?? "search") as "recommendation" | "search",
      recommendationId: r.recommendation_id as string | null,
      decision: decisionMap.get(r.target_user_id) ?? null,
    }));

  return <SavedProfilesClient userId={user.id} savedProfiles={savedProfiles} categoryRows={categoryRows ?? []} />;
}
