// Shared "does a category meet baseline" logic — extracted so
// chat/route.ts (real-time, per-turn) and onboarding/page.tsx (page-load
// resume) can't quietly drift apart on what "done" means. A real risk
// this session already saw more than once: two implementations of the
// same rule are two chances to get it wrong differently.
import { BASELINE_CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";

export type CategoryState = {
  confidence: string | null;
  pending_confidence: string | null;
  ai_summary: string | null;
  full_summary: string | null;
};

// A category already at Medium/High confidence can still be narratively
// thin (e.g. a bare quick-fact pick) — see chat/route.ts's own comment
// history for the real bugs that made this necessary. Confidence alone
// isn't "done"; genuine narrative depth is required too.
export const MIN_NARRATIVE_WORDS = 18;

export function hasNarrativeDepth(state: CategoryState | undefined): boolean {
  const text = state?.ai_summary ?? state?.full_summary ?? "";
  return text.trim().split(/\s+/).filter(Boolean).length >= MIN_NARRATIVE_WORDS;
}

export function meetsBaseline(state: CategoryState | undefined): boolean {
  const level = state?.confidence ?? state?.pending_confidence;
  if (level !== "Medium" && level !== "High") return false;
  return hasNarrativeDepth(state);
}

export function computeProgress(categoryMap: Record<string, CategoryState | undefined>) {
  const metCategories = BASELINE_CATEGORIES.filter((c) => meetsBaseline(categoryMap[c]));
  return {
    percent: Math.round((metCategories.length / BASELINE_CATEGORIES.length) * 100),
    categories: BASELINE_CATEGORIES.map((c) => ({
      category: c,
      label: CATEGORY_LABELS[c],
      met: meetsBaseline(categoryMap[c]),
    })),
  };
}
