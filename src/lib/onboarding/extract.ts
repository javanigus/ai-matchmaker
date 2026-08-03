import { BASELINE_CATEGORIES, CATEGORY_LABELS, QUICK_FACT_OPTIONS, type Category } from "@/lib/categories";

export type ProposedUpdate = {
  category: Category;
  short_summary: string;
  full_summary: string;
  confidence: "Low" | "Medium" | "High";
  quick_fact?: string;
  evidence: string;
};

const PRIMARY_MODEL = "openai/gpt-4o-mini";
const FALLBACK_MODEL = "openai/gpt-4o";

function categoryDescriptions(): string {
  return BASELINE_CATEGORIES.map((c) => {
    const qf = QUICK_FACT_OPTIONS[c];
    return `- ${c} (${CATEGORY_LABELS[c]})${qf ? ` — quick_fact options: ${qf.join(", ")}` : ""}`;
  }).join("\n");
}

// Matches profile_categories' actual column names (ai_summary is the
// approved text; caught a real bug where this was named short_summary
// here, which doesn't exist as a column — see chat route.ts history).
type CurrentCategoryState = {
  ai_summary: string | null;
  full_summary: string | null;
  confidence: string | null;
  pending_confidence: string | null;
};

function buildExtractionMessages(
  recentMessages: { role: string; content: string }[],
  currentCategories: Record<string, CurrentCategoryState>
) {
  const currentState = BASELINE_CATEGORIES.map((c) => {
    const existing = currentCategories[c];
    const level = existing?.confidence ?? existing?.pending_confidence;
    const text = existing?.full_summary || existing?.ai_summary;
    return `${c}: ${text ? `[current confidence: ${level ?? "Low"}] ${text}` : "(nothing yet)"}`;
  }).join("\n");

  const systemPrompt = `You extract structured signal from a dating app's onboarding conversation. Given the most recent exchange, decide whether the user provided genuine new signal about any of these categories:

${categoryDescriptions()}

Current understanding of each category, including its current confidence (merge with this, don't discard it — a proposed update replaces the whole category, not just adds to it):
${currentState}

Rules:
- Only propose an update for a category if this turn genuinely added or changed signal about it — but a real, on-topic answer always counts as signal, even a hedged or conditional one. "I'm open to having children, but it's not required, maybe 2 at most" is a real family answer (propose it, Low or Medium confidence, not High) — it is not nothing just because it's not a firm commitment. Only skip a category when the turn truly didn't touch it at all, not when it touched it but answered with uncertainty. Most turns touch zero or one category, occasionally two. Don't force an update just to have something to say.
- Every field describes the user themselves — their own traits, beliefs, and circumstances — never a preference about what they want in a partner. "Wants a partner who's Muslim" is not a religion_spirituality update about this user; it's a partner preference, which belongs to Dealbreakers, a separate feature this conversation doesn't touch. Likewise, "I want to meet someone kind, attractive, and educated" describes the person they're looking for, not this user's own lifestyle, career, or anything else about them — don't file adjectives describing a desired partner under whichever category they loosely sound like. If a turn only reveals a partner preference and nothing about the user's own standing on that category, that's not signal for this category — don't propose an update.
- confidence reflects how explicit and certain the statement was, not how many times it's been mentioned. "I definitely want kids" is High immediately. A vague aside is Low even if repeated.
- A category already at Medium or High confidence should almost never drop back down. If it already shows [current confidence: High] or [current confidence: Medium] above, only propose an update for it if this turn adds genuinely new detail worth folding in (keep the confidence the same or raise it) or the user actually contradicts/changes what's already known (then reflect the real change, confidence included). Don't re-derive a thinner, lower-confidence version of an already-solid category just because it came up again lightly — that's not new signal, so don't propose an update at all in that case.
- short_summary and full_summary are written in the user's own first-person voice, as if they wrote it themselves — never "the user," "they," or the user's name, and never a third-party case note. Start with "I" where it reads naturally ("I'm looking for something long-term, not casual." / "I don't have kids yet, but want them within a few years.").
- short_summary: 2-4 sentences, well-written prose, not a label.
- full_summary: longer, keeps specific details short_summary would trim for length.
- quick_fact: only include it for categories that have quick_fact options listed above, and only if clearly stated. It must be exactly one of that category's listed options, verbatim, and must not contradict short_summary/full_summary — if the two would disagree, that's a sign the statement wasn't actually clear enough to commit to a quick_fact yet, so leave it out.
- evidence: an exact substring quote from the user's own message that supports this update. Not a paraphrase — it must actually appear in what they said.
- If nothing in this turn adds real signal, return an empty updates array. Do not fabricate.`;

  return [
    { role: "system", content: systemPrompt },
    ...recentMessages.map((m) => ({ role: m.role, content: m.content })),
  ];
}

