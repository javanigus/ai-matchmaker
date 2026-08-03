import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ALL_CATEGORIES } from "@/lib/categories";
import BasicsForm from "./basics-form";
import CategoriesSection from "./categories-section";

// The real routing rule (redirect here to onboarding when
// baseline_reached_at is null) lives in src/proxy.ts, not here — this
// page assumes it was already allowed through.
export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signup");
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: ethnicityRows } = await supabase
    .from("user_ethnicities")
    .select("ethnicity")
    .eq("user_id", user.id);

  const { data: categoryRows } = await supabase
    .from("profile_categories")
    .select("category, ai_summary, full_summary, confidence, visible, pending_summary, pending_confidence, quick_fact")
    .eq("user_id", user.id);

  const categoryMap = new Map((categoryRows ?? []).map((row) => [row.category, row]));

  return (
    <main className="max-w-lg mx-auto px-6 py-12">
      <h1 className="font-serif text-2xl text-stone-900 mb-1">My Profile</h1>
      <p className="text-sm text-stone-500 mb-6">
        You decide what&apos;s public. Your AI Matchmaker recommends, but never publishes anything on your behalf.
      </p>

      <BasicsForm
        userId={user.id}
        initial={{
          age: userRow?.age ?? null,
          gender: userRow?.gender ?? "",
          locationCity: userRow?.location_city ?? "",
          locationState: userRow?.location_state ?? "",
          locationCountry: userRow?.location_country ?? "",
          occupation: userRow?.occupation ?? "",
          ethnicities: (ethnicityRows ?? []).map((r) => r.ethnicity),
          publishedAt: userRow?.published_at ?? null,
        }}
      />

      <CategoriesSection
        userId={user.id}
        profileText={{
          profileText: userRow?.profile_text ?? null,
          pendingProfileText: userRow?.pending_profile_text ?? null,
        }}
        initial={ALL_CATEGORIES.map((category) => {
          const row = categoryMap.get(category);
          return {
            category,
            aiSummary: row?.ai_summary ?? null,
            fullSummary: row?.full_summary ?? null,
            confidence: row?.confidence ?? null,
            visible: row?.visible ?? false,
            pendingSummary: row?.pending_summary ?? null,
            pendingConfidence: row?.pending_confidence ?? null,
            quickFact: row?.quick_fact ?? null,
          };
        })}
      />
    </main>
  );
}
