"use client";

import { useState } from "react";
import DecisionActions from "@/components/decision-actions";
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

type SavedProfile = {
  profile: Profile;
  source: "recommendation" | "search";
  recommendationId: string | null;
  decision: "pass" | "like" | null;
};

function chipsFor(userId: string, categoryRows: CategoryRow[]): string[] {
  return categoryRows
    .filter((r) => r.user_id === userId && r.quick_fact)
    .map((r) => r.quick_fact!)
    .slice(0, 2);
}

// Real deviation from prototype/saved-profiles.html, documented in
// PROGRESS.md: the mockup's cards only offer "View Profile" / "Remove"
// — deciding happens on the not-yet-built Full Profile page. That page
// doesn't exist in the real app (deferred the same way Search's own
// "View Profile" link was in Phase 5), but PLAN.md's own Phase 7 demo
// criterion explicitly requires "Save and later decide on a saved
// profile" to be a real, testable flow this phase — so Pass/Like live
// directly on this card instead.
export default function SavedProfilesClient({
  userId,
  savedProfiles,
  categoryRows,
  photoUrls,
}: {
  userId: string;
  savedProfiles: SavedProfile[];
  categoryRows: CategoryRow[];
  photoUrls: Record<string, string>;
}) {
  const [items, setItems] = useState(savedProfiles);

  function handleUnsaved(targetId: string) {
    setItems((list) => list.filter((i) => i.profile.id !== targetId));
  }

  function handleBlocked(targetId: string) {
    setItems((list) => list.filter((i) => i.profile.id !== targetId));
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="font-serif text-2xl text-stone-900 mb-1">Saved Profiles</h1>
      <p className="text-sm text-stone-500 mb-8">
        A holding area for people you&apos;re not ready to Pass or Like yet. Saving never affects your recommendations.
      </p>

      {items.length === 0 ? (
        <p className="text-sm text-stone-400 italic">Nothing saved yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(({ profile: p, source, recommendationId, decision }) => (
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
                    requiresFeedback={source === "recommendation"}
                    recommendationId={recommendationId}
                    source={source}
                    initial={{ decision, saved: true }}
                    onSavedChange={(saved) => {
                      if (!saved) handleUnsaved(p.id);
                    }}
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
