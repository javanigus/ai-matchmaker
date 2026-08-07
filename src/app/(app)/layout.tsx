import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppNav from "@/components/app-nav";
import AiMatchmakerPanel from "@/components/ai-matchmaker-panel";

// Shared shell for the 5 real, navigable post-auth pages (Search, AI
// Recommendations, Saved Profiles, My Profile, AI Memory) — a Next.js
// route group, so it doesn't add a URL segment (this file governs
// /profile, /search, etc. directly, not /app/profile). See
// components/app-nav.tsx for why this doesn't also take over the
// prototype's full 3-column shell.
//
// The redirect below duplicates each page's own auth check (and
// /profile, /ai-memory, /recommendations, /saved-profiles are further
// gated on baseline_reached_at in proxy.ts) — same defense-in-depth
// pattern already used elsewhere in this app. Needed here regardless
// since the layout itself queries `users.name` for the sidebar footer,
// which requires a real session to mean anything.
//
// Per founder request: AiMatchmakerPanel now renders exactly once,
// here, instead of once per page (search-client.tsx, recommendations-
// client.tsx, saved-profiles-client.tsx, profile/page.tsx each used to
// render their own separate instance). Next.js layouts persist across
// client-side navigation between sibling routes they wrap — rendering
// the panel here means it stays the same mounted component as the user
// moves between pages, so its open/closed state and in-progress
// conversation now survive navigation for free, with no extra
// persistence layer (localStorage, context, etc.) needed. Doesn't
// survive a hard page reload (F5) — that's a real, separate gap,
// already disclosed in the panel's own comments (Phase 6) as a
// deliberate scope cut, not something this change silently fixes too.
//
// Search is the only one of these 5 pages reachable pre-baseline, so
// baselineReached is computed once here rather than per-page — when
// false, this can only mean we're on Search (every other page already
// redirected via proxy.ts before reaching this layout), where the page
// itself shows its own "meet your AI Matchmaker" banner instead.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signup");
  }

  const { data: userRow } = await supabase.from("users").select("name, baseline_reached_at").eq("id", user.id).single();

  return (
    <div className="lg:flex lg:min-h-screen">
      <AppNav userName={userRow?.name ?? null} />
      <div className="flex-1 min-w-0 pb-20 lg:pb-0">{children}</div>
      {userRow?.baseline_reached_at && <AiMatchmakerPanel />}
    </div>
  );
}
