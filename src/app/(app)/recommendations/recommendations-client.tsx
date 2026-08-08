"use client";

import { useState } from "react";
import DecisionActions, { type Decision } from "@/components/decision-actions";
import ReportBlockMenu from "@/components/report-block-menu";

type Profile = {
  id: string;
  name: string | null;
  age: number | null;
  gender: string | null;
  location_city: string | null;
  location_state: string | null;
  occupation: string | null;
};

type CategoryRow = { user_id: string; category: string; quick_fact: string | null };

type Candidate = { profile: Profile; recommendationId: string; saved: boolean };

function chipsFor(userId: string, categoryRows: CategoryRow[]): string[] {
  return categoryRows
    .filter((r) => r.user_id === userId && r.quick_fact)
    .map((r) => r.quick_fact!)
    .slice(0, 2);
}

// Per founder request: matches the same 3-col grid card style as
// Search and Saved Profiles, rather than the prototype's own wider
// single-column list cards — visual consistency across all three
// candidate-browsing surfaces mattered more here than fidelity to a
// mockup that also assumed real compatibility scoring this phase
// deliberately doesn't build yet (see page.tsx's own comment).
export default function RecommendationsClient({
  userId,
  candidates,
  categoryRows,
  photoUrls,
}: {
  userId: string;
  candidates: Candidate[];
  categoryRows: CategoryRow[];
  photoUrls: Record<string, string>;
}) {
  // Decided candidates drop out of the feed immediately — Recommendations
  // is "who's left to consider," not a history log (that's Saved
  // Profiles / a future History view, prototype/recommendations.html's
  // own "History" tab — not built this phase, out of scope for the
  // Phase 7 demo criteria named in PLAN.md).
  const [remaining, setRemaining] = useState(candidates);

  function handleDecided(targetId: string, decision: Decision) {
    if (decision) {
      setRemaining((r) => r.filter((c) => c.profile.id !== targetId));
    }
  }

  function handleBlocked(targetId: string) {
    setRemaining((r) => r.filter((c) => c.profile.id !== targetId));
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="font-serif text-2xl text-stone-900 mb-1">AI Recommendations</h1>
      <p className="text-sm text-stone-500 mb-8">
        Candidates who clear your Dealbreakers, filtered out once you decide — no compatibility ranking yet, that&apos;s
        still on the way.
      </p>

      {remaining.length === 0 ? (
        <p className="text-sm text-stone-400 text-center py-10">
          You&apos;re all caught up — no new recommendations right now. Check back again soon.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {remaining.map(({ profile: p, recommendationId, saved }) => (
            <div key={p.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="relative aspect-[3/4] bg-gradient-to-br from-accent-200 to-accent-400 flex items-center justify-center">
                {photoUrls[p.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrls[p.id]} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-14 h-14 text-white/70">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c1.5-4.5 5-6.5 8-6.5s6.5 2 8 6.5" />
                  </svg>
                )}
                <div className="absolute top-2 right-2">
                  <ReportBlockMenu userId={userId} targetUserId={p.id} targetUserName={p.name ?? "this person"} onBlocked={() => handleBlocked(p.id)} />
                </div>
              </div>
              <div className="p-4">
                <p className="font-medium text-stone-900">
                  {p.name}
                  {p.age ? `, ${p.age}` : ""}
                </p>
                <p className="text-xs text-stone-500 mt-0.5">
                  {[p.location_city, p.location_state].filter(Boolean).join(", ")}
                  {p.occupation ? ` · ${p.occupation}` : ""}
                </p>
                {chipsFor(p.id, categoryRows).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {chipsFor(p.id, categoryRows).map((chip, i) => (
                      <span key={i} className="text-[11px] bg-stone-100 text-stone-600 rounded-full px-2 py-0.5">
                        {chip}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3.5">
                  <DecisionActions
                    userId={userId}
                    targetUserId={p.id}
                    requiresFeedback={true}
                    recommendationId={recommendationId}
                    source="recommendation"
                    initial={{ decision: null, saved }}
                    onDecided={(decision) => handleDecided(p.id, decision)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
