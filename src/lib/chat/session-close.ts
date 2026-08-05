import { ALL_CATEGORIES, CATEGORY_LABELS, CATEGORY_DESCRIPTIONS, QUICK_FACT_OPTIONS, type Category } from "@/lib/categories";
import type { ExistingCategoryState } from "@/lib/profile/apply-update";

// Phase 6's batched, once-per-session extraction — deliberately a
// separate module from lib/onboarding/extract.ts rather than a shared
// one, even though the two share a lot of prompt reasoning. Real
// differences, not just surface ones: this covers all 12 categories
// (onboarding only ever targets the 6 baseline ones — additional
// categories have no other path to ever get filled in, since onboarding
// itself never asks about them), and this one call also returns the
// AI Memory narrative paragraph in the same response (technical-plan.md:
// "one additional call... returns... one narrative paragraph... plus a
// list of proposed category updates"), where onboarding fires the
// paragraph as a fully separate one-time call at baseline instead.
// Touching the already-verified onboarding extraction path to force a
// shared abstraction over these real differences seemed like a worse
// trade than a second, purpose-built module — see resolveCategoryUpdate
// in lib/profile/apply-update.ts for the piece that *is* genuinely
// identical and shared.

export type SessionCloseUpdate = {
  category: Category;
  short_summary: string;
  full_summary: string;
  confidence: "Low" | "Medium" | "High";
  quick_fact?: string;
  evidence: string;
};

export type SessionCloseResult = {
  summaryParagraph: string;
  updates: SessionCloseUpdate[];
  failed: boolean;
};

// Matches the CHAT_MODEL used everywhere else in this app's per-turn/
// extraction paths — see chat/route.ts's comment for the Intelligence
// Index / speed / price comparison behind this choice.
const PRIMARY_MODEL = "deepseek/deepseek-v4-flash";
const FALLBACK_MODEL = "openai/gpt-4o";

function categoryDescriptions(): string {
  return ALL_CATEGORIES.map((c) => {
    const qf = QUICK_FACT_OPTIONS[c];
    return `- ${c} (${CATEGORY_LABELS[c]}): ${CATEGORY_DESCRIPTIONS[c]}${qf ? ` Quick_fact options: ${qf.join(", ")}.` : ""}`;
  }).join("\n");
}

