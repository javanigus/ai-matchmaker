import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import RecommendationsClient from "./recommendations-client";

// Real gap caught before starting Phase 7: this page's own bullet in
// docs/PLAN.md ("Pass/Like/Save/Undo wired to profile_decisions/
// saved_profiles... required once per recommendation_id") assumes AI
// Recommendations already exists, but no phase in the 10-phase plan
// ever built the actual generation mechanism — it's referenced
// throughout the docs as if real, never scheduled. Per founder decision
// (asked directly rather than assumed), building a minimal real version
// here: candidates are the same Dealbreakers-filtered pool Phase 4's
// published_candidates_for() already produces (technical-plan.md's own
// guidance — cheap deterministic filtering before any expensive LLM
// step), minus anyone already decided on. No per-pair LLM compatibility
// scoring or ranking yet — that's explicitly Phase 8's Compatibility
// Reports job, so there's no "why this match" blurb or compatibility
// badge here, unlike prototype/recommendations.html's mockup. Ordering
// is not AI-curated at this stage, only filtered.
//
// recommendation_id is generated fresh per candidate on each page load
// (crypto.randomUUID(), not persisted anywhere until an actual Pass/
// Like/Save happens) rather than backed by a real recommendations
// table — nothing in this app's schema ever defined one, and
// profile_decisions.recommendation_id is just a bare uuid, not a
// foreign key. This satisfies "every AI-generated recommendation
// carries a unique recommendation_id" literally without new
// persistence infrastructure the minimal scope doesn't need yet.
export default async function RecommendationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signup");
  }

  const { data: candidateRows, error: rpcError } = await supabase.rpc("published_candidates_for", { viewer_id: user.id });

  if (rpcError) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="font-serif text-2xl text-stone-900 mb-1">AI Recommendations</h1>
        <p className="text-sm text-red-700">Something went wrong loading recommendations. Try again.</p>
      </main>
    );
  }

  const candidateIds = ((candidateRows ?? []) as { candidate_id: string }[]).map((r) => r.candidate_id);

  // Recommendations only ever shows undecided candidates — once a
  // decision exists (from anywhere, not just this page), they drop out
  // of the feed. A saved-but-undecided candidate still shows here,
  // since Save is explicitly not a decision (prd.md).
  const { data: decidedRows } = await supabase.from("profile_decisions").select("target_user_id").eq("user_id", user.id);
  const decidedIds = new Set((decidedRows ?? []).map((r) => r.target_user_id));
  const undecidedIds = candidateIds.filter((id) => !decidedIds.has(id));

  const { data: profiles } =
    undecidedIds.length > 0
      ? await supabase
          .from("published_profiles")
          .select("id, name, age, gender, location_city, location_state, occupation")
          .in("id", undecidedIds)
      : { data: [] };

  const { data: savedRows } = await supabase.from("saved_profiles").select("target_user_id").eq("user_id", user.id);
  const savedIds = new Set((savedRows ?? []).map((r) => r.target_user_id));

  const { data: categoryRows } =
    undecidedIds.length > 0
      ? await supabase
          .from("published_profile_categories")
          .select("user_id, category, quick_fact")
          .in("user_id", undecidedIds)
          .in("category", ["religion_spirituality", "family"])
      : { data: [] };

  const candidates = (profiles ?? []).map((p) => ({
    profile: p,
    recommendationId: randomUUID(),
    saved: savedIds.has(p.id),
  }));

  return (
    <RecommendationsClient
      userId={user.id}
      candidates={candidates}
      categoryRows={categoryRows ?? []}
    />
  );
}
