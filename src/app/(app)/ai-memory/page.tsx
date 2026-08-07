import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_LABELS, type Category } from "@/lib/categories";

// Baseline gating for this page lives in src/proxy.ts's GATED_PATHS —
// this assumes it was already allowed through.
export default async function AiMemoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signup");
  }

  const { data: events } = await supabase
    .from("ai_memory_events")
    .select("id, summary_text, source, categories, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // An event's Status is derived, not stored (docs/prd.md -> AI Memory):
  // AI inferred while any category it touched still has a live pending
  // draft pointing back at this specific event's id, Confirmed once none
  // do — whether because the user approved it, kept the current text
  // (also a reviewed decision), or a later conversation's draft
  // superseded this event's claim on that category entirely. Approving
  // or dismissing a pending draft (category-card.tsx) always nulls
  // pending_source_event_id, so this single query tells us everything
  // still outstanding across every event at once.
  const { data: pendingRows } = await supabase
    .from("profile_categories")
    .select("category, pending_source_event_id")
    .eq("user_id", user.id)
    .not("pending_source_event_id", "is", null);

  const stillPendingEventIds = new Set((pendingRows ?? []).map((r) => `${r.pending_source_event_id}:${r.category}`));

  const SOURCE_LABELS: Record<string, string> = {
    onboarding: "Onboarding interview",
    conversation: "Conversation",
  };

  function relativeDateLabel(createdAt: string): string {
    const eventDay = new Date(createdAt);
    eventDay.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - eventDay.getTime()) / 86_400_000);
    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  }

  const grouped: { label: string; items: typeof events }[] = [];
  for (const event of events ?? []) {
    const label = relativeDateLabel(event.created_at);
    const group = grouped.find((g) => g.label === label);
    if (group) group.items!.push(event);
    else grouped.push({ label, items: [event] });
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-12">
      <h1 className="font-serif text-2xl text-stone-900 mb-1">AI Memory</h1>
      <p className="text-sm text-stone-500 mb-8">How your AI Matchmaker has gotten to know you — a timeline, not a transcript.</p>

      {(!events || events.length === 0) && (
        <p className="text-sm text-stone-400 italic">Nothing here yet — this fills in as you talk with your AI Matchmaker.</p>
      )}

      <div className="space-y-8">
        {grouped.map((group) => (
          <section key={group.label}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-3">{group.label}</h2>
            <div className="space-y-3">
              {group.items!.map((event) => {
                const categories = (event.categories ?? []) as Category[];
                const isInferred = categories.some((c) => stillPendingEventIds.has(`${event.id}:${c}`));
                return (
                  <div key={event.id} className="bg-white border border-stone-200 rounded-2xl px-5 py-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-xs font-medium text-stone-400">{SOURCE_LABELS[event.source ?? ""] ?? "Conversation"}</span>
                      <span
                        title={
                          isInferred
                            ? "A conclusion the AI drew that you haven't stated directly or approved yet"
                            : "You stated this directly, or approved it on My Profile"
                        }
                        className={`text-[11px] font-medium rounded-full px-2.5 py-0.5 ${
                          isInferred ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {isInferred ? "AI inferred" : "Confirmed"}
                      </span>
                    </div>
                    <p className="text-sm text-stone-700 leading-relaxed">{event.summary_text}</p>
                    {categories.length > 0 && (
                      <div className="flex flex-wrap gap-x-1.5 gap-y-1 mt-3 text-xs text-stone-400">
                        <span>Updated:</span>
                        {categories.map((c, i) => (
                          <span key={c}>
                            <Link href={`/profile#${c}`} className="text-accent-700 hover:underline">
                              {CATEGORY_LABELS[c] ?? c}
                            </Link>
                            {i < categories.length - 1 ? "," : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
