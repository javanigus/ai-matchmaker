import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  const { data: profiles } = await supabase
    .from("published_profiles")
    .select("id, name, age, gender, location_city, location_state, occupation")
    .neq("id", user.id);

  const profileIds = (profiles ?? []).map((p) => p.id);

  const { data: categoryRows } =
    profileIds.length > 0
      ? await supabase
          .from("published_profile_categories")
          .select("user_id, category, quick_fact")
          .in("user_id", profileIds)
          .in("category", ["religion_spirituality", "family"])
      : { data: [] };

  return (
    <SearchClient
      userId={user.id}
      baselineReached={!!userRow?.baseline_reached_at}
      initialProfiles={profiles ?? []}
      initialCategoryRows={categoryRows ?? []}
    />
  );
}
