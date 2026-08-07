"use client";

import { useState } from "react";
import { ALL_CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/categories";

type Level = "High" | "Medium" | "Low" | "Unknown";

type Report = {
  overall_level: string;
  summary_text: string;
  category_levels: Partial<Record<Category, Level>>;
  generated_at: string;
};

type Profile = {
  id: string;
  name: string | null;
  age: number | null;
  location_city: string | null;
  location_state: string | null;
  occupation: string | null;
};

const LEVEL_STYLES: Record<string, string> = {
  High: "bg-emerald-50 text-emerald-700",
  Medium: "bg-amber-50 text-amber-700",
  Low: "bg-red-50 text-red-700",
  Unknown: "bg-stone-100 text-stone-500",
};

function LevelPill({ level }: { level: string }) {
  return <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${LEVEL_STYLES[level] ?? LEVEL_STYLES.Unknown}`}>{level}</span>;
}

export default function CompatibilityClient({
  targetUserId,
  targetProfile,
  initialReport,
}: {
  targetUserId: string;
  targetProfile: Profile;
  initialReport: Report | null;
}) {
  const [report, setReport] = useState<Report | null>(initialReport);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setGenerating(true);
    setError("");
    const res = await fetch("/api/compatibility/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId }),
    });
    setGenerating(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't generate a report right now — try again.");
      return;
    }
    const data = await res.json();
    setReport(data.report);
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-200 to-accent-400 flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9 text-white/70">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c1.5-4.5 5-6.5 8-6.5s6.5 2 8 6.5" />
          </svg>
        </div>
        <div>
          <h1 className="font-serif text-2xl text-stone-900">
            Compatibility Report: {targetProfile.name}
            {targetProfile.age ? `, ${targetProfile.age}` : ""}
          </h1>
          <p className="text-sm text-stone-500">
            {[targetProfile.location_city, targetProfile.location_state].filter(Boolean).join(", ")}
            {targetProfile.occupation ? ` · ${targetProfile.occupation}` : ""}
          </p>
        </div>
      </div>

      <p className="text-xs text-stone-400 mb-6 max-w-md">
        This report compares what I know about you with what I know about {targetProfile.name}. It&apos;s generated only
        when you ask — it isn&apos;t calculated automatically while you browse.
      </p>

      {!report ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 text-center">
          <p className="text-sm text-stone-500 mb-4">No report yet — generate one to see how compatible you might be.</p>
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="bg-accent-600 text-white text-sm font-medium rounded-full px-5 py-2.5 hover:bg-accent-700 disabled:opacity-50"
          >
            {generating ? "Generating…" : "Generate Compatibility Report"}
          </button>
          {error && <p className="text-xs text-red-700 mt-3">{error}</p>}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 mb-8">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">Overall Compatibility</h2>
              <LevelPill level={report.overall_level} />
            </div>
            <p className="text-sm text-stone-600 leading-relaxed max-w-lg">{report.summary_text}</p>
          </div>

          <section className="mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400 mb-3">Category-by-category</h2>
            <div className="bg-white border border-stone-200 rounded-2xl divide-y divide-stone-100">
              {ALL_CATEGORIES.map((c) => (
                <div key={c} className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-sm text-stone-700">{CATEGORY_LABELS[c]}</span>
                  <LevelPill level={report.category_levels[c] ?? "Unknown"} />
                </div>
              ))}
            </div>
            <p className="text-xs text-stone-400 mt-2">Unknown means there isn&apos;t enough information yet — never treated as a Medium.</p>
          </section>
        </>
      )}
    </main>
  );
}
