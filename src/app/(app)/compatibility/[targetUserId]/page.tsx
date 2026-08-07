import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CompatibilityClient from "./compatibility-client";

export default async function CompatibilityPage({ params }: { params: Promise<{ targetUserId: string }> }) {
  const { targetUserId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signup");
  }

  const { data: targetProfile } = await supabase
    .from("published_profiles")
    .select("id, name, age, location_city, location_state, occupation")
    .eq("id", targetUserId)
    .single();
  if (!targetProfile) {
    notFound();
  }

  const { data: existingReport } = await supabase
    .from("compatibility_reports")
    .select("overall_level, summary_text, category_levels, generated_at")
    .eq("user_id", user.id)
    .eq("target_user_id", targetUserId)
    .maybeSingle();

  return <CompatibilityClient targetUserId={targetUserId} targetProfile={targetProfile} initialReport={existingReport ?? null} />;
}
