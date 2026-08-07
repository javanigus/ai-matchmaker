import { ALL_CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/categories";

export type CompatibilityLevel = "High" | "Medium" | "Low" | "Unknown";

export type CompatibilityReportResult = {
  overallLevel: CompatibilityLevel;
  summaryText: string;
  categoryLevels: Partial<Record<Category, CompatibilityLevel>>;
};

type CategoryRow = { category: string; ai_summary: string | null; quick_fact: string | null };

// Low-frequency (once per pair, ever — cached after that), full-
// context, quality-sensitive call — same tier reasoning already used
// for the AI Memory paragraph and Profile Text bio (see chat/route.ts):
// Kimi K3 scores far higher on the Artificial Analysis Intelligence
// Index than a speed-optimized model, and call volume here is low
// enough that quality matters more than per-token cost.
const MODEL = "moonshotai/kimi-k3";
const MAX_TOKENS = 3072;

function formatCategories(rows: CategoryRow[]): string {
  return ALL_CATEGORIES.map((c) => {
    const row = rows.find((r) => r.category === c);
    if (!row?.ai_summary) return `${CATEGORY_LABELS[c]}: (nothing known yet)`;
    return `${CATEGORY_LABELS[c]}: ${row.ai_summary}${row.quick_fact ? ` (${row.quick_fact})` : ""}`;
  }).join("\n");
}

const REPORT_TOOL = {
  type: "function" as const,
  function: {
    name: "compatibility_report",
    description: "Report compatibility between two people based on what's known about each of them.",
    parameters: {
      type: "object",
      properties: {
        overall_level: { type: "string", enum: ["High", "Medium", "Low", "Unknown"] },
        summary_text: { type: "string" },
        category_levels: {
          type: "object",
          properties: Object.fromEntries(ALL_CATEGORIES.map((c) => [c, { type: "string", enum: ["High", "Medium", "Low", "Unknown"] }])),
          required: [...ALL_CATEGORIES],
        },
      },
      required: ["overall_level", "summary_text", "category_levels"],
    },
  },
};

async function callReport(viewerName: string, targetName: string, viewerCategories: string, targetCategories: string): Promise<CompatibilityReportResult | null> {
  const systemPrompt = `You write a Compatibility Report comparing two people for a dating app, reasoning over everything known about each of them, not just what either has made public.

${viewerName} (the person requesting this report):
${viewerCategories}

${targetName} (the other person):
${targetCategories}

Rules:
- overall_level and every category level must be one of exactly: High, Medium, Low, Unknown. Never a percentage or a number.
- High: strong alignment with no known major conflicts. Medium: good potential compatibility but with meaningful differences or uncertainties. Low: one or more significant conflicts that reduce long-term compatibility. Unknown: not enough information exists about one or both people on that category to make a reliable assessment — use this whenever either person's data for a category is "(nothing known yet)," never guess a level from nothing. Unknown is never a soft version of Medium.
- category_levels must include all 12 categories listed above, one level each.
- summary_text: 3-5 sentences, written directly to ${viewerName} as "you," explaining the overall_level in plain language — what aligns, what's genuinely different, and what's simply unknown so far. Reference ${targetName} by name. Never invent a detail that isn't in the category data above.
- Never use a percentage or numeric score anywhere in the summary.

Call compatibility_report with your result.`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: "Generate the compatibility report now." }],
      tools: [REPORT_TOOL],
      tool_choice: { type: "function", function: { name: "compatibility_report" } },
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return null;

  try {
    const args = JSON.parse(toolCall.function.arguments);
    if (!args.overall_level || !args.summary_text || !args.category_levels) return null;
    return {
      overallLevel: args.overall_level,
      summaryText: args.summary_text,
      categoryLevels: args.category_levels,
    };
  } catch {
    return null;
  }
}

// Same "retry once, same model, before giving up" shape as this app's
// other structured-output calls (technical-plan.md's failure modes) —
// no cross-model fallback here, since this call is already on the
// stronger/slower tier, not the fast per-turn one that has a cheap
// fallback readily available.
export async function generateCompatibilityReport(
  viewerName: string,
  targetName: string,
  viewerCategories: CategoryRow[],
  targetCategories: CategoryRow[]
): Promise<CompatibilityReportResult | null> {
  const viewerText = formatCategories(viewerCategories);
  const targetText = formatCategories(targetCategories);

  let result = await callReport(viewerName, targetName, viewerText, targetText);
  if (result === null) {
    result = await callReport(viewerName, targetName, viewerText, targetText);
  }
  return result;
}