const EXTRACTION_TOOL = {
  type: "function" as const,
  function: {
    name: "propose_category_updates",
    description: "Propose updates to profile categories based on genuine new signal from the conversation.",
    parameters: {
      type: "object",
      properties: {
        updates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string", enum: [...BASELINE_CATEGORIES] },
              short_summary: { type: "string" },
              full_summary: { type: "string" },
              confidence: { type: "string", enum: ["Low", "Medium", "High"] },
              quick_fact: { type: "string" },
              evidence: { type: "string" },
            },
            required: ["category", "short_summary", "full_summary", "confidence", "evidence"],
          },
        },
      },
      required: ["updates"],
    },
  },
};

async function callExtraction(model: string, messages: unknown[]): Promise<ProposedUpdate[] | null> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: "function", function: { name: "propose_category_updates" } },
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return null;

  try {
    const args = JSON.parse(toolCall.function.arguments);
    if (!Array.isArray(args.updates)) return null;
    return args.updates as ProposedUpdate[];
  } catch {
    return null;
  }
}

// Modes 1-2 of the four failure modes from technical-plan.md: (1) schema-
// constrained output via tool_choice above prevents structurally invalid
// results outright — nothing to detect. (2) no tool call produced — retry
// once, then fall back to a stronger model. If both fail, return an empty
// array and let the caller log it; the conversation itself must never break.
export async function extractCategoryUpdates(
  recentMessages: { role: string; content: string }[],
  currentCategories: Record<string, CurrentCategoryState>
): Promise<{ updates: ProposedUpdate[]; usedFallback: boolean; failed: boolean }> {
  const messages = buildExtractionMessages(recentMessages, currentCategories);

  let updates = await callExtraction(PRIMARY_MODEL, messages);
  if (updates !== null) return { updates, usedFallback: false, failed: false };

  // Retry once with a firmer instruction before falling back to a
  // different model — matches technical-plan.md's ordering.
  updates = await callExtraction(PRIMARY_MODEL, [
    ...messages,
    { role: "user", content: "You must call propose_category_updates — an empty updates array if nothing applies, but you must call it." },
  ]);
  if (updates !== null) return { updates, usedFallback: false, failed: false };

  updates = await callExtraction(FALLBACK_MODEL, messages);
  if (updates !== null) return { updates, usedFallback: true, failed: false };

  return { updates: [], usedFallback: false, failed: true };
}

// Mode 3: fabricated evidence — deterministic substring check, not a
// second AI call. Discards only the one offending update, not the batch.
export function filterFabricatedEvidence(
  updates: ProposedUpdate[],
  recentMessages: { role: string; content: string }[]
): ProposedUpdate[] {
  const userText = recentMessages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" \n ");

  return updates.filter((u) => userText.includes(u.evidence));
}

// Mode 4 (semantically wrong but structurally fine) is deliberately not
// handled here — see technical-plan.md: the pending-update approval UI
// (Phase 3) is the correctness check, not a second AI-review call.
