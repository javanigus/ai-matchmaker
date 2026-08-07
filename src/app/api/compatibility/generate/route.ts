import { createClient } from "@/lib/supabase/server";
import { generateCompatibilityReport } from "@/lib/compatibility/generate-report";

// Generated only on request, never automatically while browsing (prd.md
// -> Compatibility Reports), and cached on generation — a second
// request for the same pair returns the existing row instead of paying
// for another LLM call, matching the schema's own original comment
// ("Cached on generation, not recomputed per view").
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { targetUserId } = body as { targetUserId?: string };
  if (!targetUserId) {
    return Response.json({ error: "targetUserId required" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("compatibility_reports")
    .select("overall_level, summary_text, category_levels, generated_at")
    .eq("user_id", user.id)
    .eq("target_user_id", targetUserId)
    .maybeSingle();
  if (existing) {
    return Response.json({ report: existing, cached: true });
  }

  const { data: viewerRow } = await supabase.from("users").select("name").eq("id", user.id).single();
  const { data: targetRow } = await supabase.from("published_profiles").select("name").eq("id", targetUserId).single();
  if (!targetRow) {
    return Response.json({ error: "That profile isn't available." }, { status: 404 });
  }

  const { data: viewerCategories } = await supabase
    .from("profile_categories")
    .select("category, ai_summary, quick_fact")
    .eq("user_id", user.id);

  // Security-definer RPC — profile_categories RLS is owner-only, so
  // reading the target's full (not just Visible) category data needs
  // this, per prd.md's "Matching always reasons over everything the AI
  // knows regardless of visibility." See the migration for the
  // auth.uid() + published-only guards.
  const { data: targetCategories, error: rpcError } = await supabase.rpc("get_target_categories_for_report", {
    viewer_id: user.id,
    target_id: targetUserId,
  });
  if (rpcError) {
    return Response.json({ error: "Couldn't load that profile's data." }, { status: 403 });
  }

  const result = await generateCompatibilityReport(
    viewerRow?.name ?? "You",
    targetRow.name ?? "them",
    viewerCategories ?? [],
    (targetCategories ?? []) as { category: string; ai_summary: string | null; quick_fact: string | null }[]
  );

  if (!result) {
    return Response.json({ error: "Couldn't generate a report right now — try again." }, { status: 502 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("compatibility_reports")
    .insert({
      user_id: user.id,
      target_user_id: targetUserId,
      overall_level: result.overallLevel,
      summary_text: result.summaryText,
      category_levels: result.categoryLevels,
    })
    .select("overall_level, summary_text, category_levels, generated_at")
    .single();

  if (insertError || !inserted) {
    return Response.json({ error: "Generated the report but couldn't save it — try again." }, { status: 500 });
  }

  return Response.json({ report: inserted, cached: false });
}
