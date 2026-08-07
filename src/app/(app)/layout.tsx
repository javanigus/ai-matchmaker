import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppNav from "@/components/app-nav";

// Shared shell for the 5 real, navigable post-auth pages (Search, AI
// Recommendations, Saved Profiles, My Profile, AI Memory) — a Next.js
// route group, so it doesn't add a URL segment (this file governs
// /profile, /search, etc. directly, not /app/profile). See
// components/app-nav.tsx for why this doesn't also take over the AI
// panel's layout or attempt the prototype's full 3-column shell.
//
// The redirect below duplicates each page's own auth check (and
// /profile, /ai-memory, /recommendations, /saved-profiles are further
// gated on baseline_reached_at in proxy.ts) — same defense-in-depth
// pattern already used elsewhere in this app. Needed here regardless
// since the layout itself queries `users.name` for the sidebar footer,
// which requires a real session to mean anything.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signup");
  }

  const { data: userRow } = await supabase.from("users").select("name").eq("id", user.id).single();

  return (
    <div className="lg:flex lg:min-h-screen">
      <AppNav userName={userRow?.name ?? null} />
      <div className="flex-1 min-w-0 pb-20 lg:pb-0">{children}</div>
    </div>
  );
}
