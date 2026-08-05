import { readFileSync } from "fs";
import path from "path";

// Real gap this replaces: the AI Matchmaker's tech-support answers used
// to come from an inline prompt string with no actual facts behind it —
// the model was answering purely from its own general reasoning about
// what a dating app "probably" does. Reading a real, maintained doc
// (docs/app-knowledge-base.md — plain markdown, editable the same way
// prd.md/vision.md already are) is both more reliable and easier for a
// non-engineer to keep current than a string baked into route.ts.
//
// Read once per server instance (module-level, not per-request) rather
// than on every message — this file only changes when a developer edits
// it and redeploys, never at runtime. Read via fs at the module's own
// directory rather than an import, since Next.js doesn't have a built-in
// "import raw markdown as a string" loader without extra config, and a
// plain fs.readFileSync with a statically-analyzable path is reliably
// picked up by Next's build-time file tracing for the deployed
// serverless function (verified after deploying — see PROGRESS.md).
let cached: string | null = null;

export function getAppKnowledgeBase(): string {
  if (cached !== null) return cached;
  const filePath = path.join(process.cwd(), "docs", "app-knowledge-base.md");
  cached = readFileSync(filePath, "utf-8");
  return cached;
}
