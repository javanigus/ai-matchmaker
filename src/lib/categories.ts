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
// social are you." One clarifying line per category, called out
// explicitly where two categories could plausibly be confused for
// each other. Originally baseline-only (onboarding never touches the
// other 6); extended to all 12 for Phase 6, since ordinary post-baseline
// conversation is the only path that ever fills in the additional
// categories — same overlap risk applies there (Lifestyle's own text
// used to list "hobbies, travel, fitness" as in-scope, which would have
// silently absorbed content that now belongs to the real standalone
// Travel and Fitness categories below; narrowed to avoid that).
export const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  relationship_goals: "what kind of relationship they want (casual vs. long-term vs. marriage) — their own goal, never a partner preference.",
  family: "their own stance on children and family life — not what they want in a partner's family.",
  religion_spirituality: "their own religious or spiritual beliefs and practice — not what faith they want in a partner.",
  lifestyle: "daily routines and habits: general hobbies, tidiness, substances, what a typical week looks like. NOT introversion/extroversion or how social they are (that's Social Energy), and NOT travel or exercise specifically — those have their own Travel and Fitness categories below, even though they're technically part of someone's routine.",
  career: "their job, ambition, and how central work is to their identity — not just education level.",
  social_energy: "how they recharge and how social they are — introverted vs. extroverted, alone time vs. group time, parties vs. one-on-one. NOT about daily routines, hobbies, or how they spend a typical week — that's the Lifestyle category instead. Don't infer this from a Lifestyle answer alone; it needs its own real signal.",
  communication_style: "how they communicate and handle conflict in a relationship — directness, expressing feelings, love language, resolving disagreements. NOT how social or outgoing they are in general (that's Social Energy) — this is specifically about communicating with a partner.",
  travel: "how much they travel, what kind of trips they enjoy, how much travel matters to them. A general one-line mention of travel as part of a busy week belongs to Lifestyle unless there's real specific signal about travel itself (frequency, style, destinations, how much it matters to them).",
  fitness: "exercise habits, activity level, sports, physical wellness priorities. A passing mention of being active belongs to Lifestyle unless there's real specific signal about fitness itself (what they do, how often, how much it matters to them).",
  learning: "intellectual curiosity and how they like to grow — reading, podcasts, courses, learning new skills, genuine curiosity about the world.",
  money_management: "their own financial habits and values — saving vs. spending, financial goals, how they think about money day to day. NOT income, net worth, or a partner's finances.",
  politics: "their own political views and how central politics is to their life and identity — never a preference about a partner's politics.",
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

// Every category now defines a quick_fact (see prd.md -> "Structured
// quick facts on narrative categories") — the 6 baseline ones joined
// this list during onboarding's two-step questioning (Phase 3); the 6
// additional ones joined it in Phase 6 so ordinary post-baseline
// conversation can follow the exact same two-step pattern to fill them
// in (founder-provided content, verbatim). A closed pick gives people
// something concrete to answer when a category feels too open-ended to
// know where to start.
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
  communication_style: ["Direct", "Balanced", "Gentle", "Still figuring it out"],
  travel: ["Not important", "Nice occasionally", "Enjoy it", "Very important", "One of my biggest passions"],
  fitness: ["Rarely exercise", "Occasionally active", "Active a few times a week", "Very active", "Fitness is a major part of my life"],
  learning: ["Not a big priority", "Learn when needed", "Curious about many things", "Love learning", "Lifelong learner"],
  money_management: [
    "Spend today, worry later",
    "Balanced spender",
    "Careful saver",
    "Focused on investing",
    "Financial independence is a major goal",
  ],
  politics: ["Very liberal", "Liberal", "Moderate", "Conservative", "Very conservative", "Prefer not to say"],
};

