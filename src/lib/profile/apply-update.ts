// Shared "resolve a proposed category update against what's already
// there" logic — used by both onboarding's live per-turn extraction
// (src/app/api/onboarding/chat/route.ts) and Phase 6's ordinary
// session-close extraction (src/app/api/chat/close-session/route.ts).
// Extracted rather than duplicated: this app has already hit the same
// "two independently-drifted copies of one rule" bug three times this
// project (see PROGRESS.md's Phase 3 section) — the same
// confidence-never-silently-lowers invariant landing in two separate
// route files, with no shared source of truth, is exactly that pattern
// waiting to happen again.
export type ExistingCategoryState = {
  ai_summary?: string | null;
  full_summary?: string | null;
  confidence: string | null;
  pending_confidence: string | null;
  quick_fact: string | null;
};

export type ProposedCategoryUpdate = {
  confidence: "Low" | "Medium" | "High";
  quick_fact?: string;
};

const CONFIDENCE_RANK: Record<string, number> = { Low: 0, Medium: 1, High: 2 };

// The prompt already asks the model not to weaken an established
// category, but that's an instruction, not a guarantee — a real bug
// caught via founder testing (Phase 3) showed it doesn't reliably hold.
// Enforced here as a hard rule instead: an automated turn can raise a
// category's confidence, or update its text at the same confidence, but
// never silently lower it. A real correction still updates the text
// (full merge) — only the confidence floor is protected, and only a
// human reviewing it (My Profile) should be able to actually lower it.
export function resolveCategoryUpdate(
  existing: ExistingCategoryState | undefined,
  update: ProposedCategoryUpdate
): { finalConfidence: "Low" | "Medium" | "High"; finalQuickFact: string | null } {
  const existingLevel = existing?.confidence ?? existing?.pending_confidence ?? null;
  const existingRank = existingLevel ? CONFIDENCE_RANK[existingLevel] : -1;
  const proposedRank = CONFIDENCE_RANK[update.confidence];
  const finalConfidence = proposedRank < existingRank ? (existingLevel as "Low" | "Medium" | "High") : update.confidence;

  // A real bug caught while wiring up the quick-fact-pursuit prompt in
  // onboarding: writing `update.quick_fact ?? null` unconditionally let a
  // turn that updated a category's narrative text without re-stating its
  // quick_fact silently wipe out an already-correct quick_fact from an
  // earlier turn. Falls back to the existing value instead of null.
  const finalQuickFact = update.quick_fact ?? existing?.quick_fact ?? null;

  return { finalConfidence, finalQuickFact };
}
