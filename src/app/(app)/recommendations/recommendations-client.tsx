"use client";

import { useState } from "react";
import DecisionActions, { type Decision } from "@/components/decision-actions";
import AiMatchmakerPanel from "@/components/ai-matchmaker-panel";

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

export default function RecommendationsClient({
  userId,
  candidates,
  categoryRows,
}: {
  userId: string;
  candidates: Candidate[];
  categoryRows: CategoryRow[];
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

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-serif text-2xl text-stone-900 mb-1">AI Recommendations</h1>
      <p className="text-sm text-stone-500 mb-8">
        Candidates who clear your Dealbreakers, filtered out once you decide — no compatibility ranking yet, that&apos;s
        still on the way.
      </p>

      <AiMatchmakerPanel />

      {remaining.length === 0 ? (
        <p className="text-sm text-stone-400 text-center py-10">
          You&apos;re all caught up — no new recommendations right now. Check back again soon.
        </p>
      ) : (
        <div className="space-y-4">
          {remaining.map(({ profile: p, recommendationId, saved }) => (
            <div key={p.id} className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="p-5 flex gap-4">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-accent-200 to-accent-400 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-white/70">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c1.5-4.5 5-6.5 8-6.5s6.5 2 8 6.5" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-lg text-stone-900 leading-snug">
                    {p.name}
                    {p.age ? `, ${p.age}` : ""}
                    {p.occupation && <span className="font-sans text-sm font-normal text-stone-500"> · {p.occupation}</span>}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">{[p.location_city, p.location_state].filter(Boolean).join(", ")}</p>
                  {chipsFor(p.id, categoryRows).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {chipsFor(p.id, categoryRows).map((chip, i) => (
                        <span key={i} className="text-[11px] bg-stone-100 text-stone-600 rounded-full px-2 py-0.5">
                          {chip}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="border-t border-stone-100 bg-stone-50/70 p-5">
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
          ))}
        </div>
      )}
    </main>
  );
}
