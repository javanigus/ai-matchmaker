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

// Real bug caught via founder testing: extraction only ever saw the bare
// label for each category ("Lifestyle", "Social Energy"), which wasn't
// enough disambiguation once both carried a similarly-shaped quick_fact
// scale (homebody/balanced/outgoing vs introverted/balanced/extroverted)
// — a Lifestyle answer with zero social content ("I hike, have a dog,
// cook dinner instead of going out") got fabricated into a Social Energy
// update anyway, presumably because both categories now read as "how
// social are you." One clarifying line per baseline category, called out
// explicitly where two categories could plausibly be confused for
// each other.
export const CATEGORY_DESCRIPTIONS: Record<(typeof BASELINE_CATEGORIES)[number], string> = {
  relationship_goals: "what kind of relationship they want (casual vs. long-term vs. marriage) — their own goal, never a partner preference.",
  family: "their own stance on children and family life — not what they want in a partner's family.",
  religion_spirituality: "their own religious or spiritual beliefs and practice — not what faith they want in a partner.",
  lifestyle: "daily routines and habits: hobbies, travel, fitness, tidiness, substances, what a typical week looks like. NOT about introversion/extroversion or how social they are — a mention of staying in vs. going out is about routine here, not social energy. That's the Social Energy category instead.",
  career: "their job, ambition, and how central work is to their identity — not just education level.",
  social_energy: "how they recharge and how social they are — introverted vs. extroverted, alone time vs. group time, parties vs. one-on-one. NOT about daily routines, hobbies, or how they spend a typical week — that's the Lifestyle category instead. Don't infer this from a Lifestyle answer alone; it needs its own real signal.",
};

export const CONFIDENCE_LEVELS = ["Low", "Medium", "High"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

// Phase 4 (Dealbreakers): a dealbreaker is a requirement about a
// partner, not the same enum as the matching profile attribute — e.g.
// Family's own quick_fact options are Wants/Has/Doesn't want/Undecided,
// but the Children *dealbreaker* is a coarser yes/no requirement. These
// exact literal strings are also hardcoded in
// supabase/migrations/20260804010000_dealbreaker_filter_function.sql's
// SQL filter — keep both in sync if either ever changes.
export const DEALBREAKER_GENDER_OPTIONS = ["Women", "Men", "Non-binary"] as const;
export const DEALBREAKER_CHILDREN_OPTIONS = ["Must want children", "Must not have children"] as const;
export const DEALBREAKER_EDUCATION_OPTIONS = ["Bachelor's degree or higher", "Graduate degree"] as const;

// Real mismatch baked into the prototype itself, caught while building
// Phase 5 (Search reuses this same enum for its own Gender filter): a
// preference about a partner reads naturally in the plural ("Women",
// "Men" — see the Dealbreakers and Search filter mockups), but a
// person's own Gender field (basics-form.tsx, users.gender) is
// singular ("Woman", "Man"). Anything that compares a Gender
// dealbreaker/filter value against a stored profile's gender must go
// through this map first — comparing the strings directly (as Phase
// 4's published_candidates_for originally did) silently matches
// nobody, since "Women" !== "Woman".
export const GENDER_FILTER_TO_PROFILE_GENDER: Record<(typeof DEALBREAKER_GENDER_OPTIONS)[number], string> = {
  Women: "Woman",
  Men: "Man",
  "Non-binary": "Non-binary",
};

// These six baseline categories each define a quick_fact — null for
// every other category (see prd.md -> "Structured quick facts on
// narrative categories"). Lifestyle and Social Energy joined this list
// per founder decision (onboarding's two-step questioning, added the
// same phase) — a closed pick gives people something concrete to answer
// when a category feels too open-ended to know where to start.
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
  lifestyle: ["Mostly homebody", "Balanced", "Mostly outgoing"],
  social_energy: ["Mostly introverted", "Slightly introverted", "Balanced", "Slightly extroverted", "Mostly extroverted"],
};

// Onboarding's two-step questioning (chat/route.ts): the second, open-
// ended question per baseline category, with concrete example angles —
// per founder feedback, a vague "tell me more about X" leaves people not
// knowing what to say. Content is the founder's own, verbatim.
export const CATEGORY_OPEN_PROMPTS: Record<(typeof BASELINE_CATEGORIES)[number], { intro: string; topics: string[] }> = {
  relationship_goals: {
    intro: "Tell me a little more about what you're hoping to build. There's no right answer.",
    topics: [
      "what they want their future relationship to look like",
      "whether they're in a hurry or happy to let things develop naturally",
      "what a healthy relationship means to them",
      "whether they value friendship, romance, stability, shared goals, or starting a family",
    ],
  },
  family: {
    intro: "Tell me a little about family in general.",
    topics: [
      "how important family is in your life",
      "whether you're close to your parents or siblings",
      "what kind of family life you'd like in the future",
      "whether you'd relocate for the right partner",
      "how you imagine balancing work and family",
    ],
  },
  religion_spirituality: {
    intro: "Tell me a little more about your beliefs.",
    topics: [
      "how important religion or spirituality is in daily life",
      "whether they hope to share the same faith with a partner",
      "practices or traditions that matter to them",
      "whether they're open to someone with different beliefs",
      "values that guide how they live",
    ],
  },
  lifestyle: {
    intro: "What's a typical week like for you?",
    topics: [
      "hobbies or interests",
      "travel",
      "fitness or exercise",
      "weekends",
      "staying in vs. going out",
      "pets",
      "drinking or smoking",
      "how organized or spontaneous you are",
      "what you enjoy doing after work",
    ],
  },
  career: {
    intro: "Tell me a little about your career.",
    topics: [
      "what you enjoy about your work",
      "how ambitious you are",
      "whether work is a major part of your identity",
      "your work-life balance",
      "future goals",
      "whether entrepreneurship interests you",
      "what success means to you",
    ],
  },
  social_energy: {
    intro: "Tell me a little about how you recharge and spend your free time. There are no right or wrong answers.",
    topics: [
      "whether they enjoy staying home or going out",
      "how often they like seeing friends or family",
      "whether they enjoy parties, concerts, or large gatherings",
      "whether they prefer one-on-one conversations or groups",
      "how much alone time they usually need to recharge",
      "what a perfect weekend looks like for them",
      "whether they enjoy meeting new people or keeping a small circle of close friends",
    ],
  },
};
