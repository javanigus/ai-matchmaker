// Phase 0 connectivity check only — confirms OPENROUTER_API_KEY actually
// round-trips to a real model. Not the real onboarding chat integration
// (see docs/PLAN.md Phase 2 for that); delete or repurpose once Phase 2
// has its own real endpoint.
export async function GET() {
  const raw = process.env.OPENROUTER_API_KEY ?? "";
  const debug = {
    length: raw.length,
    prefix: raw.slice(0, 10),
    suffix: raw.slice(-6),
    lastCharCode: raw.length ? raw.charCodeAt(raw.length - 1) : null,
    hasWhitespace: /\s/.test(raw),
  };

  const start = Date.now();

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "user", content: "Reply with exactly one word: pong" },
      ],
      max_tokens: 5,
    }),
  });

  const elapsedMs = Date.now() - start;

  if (!res.ok) {
    const errorBody = await res.text();
    return Response.json(
      { ok: false, status: res.status, error: errorBody, elapsedMs, debug },
      { status: 502 }
    );
  }

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content ?? null;

  return Response.json({
    ok: true,
    model: data.model,
    reply,
    elapsedMs,
  });
}
