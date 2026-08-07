"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  QUICK_FACT_OPTIONS,
  DEALBREAKER_GENDER_OPTIONS,
  GENDER_FILTER_TO_PROFILE_GENDER,
} from "@/lib/categories";
import DecisionActions from "@/components/decision-actions";

type Profile = {
  id: string;
  name: string | null;
  age: number | null;
  gender: string | null;
  location_city: string | null;
  location_state: string | null;
  occupation: string | null;
};

type CategoryRow = {
  user_id: string;
  category: string;
  quick_fact: string | null;
};

// UI-only bucketing, not shared with any SQL/enum elsewhere — matches
// prototype/search.html's Age range options verbatim.
const AGE_BUCKETS: { label: string; min: number; max: number | null }[] = [
  { label: "18–24", min: 18, max: 24 },
  { label: "25–34", min: 25, max: 34 },
  { label: "35–44", min: 35, max: 44 },
  { label: "45+", min: 45, max: null },
];

const RELIGION_OPTIONS = QUICK_FACT_OPTIONS.religion_spirituality!;
const CHILDREN_OPTIONS = QUICK_FACT_OPTIONS.family!;
const EDUCATION_OPTIONS = QUICK_FACT_OPTIONS.career!;
const RELATIONSHIP_GOALS_OPTIONS = QUICK_FACT_OPTIONS.relationship_goals!;

type Filters = {
  ageBucket: string;
  gender: string;
  religion: string;
  children: string;
  education: string;
  relationshipGoals: string;
};

const EMPTY_FILTERS: Filters = {
  ageBucket: "",
  gender: "",
  religion: "",
  children: "",
  education: "",
  relationshipGoals: "",
};

function chipsFor(userId: string, categoryRows: CategoryRow[]): string[] {
  return categoryRows
    .filter((r) => r.user_id === userId && r.quick_fact)
    .map((r) => r.quick_fact!)
    .slice(0, 2);
}