// The additional 6 categories' step-1 question, unlike the baseline 6,
// is used verbatim rather than left for the model to phrase — the
// founder supplied exact question wording this time (not just an
// options list), and since ongoing chat's step-1 turn is fully
// deterministic anyway (see /api/chat/message's startCategory handling
// — no LLM call needed to start the flow), using the real wording
// directly is both more faithful and removes any chance of drift.
export const ADDITIONAL_CATEGORY_STEP1_QUESTIONS: Record<(typeof ADDITIONAL_CATEGORIES)[number], string> = {
  communication_style: "Which best describes your communication style?",
  travel: "How important is travel to you?",
  fitness: "How active are you?",
  learning: "How would you describe your interest in learning?",
  money_management: "Which best describes your approach to money?",
  politics: "Which best describes your political views?",
};

// Politics is the one category the founder flagged as needing real
// care, unprompted: "I'd be careful with this one because it can
// become polarizing. I think the goal is compatibility, not debate."
// Injected into the system prompt whenever politics is the active
// category (see /api/chat/message) — a standing instruction, not left
// to the model's own judgment about how to handle a sensitive topic.
export const CATEGORY_SENSITIVITY_NOTES: Partial<Record<Category, string>> = {
  politics: 'This can be a sensitive, polarizing topic. Make clear it\'s completely optional, and that the goal is understanding compatibility, not debating politics — respect "Prefer not to say" without any pushback or follow-up pressure.',
};

// The two-step questioning's second, open-ended question per category,
// with concrete example angles — per founder feedback, a vague "tell me
// more about X" leaves people not knowing what to say. Content is the
// founder's own, verbatim. Originally baseline-only (onboarding); the 6
// additional categories' entries were added in Phase 6 for ordinary
// post-baseline conversation to use the exact same pattern.
export const CATEGORY_OPEN_PROMPTS: Record<Category, { intro: string; topics: string[] }> = {
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
  communication_style: {
    intro: "How do you usually communicate in relationships?",
    topics: [
      "how they handle disagreements",
      "whether they like talking things through immediately or after some time",
      "whether they prefer frequent texting or quality conversations",
      "how they show affection",
      "what makes them feel heard and understood",
    ],
  },
  travel: {
    intro: "Tell me a little about how travel fits into your life.",
    topics: [
      "favorite countries or cities you've visited",
      "places you'd love to visit someday",
      "whether you prefer road trips or international travel",
      "luxury hotels, camping, cruises, or backpacking",
      "how often you like to travel",
      "whether you'd enjoy traveling often with a partner",
      "your favorite travel memory",
    ],
  },
  fitness: {
    intro: "Tell me about staying active.",
    topics: [
      "workouts or sports they enjoy",
      "hiking, walking, cycling, yoga, or the gym",
      "whether fitness is for health, appearance, competition, or stress relief",
      "healthy eating habits",
      "outdoor activities they enjoy",
      "fitness goals they're working toward",
      "whether they'd like a partner who shares those interests",
    ],
  },
  learning: {
    intro: "Tell me about the kinds of things you enjoy learning.",
    topics: [
      "books, podcasts, documentaries, or YouTube",
      "history, science, technology, psychology, finance, languages, or other interests",
      "learning for work versus learning for fun",
      "skills you've recently picked up",
      "something you're currently curious about",
      "whether you enjoy deep conversations or exploring new ideas",
    ],
  },
  money_management: {
    intro: "Tell me a little about how you think about money.",
    topics: [
      "saving versus spending",
      "budgeting",
      "investing",
      "financial goals",
      "paying off debt",
      "early retirement",
      "whether they prefer experiences or material things",
      "how they'd like to manage money with a future partner",
    ],
  },
  politics: {
    intro: "Only if you're comfortable sharing, tell me how politics fits into your life.",
    topics: [
      "whether political views are important in a relationship",
      "whether you enjoy discussing politics or prefer to avoid it",
      "issues or values that matter most to you",
      "whether you'd date someone with different political views",
      "whether politics is central to your identity or just one small part of your life",
    ],
  },
};