function buildMessages(
  sessionMessages: { role: string; content: string }[],
  currentCategories: Record<string, ExistingCategoryState>
) {
  const currentState = ALL_CATEGORIES.map((c) => {
    const existing = currentCategories[c];
    const level = existing?.confidence ?? existing?.pending_confidence;
    const text = existing?.full_summary || existing?.ai_summary;
    return `${c}: ${text ? `[current confidence: ${level ?? "Low"}] ${text}` : "(nothing yet)"}`;
  }).join("\n");

  const transcriptText = sessionMessages.map((m) => `${m.role === "user" ? "User" : "AI Matchmaker"}: ${m.content}`).join("\n");

  const systemPrompt = `You review one full conversation session between a dating app's AI Matchmaker and a user, after the session has ended, and produce two things at once: a memory-timeline paragraph, and any profile category updates the session's content actually supports.

Categories you may propose updates for:
${categoryDescriptions()}

Current understanding of each category, including its current confidence (merge with this, don't discard it — a proposed update replaces the whole category, not just adds to it):
${currentState}

Rules for category updates (same standard used during onboarding, applied here to the full set of 12 categories instead of just the baseline 6):
- Only propose an update for a category if the session genuinely added or changed signal about it — but a real, on-topic answer always counts as signal, even a hedged or conditional one. Don't force an update just to have something to say; most sessions touch a handful of categories at most, often none.
- Every field describes the user themselves — their own traits, beliefs, and circumstances — never a preference about what they want in a partner.
- confidence reflects how explicit and certain the statement was, not how many times it's been mentioned.
- Don't invent elaboration, reasoning, or specifics the user didn't actually give — this includes reusing your own question's wording as if the user had said it themselves.
- A category already at Medium or High confidence should almost never drop back down — but this is a floor on confidence, not a reason to skip updating the text. Only skip when the session truly adds nothing beyond what's already captured.
- short_summary and full_summary are written in the user's own first-person voice, as if they wrote it themselves — never "the user," "they," or the user's name.
- short_summary: 2-4 sentences, well-written prose, not a label. full_summary: longer, keeps specific details short_summary would trim for length.
- quick_fact: only for categories with quick_fact options listed above, only if clearly stated, and must be exactly one of the listed options verbatim.
- evidence: an exact substring quote from the user's own message that supports this update — not a paraphrase.
- If nothing in the session adds real signal for a category, don't include it. An empty updates array is a completely normal, correct result for an ordinary chat.

Rules for summary_paragraph (the AI Memory entry):
- One warm, specific paragraph (2-5 sentences) recapping what was learned or discussed this session, written to the user directly as "you" (e.g. "You mentioned..."), for them to read back later as a memory of this conversation.
- When combining facts from different parts of their life, never imply one caused or explains another just because they're adjacent in a sentence — keep the actual reason if given, or use a neutral transition instead of one implying causation.
- If the session was purely small talk, logistics, or otherwise produced nothing worth remembering about the user, leave summary_paragraph as an empty string — don't manufacture a paragraph out of nothing.

Call summarize_session with your result.`;

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Here is the full session transcript:\n\n${transcriptText}\n\nCall summarize_session now.` },
  ];
}

const SESSION_CLOSE_TOOL = {
  type: "function" as const,
  function: {
    name: "summarize_session",
    description: "Summarize a closed chat session into an AI Memory paragraph plus any supported category updates.",
    parameters: {
      type: "object",
      properties: {
        summary_paragraph: { type: "string" },
        updates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string", enum: [...ALL_CATEGORIES] },
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
      required: ["summary_paragraph", "updates"],
    },
  },
};

async function callSessionClose(
  model: string,
  messages: unknown[]
): Promise<{ summaryParagraph: string; updates: SessionCloseUpdate[] } | null> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      // Same missing-max_tokens fix as the plain chat completions in
      // this app — this call site's payload can legitimately be the
      // largest of any of them (summary_paragraph plus up to several
      // categories' worth of short_summary/full_summary/evidence in one
      // structured response), so the cap here is set higher accordingly.
      // A truncated tool call would fail JSON.parse and already gets
      // caught by the existing retry-then-fallback-model logic below,
      // but avoiding that failure mode in the first place is cheaper
      // than paying for a wasted retry.
      max_tokens: 4096,
      messages,
      tools: [SESSION_CLOSE_TOOL],
      tool_choice: { type: "function", function: { name: "summarize_session" } },
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return null;

  try {
    const args = JSON.parse(toolCall.function.arguments);
    if (!Array.isArray(args.updates)) return null;
    return { summaryParagraph: typeof args.summary_paragraph === "string" ? args.summary_paragraph : "", updates: args.updates };
  } catch {
    return null;
  }
}

// Same fabricated-evidence guard as onboarding's extraction (Mode 3 of
// technical-plan.md's four failure modes) — deterministic substring
// check, not a second AI call, discarding only the offending update.
function filterFabricatedEvidence(updates: SessionCloseUpdate[], sessionMessages: { role: string; content: string }[]): SessionCloseUpdate[] {
  const userText = sessionMessages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" \n ");
  return updates.filter((u) => userText.includes(u.evidence));
}

export async function summarizeSession(
  sessionMessages: { role: string; content: string }[],
  currentCategories: Record<string, ExistingCategoryState>
): Promise<SessionCloseResult> {
  const messages = buildMessages(sessionMessages, currentCategories);

  let result = await callSessionClose(PRIMARY_MODEL, messages);
  if (result === null) {
    // Retry once with a firmer instruction before falling back to a
    // different model — same ordering as onboarding's extraction.
    result = await callSessionClose(PRIMARY_MODEL, [
      ...messages,
      { role: "user", content: "You must call summarize_session — an empty updates array and empty summary_paragraph if nothing applies, but you must call it." },
    ]);
  }
  if (result === null) {
    result = await callSessionClose(FALLBACK_MODEL, messages);
  }
  if (result === null) {
    return { summaryParagraph: "", updates: [], failed: true };
  }

  return {
    summaryParagraph: result.summaryParagraph,
    updates: filterFabricatedEvidence(result.updates, sessionMessages),
    failed: false,
  };
}