export default function SearchClient({
  userId,
  baselineReached,
  initialProfiles,
  initialCategoryRows,
  initialDecisions,
  initialSaved,
}: {
  userId: string;
  baselineReached: boolean;
  initialProfiles: Profile[];
  initialCategoryRows: CategoryRow[];
  initialDecisions: { target_user_id: string; decision: string }[];
  initialSaved: string[];
}) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [profiles, setProfiles] = useState(initialProfiles);
  const [categoryRows, setCategoryRows] = useState(initialCategoryRows);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [decisions, setDecisions] = useState(new Map(initialDecisions.map((d) => [d.target_user_id, d.decision as "pass" | "like"])));
  const [savedIds, setSavedIds] = useState(new Set(initialSaved));

  async function applyFilters() {
    setStatus("loading");
    const supabase = createClient();

    let query = supabase
      .from("published_profiles")
      .select("id, name, age, gender, location_city, location_state, occupation")
      .neq("id", userId);

    const bucket = AGE_BUCKETS.find((b) => b.label === filters.ageBucket);
    if (bucket) {
      query = query.gte("age", bucket.min);
      if (bucket.max != null) query = query.lte("age", bucket.max);
    }
    if (filters.gender) {
      query = query.eq("gender", GENDER_FILTER_TO_PROFILE_GENDER[filters.gender as keyof typeof GENDER_FILTER_TO_PROFILE_GENDER]);
    }

    const { data: baseProfiles, error: baseError } = await query;
    if (baseError) {
      setStatus("error");
      return;
    }

    // Each active category filter (Religion/Children/Education/Relationship
    // goals) narrows the candidate set independently — run them in
    // parallel and intersect, rather than one big join, since
    // published_profile_categories is one row per user per category and
    // there's no need for a dedicated SQL function here the way
    // Dealbreakers needed one (no per-viewer private state to protect,
    // these views are already safe for any authenticated user to read).
    const categoryFilters: { category: string; quickFact: string }[] = [];
    if (filters.religion) categoryFilters.push({ category: "religion_spirituality", quickFact: filters.religion });
    if (filters.children) categoryFilters.push({ category: "family", quickFact: filters.children });
    if (filters.education) categoryFilters.push({ category: "career", quickFact: filters.education });
    if (filters.relationshipGoals) categoryFilters.push({ category: "relationship_goals", quickFact: filters.relationshipGoals });

    let matchingIds: string[] | null = null;
    if (categoryFilters.length > 0) {
      const results = await Promise.all(
        categoryFilters.map(({ category, quickFact }) =>
          supabase.from("published_profile_categories").select("user_id").eq("category", category).eq("quick_fact", quickFact)
        )
      );
      if (results.some((r) => r.error)) {
        setStatus("error");
        return;
      }
      for (const r of results) {
        const ids: string[] = (r.data ?? []).map((row) => row.user_id as string);
        matchingIds = matchingIds ? matchingIds.filter((id) => ids.includes(id)) : ids;
      }
    }

    const finalProfiles = matchingIds
      ? (baseProfiles ?? []).filter((p) => matchingIds!.includes(p.id))
      : baseProfiles ?? [];

    const finalIds = finalProfiles.map((p) => p.id);
    const { data: chipRows } =
      finalIds.length > 0
        ? await supabase
            .from("published_profile_categories")
            .select("user_id, category, quick_fact")
            .in("user_id", finalIds)
            .in("category", ["religion_spirituality", "family"])
        : { data: [] };

    // Refresh decision/save state for whatever new candidate set just
    // appeared — otherwise a re-filter would show every card as freshly
    // undecided even for someone already Passed/Liked/Saved earlier.
    const [decisionResult, savedResult] =
      finalIds.length > 0
        ? await Promise.all([
            supabase.from("profile_decisions").select("target_user_id, decision").eq("user_id", userId).in("target_user_id", finalIds),
            supabase.from("saved_profiles").select("target_user_id").eq("user_id", userId).in("target_user_id", finalIds),
          ])
        : [{ data: [] }, { data: [] }];

    setDecisions(new Map((decisionResult.data ?? []).map((d) => [d.target_user_id, d.decision as "pass" | "like"])));
    setSavedIds(new Set((savedResult.data ?? []).map((r) => r.target_user_id)));
    setProfiles(finalProfiles);
    setCategoryRows(chipRows ?? []);
    setStatus("idle");
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setProfiles(initialProfiles);
    setCategoryRows(initialCategoryRows);
    setDecisions(new Map(initialDecisions.map((d) => [d.target_user_id, d.decision as "pass" | "like"])));
    setSavedIds(new Set(initialSaved));
    setStatus("idle");
  }

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="font-serif text-2xl text-stone-900 mb-1">Search</h1>
      <p className="text-sm text-stone-500 mb-6">
        Browse the full directory yourself, filter however you like — this page doesn&apos;t use AI.
      </p>

      {!baselineReached && (
        <div className="flex items-center justify-between gap-4 bg-accent-50 border border-accent-200 rounded-2xl px-4 py-3 mb-6">
          <p className="text-xs text-accent-800 leading-relaxed">
            Haven&apos;t talked to your AI Matchmaker yet? Start the conversation and I&apos;ll get to know you while
            you browse.
          </p>
          <Link
            href="/onboarding"
            className="shrink-0 text-xs font-semibold bg-accent-600 text-white rounded-full px-4 py-2 hover:bg-accent-700"
          >
            Meet your AI Matchmaker
          </Link>
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-wrap gap-2.5 mb-6">
        <select
          value={filters.ageBucket}
          onChange={(e) => setFilters((f) => ({ ...f, ageBucket: e.target.value }))}
          className="text-sm border border-stone-300 rounded-full pl-3 pr-7 py-2 text-stone-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent-300"
        >
          <option value="">Age range</option>
          {AGE_BUCKETS.map((b) => (
            <option key={b.label}>{b.label}</option>
          ))}
        </select>

        <select
          value={filters.gender}
          onChange={(e) => setFilters((f) => ({ ...f, gender: e.target.value }))}
          className="text-sm border border-stone-300 rounded-full pl-3 pr-7 py-2 text-stone-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent-300"
        >
          <option value="">Gender</option>
          {DEALBREAKER_GENDER_OPTIONS.map((opt) => (
            <option key={opt}>{opt}</option>
          ))}
        </select>

        <select
          value={filters.religion}
          onChange={(e) => setFilters((f) => ({ ...f, religion: e.target.value }))}
          className="text-sm border border-stone-300 rounded-full pl-3 pr-7 py-2 text-stone-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent-300"
        >
          <option value="">Religion</option>
          {RELIGION_OPTIONS.map((opt) => (
            <option key={opt}>{opt}</option>
          ))}
        </select>

        <select
          value={filters.children}
          onChange={(e) => setFilters((f) => ({ ...f, children: e.target.value }))}
          className="text-sm border border-stone-300 rounded-full pl-3 pr-7 py-2 text-stone-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent-300"
        >
          <option value="">Children</option>
          {CHILDREN_OPTIONS.map((opt) => (
            <option key={opt}>{opt}</option>
          ))}
        </select>

        <select
          disabled
          title="Not available yet — we only store city/state right now, not precise location."
          className="text-sm border border-stone-300 rounded-full pl-3 pr-7 py-2 text-stone-400 bg-stone-50 cursor-not-allowed"
        >
          <option>Distance</option>
        </select>

        <select
          value={filters.education}
          onChange={(e) => setFilters((f) => ({ ...f, education: e.target.value }))}
          className="text-sm border border-stone-300 rounded-full pl-3 pr-7 py-2 text-stone-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent-300"
        >
          <option value="">Education</option>
          {EDUCATION_OPTIONS.map((opt) => (
            <option key={opt}>{opt}</option>
          ))}
        </select>

        <select
          value={filters.relationshipGoals}
          onChange={(e) => setFilters((f) => ({ ...f, relationshipGoals: e.target.value }))}
          className="text-sm border border-stone-300 rounded-full pl-3 pr-7 py-2 text-stone-600 bg-white focus:outline-none focus:ring-2 focus:ring-accent-300"
        >
          <option value="">Relationship goals</option>
          {RELATIONSHIP_GOALS_OPTIONS.map((opt) => (
            <option key={opt}>{opt}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={applyFilters}
          disabled={status === "loading"}
          className="text-sm font-medium bg-accent-600 text-white px-4 py-2 rounded-full hover:bg-accent-700 disabled:opacity-50"
        >
          {status === "loading" ? "Searching…" : "Apply Filters"}
        </button>
        {hasActiveFilters && (
          <button type="button" onClick={clearFilters} className="text-sm font-medium text-stone-500 px-4 py-2 hover:underline">
            Clear
          </button>
        )}
      </div>

      {status === "error" && <p className="text-sm text-red-700 mb-4">Something went wrong searching. Try again.</p>}

      {profiles.length === 0 ? (
        <p className="text-sm text-stone-400 italic">No profiles match those filters.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {profiles.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="relative aspect-[3/4] bg-gradient-to-br from-accent-200 to-accent-400 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-14 h-14 text-white/70"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c1.5-4.5 5-6.5 8-6.5s6.5 2 8 6.5" />
                </svg>
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
                    requiresFeedback={false}
                    recommendationId={null}
                    source="search"
                    initial={{ decision: decisions.get(p.id) ?? null, saved: savedIds.has(p.id) }}
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
