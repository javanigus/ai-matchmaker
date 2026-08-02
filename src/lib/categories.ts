// Canonical category list + quick_fact option lists, as code constants
// (see docs/PLAN.md's note on quick_fact: small, fixed lists that change
// only as a deliberate product decision, not a database table). Shared
// by the extraction schema (Phase 2), the My Profile UI (Phase 3), and
// anywhere else a category needs to be named or validated.

export const BASELINE_CATEGORIES = [
  "relationship_goals",
  "family",
  "religion_spirituality",
  "lifestyle",
  "career",
  "social_energy",
] as const;

export const ADDITIONAL_CATEGORIES = [
  "communication_style",
  "travel",
  "fitness",
  "learning",
  "money_management",
  "politics",
] as const;

export const ALL_CATEGORIES = [...BASELINE_CATEGORIES, ...ADDITIONAL_CATEGORIES] as const;

export type Category = (typeof ALL_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  relationship_goals: "Relationship Goals",
  family: "Family",
  religion_spirituality: "Religion & Spirituality",
  lifestyle: "Lifestyle",
  career: "Career",
  social_energy: "Social Energy",
  communication_style: "Communication Style",
  travel: "Travel",
  fitness: "Fitness",
  learning: "Learning",
  money_management: "Money Management",
  politics: "Politics",
};

export const CONFIDENCE_LEVELS = ["Low", "Medium", "High"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

// Only these four categories define a quick_fact — null for every other
// category (see prd.md -> "Structured quick facts on narrative categories").
export const QUICK_FACT_OPTIONS: Partial<Record<Category, readonly string[]>> = {
  religion_spirituality: [
    "Muslim",
    "Christian",
    "Jewish",
    "Hindu",
    "Buddhist",
    "Spiritual",
    "Not religious",
  ],
  family: ["Wants children", "Has children", "Doesn't want children", "Undecided on children"],
  career: ["High school", "Bachelor's degree", "Master's degree", "Doctorate"],
  relationship_goals: ["Casual", "Long-term", "Long-term, open to marriage", "Marriage"],
};
