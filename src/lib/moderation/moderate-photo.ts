export type ModerationResult = {
  decision: "approve" | "reject";
  reason: string | null;
};

// Low-frequency (once per uploaded photo), safety-critical call — same
// tier reasoning already used for Compatibility Reports/Profile Text
// (see generate-report.ts): quality matters more than per-token cost
// here, and Kimi K3 is already this app's established quality-
// sensitive tier. Verified live against OpenRouter's model catalog at
// implementation time (not assumed): kimi-k3 supports both image
// input and tool-calling.
const MODEL = "moonshotai/kimi-k3";
const MAX_TOKENS = 512;

const MODERATE_TOOL = {
  type: "function" as const,
  function: {
    name: "moderate_photo",
    description: "Decide whether an uploaded dating-profile photo may be shown publicly.",
    parameters: {
      type: "object",
      properties: {
        decision: { type: "string", enum: ["approve", "reject"] },
        reason: { type: "string", description: "Only when rejecting: a short, specific reason (e.g. 'contains nudity', 'no person visible', 'appears to be a screenshot of another app')." },
      },
      required: ["decision"],
    },
  },
};

const SYSTEM_PROMPT = `You moderate photos for a dating app profile. Approve photos that are appropriate to show publicly on a dating profile: real photos of a person, appropriately dressed, no graphic nudity or sexual content, no violence, no hate symbols, not an obvious screenshot/meme/ad/spam image. Reject anything that violates those rules. When uncertain but nothing clearly violates the rules, approve — this is a first-pass automated check, not a final human review. Call moderate_photo with your decision.`;

async function callModerate(imageUrl: string): Promise<ModerationResult | null> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Moderate this photo now." },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      tools: [MODERATE_TOOL],
      tool_choice: { type: "function", function: { name: "moderate_photo" } },
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return null;

  try {
    const args = JSON.parse(toolCall.function.arguments);
    if (args.decision !== "approve" && args.decision !== "reject") return null;
    return { decision: args.decision, reason: args.reason ?? null };
  } catch {
    return null;
  }
}

// Same "retry once, same model, before giving up" shape as this app's
// other structured-output calls. On total failure, the caller leaves
// moderation_status at its default 'pending' rather than faking a
// result — no fabricated approve/reject.
export async function moderatePhoto(imageUrl: string): Promise<ModerationResult | null> {
  let result = await callModerate(imageUrl);
  if (result === null) {
    result = await callModerate(imageUrl);
  }
  return result;
}
