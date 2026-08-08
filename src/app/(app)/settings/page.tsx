import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BlockedUsersClient from "./blocked-users-client";

// Minimal Settings page: only the blocked-users slice, built now
// rather than waiting for Phase 10's full Settings page. PLAN.md files
// "Settings: blocked list management" under Phase 10, but the PRD
// describes unblock as core to Block itself ("Blocking is
// reversible... previously blocked users can be reviewed and
// unblocked from Settings") — shipping Block with zero recourse for a
// full phase isn't acceptable, so this one slice is pulled forward.
// The rest of Settings (notifications, account deletion, etc.) stays
// Phase 10's job.
export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signup");
  }

  const { data: blockRows } = await supabase
    .from("blocks")
    .select("id, blocked_id, created_at")
    .eq("blocker_id", user.id)
    .order("created_at", { ascending: false });

  const blockedIds = (blockRows ?? []).map((b) => b.blocked_id);
  const { data: profiles } =
    blockedIds.length > 0 ? await supabase.from("published_profiles").select("id, name").in("id", blockedIds) : { data: [] };
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.name]));

  const blocked = (blockRows ?? []).map((b) => ({
    blockId: b.id as string,
    userId: b.blocked_id as string,
    // A blocked user may have since unpublished — still show the row
    // (an unblock action should always work), just with a fallback
    // label instead of silently dropping them from the list.
    name: profileMap.get(b.blocked_id) ?? "A profile that's no longer available",
  }));

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-serif text-2xl text-stone-900 mb-1">Settings</h1>
      <p className="text-sm text-stone-500 mb-8">Safety</p>

      <BlockedUsersClient initialBlocked={blocked} />
    </main>
  );
}
