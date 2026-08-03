"use client";

import { useState } from "react";
import { BASELINE_CATEGORIES, ADDITIONAL_CATEGORIES, CATEGORY_LABELS, QUICK_FACT_OPTIONS } from "@/lib/categories";
import CategoryCard, { type CategoryCardState } from "./category-card";
import ProfileTextCard, { type ProfileTextState } from "./profile-text-card";

export default function CategoriesSection({
  userId,
  profileText,
  initial,
}: {
  userId: string;
  profileText: ProfileTextState;
  initial: CategoryCardState[];
}) {
  const [fullSummary, setFullSummary] = useState<{ label: string; text: string } | null>(null);
  const stateByCategory = new Map(initial.map((c) => [c.category, c]));

  return (
    <section>
      {/* Above Core categories per founder decision — it reads as the
          overall headline summary, so it belongs before the categories
          that back it up, not buried at the bottom like the prototype
          originally had it. */}
      <ProfileTextCard userId={userId} initial={profileText} />

      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">About</h2>
      </div>
      <p className="text-xs text-stone-400 mb-5 leading-relaxed">
        Your AI Matchmaker writes each summary from your conversations. Edit anything, and turn Visible off to keep a
        category out of your public profile — it&apos;s still learned and still used for matching either way. When a
        conversation adds something new, you&apos;ll see it as an editable update below the category — nothing changes
        until you approve it, edit it, or keep what&apos;s already there.
      </p>

      <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2">Core categories</h3>
      <p className="text-[11px] text-stone-400 mb-3">These six mattered most for getting your first recommendations started.</p>
      <div className="space-y-3 mb-8">
        {BASELINE_CATEGORIES.map((category) => (
          <CategoryCard
            key={category}
            userId={userId}
            label={CATEGORY_LABELS[category]}
            quickFactOptions={QUICK_FACT_OPTIONS[category]}
            initial={stateByCategory.get(category)!}
            onShowFullSummary={(label, text) => setFullSummary({ label, text })}
          />
        ))}
      </div>

      <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-2">Additional categories</h3>
      <p className="text-[11px] text-stone-400 mb-3">These fill in naturally over time — no rush to complete them.</p>
      <div className="space-y-3">
        {ADDITIONAL_CATEGORIES.map((category) => (
          <CategoryCard
            key={category}
            userId={userId}
            label={CATEGORY_LABELS[category]}
            quickFactOptions={QUICK_FACT_OPTIONS[category]}
            initial={stateByCategory.get(category)!}
            onShowFullSummary={(label, text) => setFullSummary({ label, text })}
          />
        ))}
      </div>

      {fullSummary && (
        <div className="fixed inset-0 z-[70] bg-stone-950/50 flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setFullSummary(null)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-serif text-lg text-stone-900">{fullSummary.label}</h2>
              <button
                type="button"
                onClick={() => setFullSummary(null)}
                className="text-stone-400 hover:text-stone-600 shrink-0"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-stone-400 mb-4">
              Everything your AI Matchmaker has picked up here — for reading, not editing. Only private to you.
            </p>
            <p className="text-sm text-stone-600 leading-relaxed">{fullSummary.text}</p>
          </div>
        </div>
      )}
    </section>
  );
}
