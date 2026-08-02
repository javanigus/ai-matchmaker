import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BasicsForm from "./basics-form";

// Phase 1 scope: Basics + Publish only. The real routing rule (redirect
// here to onboarding when baseline_reached_at is null) lives in
// src/proxy.ts, not here — this page assumes it was already allowed
// through.
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

  return (
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
  );
}
