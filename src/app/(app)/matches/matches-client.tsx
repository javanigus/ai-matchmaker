"use client";

import { useState } from "react";
import Link from "next/link";
import DecisionActions from "@/components/decision-actions";

type Profile = {
  id: string;
  name: string | null;
  age: number | null;
  location_city: string | null;
  location_state: string | null;
  occupation: string | null;
};

type MutualItem = { otherUserId: string; matchId: string; at: string; profile: Profile };
type DecisionItem = { otherUserId: string; at: string; profile: Profile; saved?: boolean };

type Tab = "mutual" | "liked-me" | "i-liked";

function relativeTime(iso: string): string {
  const diffDays = Math.round((new Date().getTime() - new Date(iso).getTime()) / 86_400_000);
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  return `${diffDays} days ago`;
}

function CardShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="relative aspect-[3/4] bg-gradient-to-br from-accent-200 to-accent-400 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-14 h-14 text-white/70">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c1.5-4.5 5-6.5 8-6.5s6.5 2 8 6.5" />
        </svg>
      </div>
      <div className="p-4">
        <p className="font-medium text-stone-900">
          {profile.name}
          {profile.age ? `, ${profile.age}` : ""}
        </p>
        <p className="text-xs text-stone-500 mt-0.5">
          {[profile.location_city, profile.location_state].filter(Boolean).join(", ")}
          {profile.occupation ? ` · ${profile.occupation}` : ""}
        </p>
        {children}
      </div>
    </div>
  );
}

export default function MatchesClient({
  userId,
  mutual,
  iLiked,
  likedMe,
}: {
  userId: string;
  mutual: MutualItem[];
  iLiked: DecisionItem[];
  likedMe: DecisionItem[];
}) {
  const [tab, setTab] = useState<Tab>("mutual");
  const [likedMeItems, setLikedMeItems] = useState(likedMe);

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "mutual", label: "Mutual", count: mutual.length },
    { key: "liked-me", label: "Liked Me", count: likedMeItems.length },
    { key: "i-liked", label: "I Liked", count: iLiked.length },
  ];

  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="font-serif text-2xl text-stone-900 mb-1">Matches</h1>
      <p className="text-sm text-stone-500 mb-6">No AI needed here — just say hello.</p>

      <div className="flex items-center gap-1 border-b border-stone-200 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${
              tab === t.key ? "text-accent-700 border-accent-600" : "text-stone-500 border-transparent hover:text-stone-700"
            }`}
          >
            {t.label} {t.count > 0 && <span className="text-xs text-stone-400">({t.count})</span>}
          </button>
        ))}
      </div>

      {tab === "mutual" &&
        (mutual.length === 0 ? (
          <p className="text-sm text-stone-400 italic">No matches yet — when you and someone else both Like each other, they&apos;ll show up here.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {mutual.map(({ otherUserId, matchId, at, profile }) => (
              <CardShell key={otherUserId} profile={profile}>
                <p className="text-xs text-stone-500 mt-0.5">Matched {relativeTime(at)}</p>
                <div className="flex gap-2 mt-3.5">
                  <Link href={`/messages/${matchId}`} className="flex-1 text-center text-xs font-medium bg-accent-600 text-white rounded-full py-2 hover:bg-accent-700">
                    Message
                  </Link>
                  <Link
                    href={`/compatibility/${otherUserId}`}
                    className="flex-1 text-center text-xs font-medium border border-stone-300 text-stone-600 rounded-full py-2 hover:bg-stone-50"
                  >
                    Compatibility
                  </Link>
                </div>
              </CardShell>
            ))}
          </div>
        ))}

      {tab === "liked-me" &&
        (likedMeItems.length === 0 ? (
          <p className="text-sm text-stone-400 italic">Nobody&apos;s liked you yet — keep your profile up to date and check back.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {likedMeItems.map(({ otherUserId, at, profile, saved }) => (
              <CardShell key={otherUserId} profile={profile}>
                <p className="text-xs text-stone-500 mt-0.5">Liked you {relativeTime(at)}</p>
                <div className="mt-3.5">
                  <DecisionActions
                    userId={userId}
                    targetUserId={otherUserId}
                    requiresFeedback={false}
                    recommendationId={null}
                    source="search"
                    initial={{ decision: null, saved: !!saved }}
                    onDecided={(decision) => {
                      if (decision) setLikedMeItems((list) => list.filter((i) => i.otherUserId !== otherUserId));
                    }}
                  />
                </div>
              </CardShell>
            ))}
          </div>
        ))}

      {tab === "i-liked" &&
        (iLiked.length === 0 ? (
          <p className="text-sm text-stone-400 italic">You haven&apos;t liked anyone yet who hasn&apos;t liked you back — Search or AI Recommendations is a good place to start.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {iLiked.map(({ otherUserId, at, profile }) => (
              <CardShell key={otherUserId} profile={profile}>
                <p className="text-xs text-stone-500 mt-0.5">Liked {relativeTime(at)} — waiting for a response</p>
                <div className="mt-3.5">
                  <DecisionActions
                    userId={userId}
                    targetUserId={otherUserId}
                    requiresFeedback={false}
                    recommendationId={null}
                    source="search"
                    initial={{ decision: "like", saved: false }}
                  />
                </div>
              </CardShell>
            ))}
          </div>
        ))}
    </main>
  );
}
